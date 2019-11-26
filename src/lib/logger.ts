import winston from 'winston';
import Transport from 'winston-transport';

const test = process.env.NODE_ENV === 'test';

class StackTransport extends Transport {
  log(info: null | {error: {stack: Object}}, callback?: Function) {
    setImmediate(() => {
      if (info && info.error) {
        // eslint-disable-next-line
        console.error(info.error.stack);
      }
    });
    if (callback) {
      callback();
    }
  }
}

const alignedWithColorsAndTime = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const {
      timestamp, level, ...args
    } = info;

    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${Object.keys(args).length
      ? JSON.stringify(args, null, 2) : ''}`;
  }),
);

const transports = [
  new StackTransport({
    level: 'error',
    handleExceptions: true,
  }),
];

if (!test || process.env.LOGS) {
  transports.push(
    // @ts-ignore
    // TODO FIXME. The type of StackTransport.log doesn't match
    // the type of ConsoleTransportInstance.
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      format: alignedWithColorsAndTime,
    }),
  );
}

const Logger = winston.createLogger({
  format: winston.format.combine(
    winston.format(info => info)(),
    winston.format.json(),
  ),
  transports,
  exitOnError: false,
});

export default Logger;
