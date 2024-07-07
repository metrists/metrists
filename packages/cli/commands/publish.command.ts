import { InitCommand } from './init.command';
import { spawnAndWait } from '../lib/utils/process.util';
import { createFileIfNotExists } from '../lib/utils/fs.util';
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
    Promise.all([
      ...(platform ? [this.createHostingConfig(platform)] : []),
      this.buildContentLayer().then(this.buildTemplate.bind(this)),
    ]);
  }

  protected async buildTemplate() {
    const buildScript = this.getTemplateConfig((rc) => rc?.buildScript).split(
      ' ',
    );
    return spawnAndWait(buildScript[0], buildScript.slice(1), {
      cwd: this.templatePath,
    });
  }

  protected async buildContentLayer() {
    const buildContentScript = this.getTemplateConfig(
      (rc) => rc?.buildContentScript,
    ).split(' ');
    return spawnAndWait(buildContentScript[0], buildContentScript.slice(1), {
      cwd: this.templatePath,
    });
  }

  protected async createHostingConfig(hostingPlatform) {
    const outDir = this.getRc((rc) => rc?.outDir);
    const netlifyConfig = `[build]
publish = "${outDir}/dist"
command = "npx @metrists/cli publish"
`;
    const hostingToConfig = {
      netlify: {
        path: 'netlify.toml',
        content: netlifyConfig,
      },
    };
    return await createFileIfNotExists(
      hostingToConfig[hostingPlatform].path,
      hostingToConfig[hostingPlatform].content,
    );
  }
}
