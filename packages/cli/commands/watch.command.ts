import { join } from 'path';
import * as chalk from 'chalk';
import { watch } from 'chokidar';
import { InitCommand } from './init.command';
import { spawnAndWait } from '../lib/utils/process.util';
import {
  copyFile,
  deleteFile,
  createDirectory,
  deleteDirectory,
} from '../lib/utils/fs.util';
import { open } from '../lib/utils/open.util';
import type { Command } from 'commander';

export class WatchCommand extends InitCommand {
  protected outDir: string;
  protected workingDirectory: string;
  protected templatePath: string;

  public load(program: Command) {
    return program
      .command('watch')
      .alias('w')
      .description('Watch for the changes and sync them into the dev server');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(command: Command) {
    await super.handle(command);

    await Promise.all([
      this.startDevServer(),
      this.watchFiles(),
      this.startContentLayer(),
    ]);
  }

  protected async startDevServer() {
    //TODO: Be smarter about this
    let serverStarted = false;
    const serverStartRegexes = [/https?:\/\/localhost:\d+/g];
    const watchScript = this.getTemplateConfig((rc) => rc?.watchScript).split(
      ' ',
    );
    return spawnAndWait(
      watchScript[0],
      watchScript.slice(1),
      {
        cwd: this.templatePath,
      },
      {
        stdOutListener: (data) => {
          if (!serverStarted) {
            const matches = serverStartRegexes.map((regex) =>
              data.toString().match(regex),
            );
            if (matches.length && matches[0]) {
              const localUrl = matches[0].toString();
              try {
                open(localUrl);
                serverStarted = true;
              } catch (e) {
                console.log(chalk.green(`Server started at ${localUrl}`));
              }
            }
          }
          console.log(chalk.gray(data.toString()));
        },
      },
    );
  }

  protected async startContentLayer() {
    const contentWatchScript = this.getTemplateConfig(
      (rc) => rc?.watchContentScript,
    ).split(' ');
    return spawnAndWait(contentWatchScript[0], contentWatchScript.slice(1), {
      cwd: this.templatePath,
    });
  }

  protected watchFiles() {
    const eventToCallback = {
      add: this.handleFileAdded.bind(this),
      change: this.handleFileChanged.bind(this),
      unlink: this.handleFileDeleted.bind(this),
      addDir: this.handleDirectoryAdded.bind(this),
      unlinkDir: this.handleDirectoryDeleted.bind(this),
    };

    const ignoredFsErrors = ['ENOENT'];

    const watchInstance = watch(this.workingDirectory, {
      persistent: true,
      ignoreInitial: false,
    });

    watchInstance.on('all', async (event, path) => {
      if (this.shouldIncludeFile(path) && eventToCallback[event]) {
        try {
          await eventToCallback[event](path);
        } catch (e) {
          if (!ignoredFsErrors.includes(e.code)) {
            throw e;
          }
        }
      }
    });

    return watchInstance;
  }

  protected async handleFileAdded(path: string) {
    const fileRelativePath =
      await this.getChangedFileRelativePathToTemplateOutputPath(
        path,
        this.getChangedFileType(path),
      );

    return await copyFile(path, fileRelativePath);
  }

  protected async handleFileDeleted(path: string) {
    const fileRelativePath =
      await this.getChangedFileRelativePathToTemplateOutputPath(
        path,
        this.getChangedFileType(path),
      );

    return await deleteFile(fileRelativePath);
  }

  protected async handleFileChanged(path: string) {
    const fileRelativePath =
      await this.getChangedFileRelativePathToTemplateOutputPath(
        path,
        this.getChangedFileType(path),
      );

    return await copyFile(path, fileRelativePath);
  }

  protected async handleDirectoryAdded(path: string) {
    const fileRelativePath =
      await this.getChangedFileRelativePathToTemplateOutputPath(
        path,
        this.getChangedFileType(path),
      );

    return await createDirectory(fileRelativePath);
  }

  protected async handleDirectoryDeleted(path: string) {
    const fileRelativePath =
      await this.getChangedFileRelativePathToTemplateOutputPath(
        path,
        this.getChangedFileType(path),
      );

    return await deleteDirectory(fileRelativePath);
  }

  protected async getChangedFileRelativePathToTemplateOutputPath(
    path: string,
    fileType: 'content' | 'assets',
  ) {
    const filePathRelativeToRootWithFileName = path.replace(
      this.workingDirectory,
      '',
    );

    if (fileType === 'content') {
      return join(this.templateContentPath, filePathRelativeToRootWithFileName);
    } else {
      return join(this.templateAssetsPath, filePathRelativeToRootWithFileName);
    }
  }
}
