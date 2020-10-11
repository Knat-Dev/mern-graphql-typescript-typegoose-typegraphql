import { Field, InputType } from 'type-graphql';

@InputType()
export class PaginationInput {
    @Field()
    limit: number;

    @Field({ nullable: true })
    cursor?: number;
}
