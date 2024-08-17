import { join } from 'path';
import { ConfigAwareCommand } from './config-aware.command';
import { deleteDirectory, pathExists } from '../lib/utils/fs.util';
import * as chalk from 'chalk';
import type { Command } from 'commander';

export class PruneCommand extends ConfigAwareCommand {
  protected workingDirectory: string;
  protected templatePath: string;

  public load(program: Command) {
    return program.command('prune');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(command: Command) {
    await this.loadRcConfig();

    const workingDirectory = process.cwd();
    const outDir = this.getRc((rc) => rc?.outDir);
    const templatePath = join(workingDirectory, outDir);

    if (pathExists(templatePath)) {
      await deleteDirectory(templatePath);
      console.log(chalk.green('Pruned the previous build'));
    } else {
      console.log(chalk.yellow('No previous build found to prune'));
    }
  }
}
