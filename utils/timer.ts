import moment, { Moment } from 'moment';
import winston from 'winston';

import logger from './logger';

export class Timer {
  now: Moment;
  label: string;
  startMessage: string;
  endMessage: string;

  constructor(
    logger: winston.Logger,
    label: string,
    startMessage: string,
    endMessage: string
  ) {
    this.now = moment();
    this.label = label;
    this.startMessage = startMessage;
    this.endMessage = endMessage;

    logger.info({
      label,
      message: `\n\n${this.startMessage}...`,
    });
  }

  stop(): Timer {
    logger.info({
      label: this.label,
      message: `${this.endMessage} in ${moment().diff(this.now, 'ms')}ms`,
    });
    return this;
  }
}
