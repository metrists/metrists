import * as chalk from 'chalk';
export type LogTypes = 'info' | 'warn' | 'error' | 'verbose' | 'noob';

export abstract class Logger {
  abstract info(...message: string[]): void;
  abstract warn(...message: string[]): void;
  abstract error(...message: string[]): void;
  abstract verbose(...message: string[]): void;
  abstract noob(...message: string[]): void;
  abstract log(types: LogTypes[], ...message: string[]): void;
}

const logTypeToLogColour = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  verbose: chalk.gray,
  noob: chalk.green,
  default: chalk.white,
};

export class ConsoleLogger extends Logger {
  protected readonly allowedTypes: LogTypes[];
  constructor(allowedTypes?: LogTypes[]) {
    super();
    if (allowedTypes) {
      this.allowedTypes = allowedTypes;
    } else {
      this.allowedTypes = ['info', 'error', 'warn'];
    }
  }

  info(...messages: string[]) {
    this._log('info', ...messages);
  }
  warn(...messages: string[]) {
    this._log('warn', ...messages);
  }
  error(...messages: string[]) {
    this._log('error', ...messages);
  }
  verbose(...messages: string[]) {
    this._log('verbose', ...messages);
  }
  noob(...messages: string[]) {
    this._log('noob', ...messages);
  }
  log(types: LogTypes[], ...messages: string[]) {
    if (!types.some((type) => this.allowedTypes.includes(type))) {
      return;
    }
    if (messages?.length > 1) {
      console.log(
        ...messages.map((message) => logTypeToLogColour.default(message)),
      );
    } else {
      console.log(logTypeToLogColour.default(messages));
    }
  }
  protected _log(type: LogTypes, ...messages: string[]) {
    if (!this.allowedTypes.includes(type)) {
      return;
    }
    if (messages?.length > 1) {
      console.log(
        ...messages.map((message) => logTypeToLogColour[type](message)),
      );
    } else {
      console.log(logTypeToLogColour[type](messages[0]));
    }
  }
}
