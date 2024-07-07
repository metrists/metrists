import * as chalk from 'chalk';
import { ERROR_PREFIX } from '../lib/ui';
import { AbstractCommand } from './abstract.command';
import { WatchCommand } from './watch.command';
import { InitCommand } from './init.command';
import { PublishCommand } from './publish.command';
import type { Command } from 'commander';

export class CommandLoader {
  public static load(program: Command): void {
    program.showSuggestionAfterError()
    this.loadCommandAndAction(new WatchCommand(), program);
    this.loadCommandAndAction(new InitCommand(), program);
    this.loadCommandAndAction(new PublishCommand(), program);
    this.handleInvalidCommand(program);
  }

  private static handleInvalidCommand(program: Command) {
    program.on('command:*', () => {
      console.error(
        `\n${ERROR_PREFIX} Invalid command: ${chalk.red('%s')}`,
        program.args.join(' '),
      );
      console.log(
        `See ${chalk.red('--help')} for a list of available commands.\n`,
      );
      process.exit(1);
    });
  }

  protected static loadCommandAndAction(
    command: AbstractCommand,
    program: Command,
  ) {
    const commanderCommand = command.load(program);
    commanderCommand.action(async () => {
      return await command.handle(commanderCommand);
    });
    return commanderCommand;
  }
}
