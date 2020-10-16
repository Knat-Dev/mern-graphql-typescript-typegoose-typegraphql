import { DocumentType } from '@typegoose/typegoose';
import {
  Arg,
  Ctx,
  FieldResolver,
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
}
