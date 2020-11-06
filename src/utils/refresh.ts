import { Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { User, UserModel } from '../models';
import {
  sendRefreshToken,
  createRefreshToken,
  createAccessToken,
} from './tokens';

export const refresh = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log(req.cookies);
  const token = req.cookies?.qid;
  if (!token) return res.send({ ok: false, accessToken: '' });

  let payload: any;
  try {
    payload = verify(token, `${process.env.JWT_REFRESH_TOKEN_SECRET}`);
  } catch (e) {
    return res.send({ ok: false, accessToken: '', ...e });
  }

  const user: User | null = await UserModel.findById(payload.userId);
  if (!user) return res.send({ ok: false, accessToken: '' });

  if (user.tokenVersion !== payload.tokenVersion)
    return res.send({ ok: false, accessToken: '' });

  sendRefreshToken(res, createRefreshToken(user)); // send new refresh token as cookie
  return res.send({ ok: true, accessToken: createAccessToken(user) });
};
