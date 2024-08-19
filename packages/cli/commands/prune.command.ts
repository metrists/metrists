import { join } from 'path';
import { ConfigAwareCommand } from './config-aware.command';
import { deleteDirectory, pathExists } from '../lib/utils/fs.util';
import type { Command } from 'commander';

export class PruneCommand extends ConfigAwareCommand {
  protected workingDirectory: string;
  protected templatePath: string;

  public load(program: Command) {
    return program
      .command('prune')
      .description('Prune the previous version of the build');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(command: Command) {
    await this.loadRcConfig();

    const workingDirectory = process.cwd();
    const outDir = this.getRc((rc) => rc?.outDir);
    const templatePath = join(workingDirectory, outDir);

    if (pathExists(templatePath)) {
      await deleteDirectory(templatePath);
      this.logger.info('Pruned the previous build');
    } else {
      this.logger.verbose('No previous build found to prune');
    }
  }
}
