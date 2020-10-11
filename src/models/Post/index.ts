import {
  getModelForClass,
  modelOptions,
  Ref,
  Severity,
} from '@typegoose/typegoose';
import { prop } from '@typegoose/typegoose/lib/prop';
import { Field, Float, ID, Int, ObjectType } from 'type-graphql';
import { User } from '../User';

@ObjectType()
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Post {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  createdAt?: Date;

  @Field(() => Float)
  @prop({})
  updatedAt?: Date;

  @Field(() => String)
  @prop({ type: String })
  public title!: string;

  @Field(() => String)
  @prop({ type: String })
  public text!: string;

  @Field(() => Number)
  @prop({ type: Number, default: 0 })
  public points?: number;

  @Field(() => Int, { nullable: true })
  voteStatus?: number | null;

  @Field(() => User)
  creator?: User;

  @prop()
  creatorId: string;
}
export const PostModel = getModelForClass(Post, {
  schemaOptions: { timestamps: true },
});
