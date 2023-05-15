FROM node:17

COPY . /blaze
WORKDIR /blaze

RUN npm update
RUN apt update
RUN npm install
RUN npm install -g ts-node

CMD ["npm", "run", "example"]