import { DocumentType, mongoose, post } from '@typegoose/typegoose';
import DataLoader from 'dataloader';
import { User, UserModel } from '../models';
import { Vote, VoteModel } from '../models/Vote';

export const createVoteStatusLoader = () =>
  new DataLoader<{ postId: string; userId: string }, DocumentType<Vote>>(
    async (keys) => {
      const votes: (DocumentType<Vote> | null)[] = [];

      await Promise.all(
        keys.map(async (key) => {
          const vote = await VoteModel.findOne({
            postId: key.postId,
            userId: key.userId,
          });
          votes.push(vote);
        })
      );

      const voteIdsToVotes: Record<string, DocumentType<Vote>> = {};

      votes.forEach((vote) => {
        if (vote) voteIdsToVotes[`${vote.postId}|${vote.userId}`] = vote;
      });

      return keys.map((key) => voteIdsToVotes[`${key.postId}|${key.userId}`]);
    }
  );
