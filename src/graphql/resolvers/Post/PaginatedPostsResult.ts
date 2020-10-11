import { Field, ObjectType } from 'type-graphql';
import { Post } from '../../../models';

@ObjectType()
export class PaginatedPostsResult {
    @Field()
    total: number;

    @Field()
    pageSize: number;

    @Field(() => [Post])
    posts: Post[];
}
