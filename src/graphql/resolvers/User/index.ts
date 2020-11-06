import { DocumentType } from '@typegoose/typegoose';
import {
  Arg,
  Args,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Post, PostModel, User, UserModel } from '../../../models';
import { verify as verifyJwt } from 'jsonwebtoken';
import { hash, verify } from 'argon2';
import { Context } from '../../../types';
import { Response } from 'express';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../../../constants';
import { sendEmail } from '../../../utils/sendEmail';
import crypto from 'crypto';
import { generateResetPasswordToken } from '../../../utils/generateResetPasswordToken';
import {
  UserResponse,
  RegisterInput,
  FieldError,
  LoginInput,
  ChangePasswordInput,
} from '../../types';
import {
  createAccessToken,
  createRefreshToken,
  sendRefreshToken,
} from '../../../utils/tokens';
import { authVerification } from '../../../utils/authVerification';

@Resolver(User)
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg('input') input: RegisterInput,
    @Ctx() { req, res }: Context
  ): Promise<UserResponse> {
    const { username, password, email } = input;
    const errors: FieldError[] = [];
    const userId = authVerification(req);
    if (!userId) errors.push({ field: 'auth', message: 'Must be signed in!' });

    // Field validations go here
    if (username.length < 2) {
      errors.push({
        field: 'username',
        message: 'Username length must be greater than or equal to 2',
      });
    } else if (username.includes('@')) {
      errors.push({
        field: 'username',
        message: "Username can not include '@' sign",
      });
    }
    if (email.length < 6) {
      errors.push({
        field: 'email',
        message: 'Email length must be greater than or equal to 6',
      });
    } else if (!email.includes('@')) {
      errors.push({
        field: 'email',
        message: "Email must include '@' sign",
      });
    }
    if (password.length < 6) {
      errors.push({
        field: 'password',
        message: 'Password length must be greater than or equal to 6',
      });
    }

    if (errors.length > 0)
      return {
        accessToken: '',
        errors,
      };

    // fields valid
    let user;

    try {
      user = await UserModel.create({
        username: input.username,
        password: await hash(input.password),
        email: input.email,
      });

      sendRefreshToken(res, createRefreshToken(user));
      return { user, accessToken: createAccessToken(user) };
    } catch (e) {
      console.log(e);
      if (e.code === 11000)
        if (e.keyValue['username'])
          return {
            accessToken: '',
            errors: [
              {
                field: 'username',
                message: 'This username is already taken by another user',
              },
            ],
          };
        else
          return {
            accessToken: '',
            errors: [
              {
                field: 'email',
                message: 'This email address is already taken by another user',
              },
            ],
          };
      return {
        errors,
        accessToken: '',
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('input') input: LoginInput,
    @Ctx() { req, res }: Context
  ): Promise<UserResponse> {
    const { usernameOrEmail, password } = input;
    // Field validations go here
    const errors: FieldError[] = [];
    if (usernameOrEmail.length < 2) {
      errors.push({
        field: 'usernameOrEmail',
        message: 'Username or Email length must be greater than or equal to 2',
      });
    }
    if (password.length < 6) {
      errors.push({
        field: 'password',
        message: 'Password length must be greater than or equal to 6',
      });
    }

    if (errors.length > 0)
      return {
        accessToken: '',
        errors,
      };

    // if fields are valid, check if there exists a user with the same username as in the input
    const user = await UserModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      if (!usernameOrEmail.includes('@'))
        return {
          accessToken: '',
          errors: [
            {
              field: 'usernameOrEmail',
              message: 'Username does not exist',
            },
          ],
        };
      else
        return {
          accessToken: '',
          errors: [
            {
              field: 'usernameOrEmail',
              message: 'Email does not exist',
            },
          ],
        };
    }

    const valid = await verify(user.password, input.password);

    if (!valid)
      return {
        accessToken: '',
        errors: [
          {
            field: 'password',
            message: 'Incorrect password, please try again',
          },
        ],
      };

    sendRefreshToken(res, createRefreshToken(user));

    return {
      accessToken: createAccessToken(user),
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res: response }: Context): boolean {
    response.clearCookie(COOKIE_NAME);
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: Context): Promise<DocumentType<User> | null> {
    const userId = authVerification(req);

    if (!userId) return null;

    const user = await UserModel.findById(userId);

    return user;
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Ctx() { redis }: Context,
    @Arg('email') email: string
  ): Promise<boolean> {
    const user = await UserModel.findOne({ email });

    if (!user) return true;

    const resetPasswordToken = generateResetPasswordToken();

    const updatedUser = await UserModel.findByIdAndUpdate(
      user.id,
      {
        $set: { resetPasswordToken },
      },
      { new: true }
    );

    if (updatedUser?.resetPasswordToken !== resetPasswordToken)
      throw new Error('could not update user for reset password');

    const html = `<a href="http://localhost:3000/change-password/${resetPasswordToken}">reset password</a>`;
    sendEmail(email, html, 'Change Password');

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('input') input: ChangePasswordInput,
    @Ctx() { redis, req, res }: Context
  ): Promise<UserResponse> {
    const { newPassword, token } = input;
    if (newPassword.length < 6)
      return {
        accessToken: '',
        errors: [
          {
            field: 'newPassword',
            message: 'Password must be greater than or equal to 6 characters',
          },
        ],
      };

    const userId = (await UserModel.findOne({ resetPasswordToken: token }))?.id;

    if (!userId)
      return {
        accessToken: '',
        errors: [{ field: 'token', message: 'Token invalid' }],
      };

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: { password: await hash(newPassword) },
      },
      { new: true }
    );

    if (!user)
      return {
        accessToken: '',
        errors: [{ field: 'token', message: 'Token Expired' }],
      };

    sendRefreshToken(res, createRefreshToken(user));
    return { user, accessToken: createAccessToken(user) };
  }

  @FieldResolver()
  async posts(
    @Root() user: DocumentType<User>
  ): Promise<DocumentType<Post>[] | null> {
    return await PostModel.find({ creatorId: user.id });
  }

  @FieldResolver({ nullable: true })
  async email(
    @Root() user: DocumentType<User>,
    @Ctx() { req }: Context
  ): Promise<string | null> {
    const userId = authVerification(req);
    if (!userId) return null;

    if (userId === user.id) return user.email;
    return null;
  }
}
