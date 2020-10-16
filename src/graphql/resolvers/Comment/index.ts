import { DocumentType, mongoose } from '@typegoose/typegoose';
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import {
  Comment,
  CommentModel,
  PostModel,
  User,
  UserModel,
  VoteModel,
} from '../../../models';
import { Context } from '../../../types';
import { isAuth } from '../../../utils/isAuth';
import { CommentResponse, FieldError } from '../../types';

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
      creatorId: req.session.userId,
      postId,
    });

    await PostModel.findByIdAndUpdate(postId, {
      $push: { commentIds: comment.id },
    });

    return {
      comment,
    };
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
    const { userId } = req.session;

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
    const { userId } = req.session;
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
