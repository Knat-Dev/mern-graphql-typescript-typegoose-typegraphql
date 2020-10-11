import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { createUserLoader } from './utils/createUserLoader';
import { createVoteStatusLoader } from './utils/createVoteStatusLoader';

export type Context = {
  req: Request & { session: Express.Session & { userId: string } };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  voteLoader: ReturnType<typeof createVoteStatusLoader>;
};
