import { InitCommand } from './init.command';
import { createFileIfNotExists } from '../lib/utils/fs.util';
import { getHostHelper, getSupportedHosts } from '../lib/utils/hosts.util';
import { name } from '../package.json';
import { UnsupportedHostException } from '../exceptions/unsupported-host.exception';
import { HostNotProvidedException } from '../exceptions/host-not-provided.exception';
import type { Command } from 'commander';

export class PublishCommand extends InitCommand {
  public load(program: Command) {
    return program
      .command('publish')
      .alias('p')
      .argument('[platform]', 'Platform where the book will be published')
      .description('Publish a production build of the book');
  }

  public async handle(
    command: ReturnType<typeof PublishCommand.prototype.load>,
  ) {
    await super.handle(command);
    const platform = command.args[0];
    await this.createHostingConfig(platform);
  }

  protected async createHostingConfig(hostingPlatform) {
    if (!hostingPlatform) {
      throw new HostNotProvidedException({
        supportedHosts: this.getSupportedHosts(),
      });
    }
    const outDir = 'dist';
    const command = `npx ${name} build -o ${outDir}`;

    const hostHelper = getHostHelper(hostingPlatform);
    if (!hostHelper) {
      throw new UnsupportedHostException({
        host: hostingPlatform,
        supportedHosts: this.getSupportedHosts(),
      });
    }

    return await createFileIfNotExists(
      hostHelper.configFileName,
      hostHelper.getConfigFileContent({ outDir, command }),
    );
  }

  protected getSupportedHosts() {
    const hosts = getSupportedHosts();
    return hosts.join(', ');
  }
}
