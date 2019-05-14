FROM dydxprotocol/node:8.12-alpine-v1

RUN pip install --upgrade pip awscli

RUN adduser -S dydx
RUN mkdir -p /home/dydx/app
RUN chown dydx -R /home/dydx/app
USER dydx

WORKDIR /home/dydx/app

COPY ./package.json ./package-lock.json ./
RUN npm ci --loglevel warn --production

COPY ./.env* ./
COPY ./build ./build

CMD ["npm", "start"]
