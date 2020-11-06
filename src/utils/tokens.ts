import { Response } from 'express';
import { sign } from 'jsonwebtoken';
import { __prod__ } from '../constants';
import { User } from '../models';

export const createAccessToken = (user: User): string => {
  return sign({ userId: user.id }, `${process.env.JWT_ACCESS_TOKEN_SECRET}`, {
    expiresIn: '15m',
  });
};

export const createRefreshToken = (user: User): string => {
  const token = sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    `${process.env.JWT_REFRESH_TOKEN_SECRET}`,
    {
      expiresIn: '7d',
    }
  );
  return token;
};

export const sendRefreshToken = (res: Response, token: string): void => {
  console.log('sending refresh token: ', token);
  res.cookie('qid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: __prod__, // only secure on production,
    domain: __prod__ ? '.knat.dev' : 'localhost',
  });
};
