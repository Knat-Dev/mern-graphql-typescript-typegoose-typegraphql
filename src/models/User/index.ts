import { getModelForClass, prop, Ref } from '@typegoose/typegoose';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { Post } from '../Post';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  @prop({ unique: true })
  username!: string;

  @Field({ nullable: true })
  @prop({ unique: true })
  email!: string;

  @prop()
  password!: string;

  @Field(() => Float)
  @prop()
  createdAt?: Date;

  @Field(() => [Post])
  @prop({ default: [] })
  posts?: Ref<Post>[];

  @Field(() => Float)
  @prop()
  updatedAt?: Date;

  @Field(() => String, { nullable: true })
  @prop({ default: null })
  public resetPasswordToken?: string;

  @Field()
  @prop({ default: 0 })
  public tokenVersion?: number;
}

export const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
});
