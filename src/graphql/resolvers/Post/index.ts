import { DocumentType } from '@typegoose/typegoose';
import { MongooseFilterQuery } from 'mongoose';
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Int,
  Mutation,
  NextFn,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { Post, PostModel, User, UserModel } from '../../../models';
import { Context } from '../../../types';
import { isAuth } from '../../../utils/isAuth';
import { PaginatedPostsResult } from './PaginatedPostsResult';
import { PaginationInput } from './PaginationInput';
import { PostInput } from './PostInput';
import mongoose from 'mongoose';
import { VoteModel } from '../../../models/Vote';

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver((of) => Post)
export class PostResolver {
  @Query(() => PaginatedPosts)
  async posts(@Arg('input') input: PaginationInput): Promise<PaginatedPosts> {
    const { cursor, limit } = input;
    let realLimit = Math.min(50, limit);
    realLimit = Math.max(1, realLimit);
    realLimit++;
    const query: MongooseFilterQuery<Pick<
      DocumentType<Post>,
      'updatedAt'
    >> = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .limit(realLimit);

    const count = posts.length;

    return {
      posts: posts.splice(0, realLimit - 1),
      hasMore: count === realLimit,
    };
  }

  @FieldResolver(() => Number, { nullable: true })
  async voteStatus(
    @Root() root: DocumentType<Post>,
    @Ctx() { req, voteLoader }: Context
  ): Promise<Number | null> {
    const { userId } = req.session;

    try {
      const vote = await voteLoader.load({ postId: root.id, userId });
      // const vote = await VoteModel.findOne({ postId: root.id, userId });
      return vote?.value as number | null;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  @FieldResolver(() => String)
  textSnippet(@Root() root: DocumentType<Post>) {
    return root.text.slice(0, 50);
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg('id') id: string): Promise<DocumentType<Post> | null> {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new Error("Id doesn't match any post document");
    console.log('fetching post page');

    return await PostModel.findById(id);
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: Context
  ): Promise<DocumentType<Post>> {
    const { text, title } = input;

    const post = await PostModel.create({
      title,
      text,
      creatorId: req.session.userId,
    });
    await UserModel.findByIdAndUpdate(req.session.userId, {
      $push: { posts: post.id },
    });
    return post;
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg('id') id: string,
    @Arg('title') title: string,
    @Arg('text') text: string,
    @Ctx() { req }: Context
  ): Promise<DocumentType<Post>> {
    const updated = await PostModel.findOneAndUpdate(
      { _id: id, creatorId: req.session.userId },
      {
        $set: { title, text },
      },
      { new: true }
    );

    if (!updated)
      throw new Error("Post could not be found or you don't own this post! ");

    return updated;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id') id: string,
    @Ctx() { req }: Context
  ): Promise<boolean> {
    const post = await PostModel.findById(id);
    if (!post) return false;

    if (post.creatorId !== req.session.userId)
      throw new Error('not authorized');
    //delete votes
    await VoteModel.deleteMany({ postId: id });

    //delete post
    const deleted = await PostModel.findOneAndDelete({
      _id: id,
      creatorId: req.session.userId,
    });

    if (!deleted) return false;

    return true;
  }

  @FieldResolver()
  async creator(
    @Root() post: DocumentType<Post>,
    @Ctx() { userLoader }: Context
  ): Promise<DocumentType<User> | null> {
    try {
      return await userLoader.load(post.creatorId);
    } catch (e) {
      console.log(e);
      return null;
    }
    // const creator = await UserModel.findById(post.creatorId);
    // return creator;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId') postId: string,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: Context
  ): Promise<boolean> {
    const { userId } = req.session;
    const session = await mongoose.startSession();
    session.startTransaction();
    const isUpvote = value !== -1;
    const realValue = isUpvote ? 1 : -1;

    try {
      //   if (!post) {
      //     await session.abortTransaction();
      //     return false;
      //   }

      const query = { postId, userId };
      const vote = await VoteModel.findOne(query);

      // user already voted for this post
      if (vote && vote.value !== realValue) {
        await VoteModel.findByIdAndUpdate(vote.id, {
          value: realValue,
        }).session(session);
        await PostModel.findByIdAndUpdate(postId, {
          $inc: { points: realValue * 2 },
        }).session(session);
      } else if (!vote) {
        await VoteModel.create(
          [
            {
              postId,
              userId,
              value: realValue,
            },
          ],
          { session }
        );
        await PostModel.findOneAndUpdate(
          { _id: postId },
          { $inc: { points: realValue } }
        ).session(session);
      } else {
        await session.abortTransaction();
        return false;
      }

      await session.commitTransaction();
      return true;
    } catch (e) {
      console.log(e);
      if (session.inTransaction()) await session.abortTransaction();
      return false;
    }
  }
}
