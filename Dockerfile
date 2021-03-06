FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json ./
COPY yarn.lock ./

RUN yarn

# Bundle app source
COPY . .
COPY .env.production .env

RUN yarn build
# If you are building your code for production
# RUN npm ci --only=production



ENV NODE_ENV production

EXPOSE 8080
CMD [ "node", "dist/index.js" ]
USER node