import {
  getModelForClass,
  modelOptions,
  Ref,
  Severity,
} from '@typegoose/typegoose';
import { prop } from '@typegoose/typegoose/lib/prop';
import { Field, Float, ID, Int, ObjectType } from 'type-graphql';
import { Post } from '../Post';
import { User } from '../User';

@ObjectType()
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Comment {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  createdAt?: Date;

  @Field(() => Float)
  @prop({})
  updatedAt?: Date;

  @Field(() => String)
  @prop({ type: String })
  public text!: string;

  @Field(() => User)
  creator?: User;

  @prop()
  creatorId: string;

  @Field(() => Post)
  post?: Post;

  @prop()
  postId: string;
}

export const CommentModel = getModelForClass(Comment, {
  schemaOptions: { timestamps: true },
});
