import { Request } from 'express';
import { MiddlewareFn, NextFn } from 'type-graphql';
import { Context } from '../types';
import { authVerification } from './authVerification';

export const isAuth: MiddlewareFn<Context> = (
  { context: { req } },
  next: NextFn
) => {
  const userId = authVerification(req);
  console.log('isAuth: ', userId);
  if (!userId) throw new Error('Not Authenticated');

  return next();
};
