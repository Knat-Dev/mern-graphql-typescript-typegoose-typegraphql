import 'reflect-metadata';
import 'dotenv-safe/config';
import mongoose from 'mongoose';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { PostResolver, HelloResolver, UserResolver } from './graphql';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { COOKIE_NAME, __prod__ } from './constants';
import cors from 'cors';
import { sendEmail } from './utils/sendEmail';
import { PostModel } from './models';
import mockData from './utils/mockData';
import { createUserLoader } from './utils/createUserLoader';
import { createVoteStatusLoader } from './utils/createVoteStatusLoader';
import { CommentResolver } from './graphql/resolvers/Comment';
import cookieParser from 'cookie-parser';
import { refresh } from './utils/refresh';

const main = async () => {
  // await sendEmail('bob@bob.com', 'hello there', 'hehey');
  // Mongoose Connection
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log('Successfully connected to MongoDB Atlas!');
  // PostModel.insertMany(mockData);

  // Express App
  const app = express();
  // Redis
  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);
  // Express Middleware
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  // app.use(
  //   session({
  //     name: COOKIE_NAME,
  //     store: new RedisStore({
  //       client: redis,
  //       disableTouch: true,
  //     }),
  //     cookie: {
  //       maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       secure: __prod__, // only secure on production,
  //       domain: __prod__ ? '.knat.dev' : 'localhost',
  //     },
  //     secret: process.env.SESSION_SECRET,
  //     resave: false,
  //     saveUninitialized: false,
  //   })
  // );

  app.post('/refresh', refresh);

  // Apollo Server
  const apolloServer: ApolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, HelloResolver, UserResolver, CommentResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      voteLoader: createVoteStatusLoader(),
    }),
  });
  // Apollo middleware
  apolloServer.applyMiddleware({
    app,
    path: '/api',
    cors: false,
  });
  // Express Middleware

  // Express Server Listen
  app.listen(process.env.PORT, () =>
    console.log(`Server is running on port ${process.env.PORT}`)
  );
};

main();
