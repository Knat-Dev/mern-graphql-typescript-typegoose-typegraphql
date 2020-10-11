import { DocumentType } from '@typegoose/typegoose';
import DataLoader from 'dataloader';
import { User, UserModel } from '../models';

export const createUserLoader = () =>
  new DataLoader<string, DocumentType<User>>(async (userIds) => {
    const users = await UserModel.find({ _id: { $in: userIds as string[] } });
    const userIdToUser: Record<string, DocumentType<User>> = {};
    users.forEach((user) => {
      userIdToUser[user.id] = user;
    });
    return userIds.map((id) => userIdToUser[id]);
  });
