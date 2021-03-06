import { InputType, Field, ObjectType } from 'type-graphql';
import { Comment, Post, User } from '../models';

@InputType()
export class LoginInput {
  @Field()
  usernameOrEmail: string;
  @Field()
  password: string;
}

@InputType()
export class RegisterInput {
  @Field()
  username: string;
  @Field()
  password: string;
  @Field()
  email: string;
}

@ObjectType()
export class UserResponse {
  @Field(() => String, { nullable: true })
  accessToken: string;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  token: string;

  @Field()
  newPassword: string;
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class PaginatedComments {
  @Field(() => [Comment])
  comments: Comment[];

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class PostResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Post, { nullable: true })
  post?: Post;
}

@ObjectType()
export class CommentResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Comment, { nullable: true })
  comment?: Comment;
}
