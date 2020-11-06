import { DocumentType, mongoose } from '@typegoose/typegoose';
import { MongooseFilterQuery } from 'mongoose';
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import {
  Comment,
  CommentModel,
  Post,
  PostModel,
  User,
  UserModel,
  VoteModel,
} from '../../../models';
import { Context } from '../../../types';
import { authVerification } from '../../../utils/authVerification';
import { isAuth } from '../../../utils/isAuth';
import { CommentResponse, FieldError, PaginatedComments } from '../../types';
import { PaginationInput } from '../Post/PaginationInput';

@Resolver((of) => Comment)
export class CommentResolver {
  @Mutation(() => CommentResponse)
  @UseMiddleware(isAuth)
  async createComment(
    @Arg('text') text: string,
    @Arg('postId') postId: string,
    @Ctx() { req }: Context
  ): Promise<CommentResponse> {
    const errors: FieldError[] = [];

    const userId = authVerification(req);
    if (!userId)
      errors.push({
        field: 'auth',
        message: 'Must be signed in!',
      });

    if (text.length < 2)
      errors.push({
        field: 'text',
        message: 'Comment length must be greater than 2',
      });

    // check that post exists
    const post = await PostModel.findById(postId);
    if (!post)
      errors.push({
        field: 'postId',
        message:
          'The postId given could not be matched to any post in the database.',
      });

    if (errors.length > 0 || !post) return { errors };

    const comment = await CommentModel.create({
      text,
      creatorId: userId!,
      postId,
    });

    await PostModel.findByIdAndUpdate(postId, {
      $push: { commentIds: comment.id },
    });

    return {
      comment,
    };
  }

  @Query(() => PaginatedComments)
  async comments(
    @Arg('postId') postId: string,
    @Arg('input') input: PaginationInput
  ): Promise<PaginatedComments> {
    const { limit, cursor } = input;
    let realLimit = Math.min(50, limit);
    realLimit = Math.max(1, realLimit);
    realLimit++;
    const query: MongooseFilterQuery<Pick<
      DocumentType<Comment>,
      'createdAt'
    >> = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    const comments = await CommentModel.find({ postId, ...query })
      .sort({ createdAt: -1 })
      .limit(realLimit);

    const count = comments.length;

    return {
      comments: comments.splice(0, realLimit - 1),
      hasMore: count === realLimit,
    };

    //////
  }

  @FieldResolver()
  async creator(@Root() comment: DocumentType<Comment>): Promise<User> {
    const creator = await UserModel.findById(comment.creatorId);
    if (!creator) throw new Error('Creator of comment could not be found');

    return creator;
  }

  @FieldResolver(() => Number, { nullable: true })
  async voteStatus(
    @Root() root: DocumentType<Comment>,
    @Ctx() { req, voteLoader }: Context
  ): Promise<Number | null> {
    const userId = authVerification(req);
    if (!userId) return null;

    try {
      // const vote = await voteLoader.load({ postId: root.id, userId });
      const vote = await VoteModel.findOne({ commentId: root.id, userId });
      return vote?.value as number | null;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async voteComment(
    @Arg('commentId') commentId: string,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: Context
  ): Promise<boolean> {
    const userId = authVerification(req);
    if (!userId) return false;
    const session = await mongoose.startSession();
    session.startTransaction();
    const isUpvote = value !== -1;
    const realValue = isUpvote ? 1 : -1;

    try {
      const query = { commentId, userId };
      const vote = await VoteModel.findOne(query);

      // user already voted for this post
      if (vote && vote.value !== realValue) {
        await VoteModel.findByIdAndUpdate(vote.id, {
          value: realValue,
        }).session(session);
        await CommentModel.findByIdAndUpdate(commentId, {
          $inc: { points: realValue * 2 },
        }).session(session);
      } else if (!vote) {
        await VoteModel.create(
          [
            {
              commentId,
              userId,
              value: realValue,
            },
          ],
          { session }
        );
        await CommentModel.findByIdAndUpdate(commentId, {
          $inc: { points: realValue },
        }).session(session);
        await CommentModel.findOneAndUpdate(
          { commentId },
          { $inc: { points: realValue } }
        );
      } else {
        await session.abortTransaction();
        session.endSession();
        return false;
      }

      await session.commitTransaction();
      session.endSession();
      return true;
    } catch (e) {
      console.log(e);
      session.endSession();
      if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      return false;
    }
  }
}
