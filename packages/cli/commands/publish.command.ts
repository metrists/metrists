import { InitCommand } from './init.command';
import { createFileIfNotExists } from '../lib/utils/fs.util';
import { getHostHelper } from '../lib/utils/hosts.util';
import { name } from '../package.json';
import type { Command } from 'commander';

export class PublishCommand extends InitCommand {
  public load(program: Command) {
    return program
      .command('publish')
      .alias('p')
      .description('Publish a production build of the book')
      .option(
        '-p, --platform <platform>',
        'Platform where the book will be published',
      );
  }

  public async handle(
    command: ReturnType<typeof PublishCommand.prototype.load>,
  ) {
    await super.handle(command);
    const platform = command.opts().platform;
    await this.createHostingConfig(platform);
  }

  protected async createHostingConfig(hostingPlatform) {
    const outDir = this.getRc((rc) => rc?.outDir);
    const command = `npx ${name} build`;

    const hostHelper = getHostHelper(hostingPlatform);
    if (!hostHelper) {
      throw new Error(`Host ${hostingPlatform} is not supported`);
    }

    return await createFileIfNotExists(
      hostHelper.configFileName,
      hostHelper.getConfigFileContent({ outDir, command }),
    );
  }
}
