FROM dydxprotocol/node:8.12-alpine-v1

RUN adduser -S dydx
RUN mkdir -p /home/dydx/app
RUN chown dydx -R /home/dydx/app
USER dydx

WORKDIR /home/dydx/app

COPY ./.babelrc* ./
COPY ./.env* ./
COPY ./package.json ./package-lock.json ./
RUN npm ci --loglevel warn

COPY ./src ./src
RUN npm run build

CMD ["npm", "start"]
