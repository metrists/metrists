import { MESSAGES } from '../lib/ui';

export interface Exception {
  MESSAGE_TITLE?: keyof typeof MESSAGES;
}

export abstract class BaseException extends Error implements Exception {
  MESSAGE_TITLE: keyof typeof MESSAGES;
  private substitutions?: Record<string, string> = {};

  constructor(substitutions?: Record<string, string>) {
    super();
    if (substitutions) {
      this.substitutions = substitutions;
    }
  }

  getMessage() {
    let message = MESSAGES[this.MESSAGE_TITLE ?? 'DEFAULT'];
    const substitutions = this.getSubstitutions();

    Object.entries(substitutions).forEach(
      ([key, value]) => (message = message.replace(`[${key}]`, value)),
    );

    return message;
  }

  getSubstitutions() {
    return this.substitutions;
  }
}
