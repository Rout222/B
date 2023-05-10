FROM node:14

RUN npm update
RUN apt update

COPY . /blaze
WORKDIR /blaze

RUN yarn install
RUN yarn build

CMD ["node", "-r", "./build/websocket.js", "--unhandled-rejections=strict", "build/index.js"]