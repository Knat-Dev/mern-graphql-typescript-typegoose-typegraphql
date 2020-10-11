import {
    getModelForClass,
    modelOptions,
    Ref,
    Severity,
} from '@typegoose/typegoose';
import { prop } from '@typegoose/typegoose/lib/prop';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { Post } from '../Post';
import { User } from '../User';

@ObjectType()
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Vote {
    @Field(() => ID)
    id: string;

    @Field(() => User)
    user?: User;

    @prop()
    userId: string;

    @Field(() => Post)
    post?: Post;

    @prop()
    postId: string;

    @Field(() => Number)
    @prop()
    value!: number;
}
export const VoteModel = getModelForClass(Vote, {});
