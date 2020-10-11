import 'reflect-metadata';
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

const main = async () => {
  // await sendEmail('bob@bob.com', 'hello there', 'hehey');
  // Mongoose Connection
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(
    `mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      useCreateIndex: true,
    }
  );
  console.log('Successfully connected to MongoDB Atlas!');
  //   PostModel.insertMany(mockData);

  // Express App
  const app = express();
  // Redis
  const RedisStore = connectRedis(session);
  const redis = new Redis();
  // Express Middleware
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax',
        secure: __prod__, // only secure on production
      },
      secret: 'hfghfhfghfgh',
      resave: false,
      saveUninitialized: false,
    })
  );

  // Apollo Server
  const apolloServer: ApolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, HelloResolver, UserResolver],
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
  app.listen(8080, () => console.log('Server is running on port 8080'));
};

main();
