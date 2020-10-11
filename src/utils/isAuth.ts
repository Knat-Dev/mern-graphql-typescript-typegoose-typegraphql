import { Request } from 'express';
import { MiddlewareFn, NextFn } from 'type-graphql';
import { Context } from '../types';

export const isAuth: MiddlewareFn<Context> = ({ context }, next: NextFn) => {
  const { userId } = context.req.session;
  if (!userId) throw new Error('Not Authenticated');

  return next();
};
