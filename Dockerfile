FROM dydxprotocol/node:10.16.3-alpine

RUN adduser -S dydx
RUN mkdir -p /home/dydx/app
RUN chown dydx -R /home/dydx/app
USER dydx

WORKDIR /home/dydx/app

COPY ./.env* ./
COPY ./package.json ./package-lock.json ./
RUN npm ci --loglevel warn

COPY ./src ./src
RUN npm run build

CMD ["npm", "start"]
