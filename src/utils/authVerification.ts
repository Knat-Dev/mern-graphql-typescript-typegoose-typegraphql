import { Request } from 'express';
import { verify } from 'jsonwebtoken';

export const authVerification = (req: Request): string | null => {
  const authorization = req.headers['authorization'];
  if (!authorization) return null;
  const token = authorization.split(' ')[1];
  console.log('access token requesting: ', token);

  let payload: any;
  try {
    payload = verify(token, `${process.env.JWT_ACCESS_TOKEN_SECRET}`);
    return (payload as { userId: string }).userId;
  } catch (e) {
    console.log('error');
    console.error(e.message);
    return null;
  }
};
