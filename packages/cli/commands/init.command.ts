import { join } from 'path';
import { ConfigAwareCommand } from './config-aware.command';
import { spawnAndWait } from '../lib/utils/process.util';
import {
  copyAllFilesFromOneDirectoryToAnother,
  pathExists,
  createDirectory,
  performOnAllFilesInDirectory,
  directoryEmpty,
} from '../lib/utils/fs.util';
import { addToGitIgnore } from '../lib/utils/gitignore.util';
import {
  createOrModifyMetaFile,
  createOrModifyChapterFile,
} from '../lib/utils/meta-filler.util';
import { ExampleDirectoryNotEmptyException } from '../exceptions/example-directory-not-empty.exception';
import type { Command } from 'commander';

type UndefIndex<T extends any[], I extends number> = {
  [P in keyof T]: P extends Exclude<keyof T, keyof any[]>
    ? P extends `${I}`
      ? undefined
      : T[P]
    : T[P];
};
type FilterUndefined<T extends any[]> = T extends []
  ? []
  : T extends [infer H, ...infer R]
  ? H extends undefined
    ? FilterUndefined<R>
    : [H, ...FilterUndefined<R>]
  : T;
type SpliceTuple<T extends any[], I extends number> = FilterUndefined<
  UndefIndex<T, I>
>;

export class InitCommand extends ConfigAwareCommand {
  protected static ignoredFiles = ['.gitignore', '.metristsrc'];
  protected static ignoredDirectories = ['.git'];
  protected static metaFileName = 'meta.md';
  protected static defaultExample = 'everyone-poops';
  protected outDir: string;
  protected workingDirectory: string;
  protected templatePath: string;
  protected templateContentPath: string;
  protected templateAssetsPath: string;

  public load(program: Command) {
    return program
      .command('init')
      .alias('i')
      .option(
        '--example [example]',
        'Generate an example book',
        InitCommand.defaultExample,
      )
      .description('Initialize the metrists project');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handle(command: Command) {
    this.workingDirectory = process.cwd();

    const example: string | true | undefined = command.opts().example;
    if (example) {
      await this.copyExampleFilesToWorkingDirectory(
        example === true ? undefined : example,
      );
    }
    await this.loadRcConfig();

    const outDir = this.getRc((rc) => rc?.outDir);
    this.templatePath = join(this.workingDirectory, outDir);
    const isFirstRun = this.isFirstRun(this.templatePath);

    const initialSetupPromises: Promise<any>[] = [
      this.addOrUpdateMetadataOfFiles(),
    ];

    if (isFirstRun) {
      this.logger.noob(
        `Since this is the first run, we will copy a web-template to the ${outDir} directory.`,
      );
      initialSetupPromises.push(this.copyAndInstallTemplate());
    }

    await Promise.all(initialSetupPromises);

    await this.loadTemplateConfig();
    const templateContentRelativePath = this.getTemplateConfig(
      (rc) => rc?.contentPath,
    );
    this.templateContentPath = join(
      this.templatePath,
      templateContentRelativePath,
    );
    const templateAssetsRelativePath = this.getTemplateConfig(
      (rc) => rc?.assetsPath,
    );
    this.templateAssetsPath = join(
      this.templatePath,
      templateAssetsRelativePath,
    );

    this.logger.noob(
      `Adding the ${outDir} directory to .gitignore, to avoid committing it to git.`,
    );
    const createGitIGnoreAndCopyFilesPromise: Promise<any>[] = [
      this.createGitIgnoreFile(),
    ];

    if (isFirstRun) {
      this.logger.noob(
        `Copying non-markdown files into the asset path of the template.`,
      );
      this.logger.noob(
        `Copying the markdown files into the content path of the template.`,
      );
      createGitIGnoreAndCopyFilesPromise.concat(
        this.copyAssetsAndContentFilesToTemplate(),
      );
      createGitIGnoreAndCopyFilesPromise.push(this.initializeTemplate());
    }

    await Promise.all(createGitIGnoreAndCopyFilesPromise);
  }

  public static getMetaFileName() {
    return InitCommand.metaFileName;
  }

  protected async spawnAndWaitAndStopIfError(
    ...args: SpliceTuple<Parameters<typeof spawnAndWait>, 0>
  ) {
    const childProcess = await spawnAndWait(this.logger, ...args);
    if (childProcess.exitCode) {
      process.exit(childProcess.exitCode);
    }
  }

  protected shouldIncludeFile(filePath: string) {
    const isIgnoredDirectory = InitCommand.ignoredDirectories.some((dir) =>
      filePath.includes(dir),
    );
    const isIgnoredFile = InitCommand.ignoredFiles.some((file) =>
      filePath.endsWith(file),
    );
    return (
      !isIgnoredDirectory &&
      !isIgnoredFile &&
      !filePath.includes(this.templatePath)
    );
  }

  protected shouldIncludeChapterFile(filePath: string) {
    return (
      this.shouldIncludeFile(filePath) &&
      !filePath.endsWith(InitCommand.metaFileName) &&
      this.getChangedFileType(filePath) === 'content'
    );
  }

  protected getChangedFileType(path: string): 'content' | 'assets' {
    if (path.endsWith('.md')) {
      return 'content';
    } else {
      return 'assets';
    }
  }

  protected async createGitIgnoreFile() {
    const itemsToIgnore = [this.getRc((rc) => rc?.outDir)];
    await addToGitIgnore(this.workingDirectory, itemsToIgnore);
  }

  protected async copyAndInstallTemplate() {
    await this.copyTemplate();
    this.logger.log(['verbose', 'noob'], 'Successfully Added Template');
    await this.spawnAndWaitAndStopIfError(
      'npm',
      ['install', '--legacy-peer-deps'],
      {
        cwd: this.templatePath,
      },
    );
    this.logger.log(['verbose', 'noob'], 'Successfully Installed Dependencies');
  }

  protected async copyTemplate() {
    const templateName = this.getRc((rc) => rc?.template?.name);
    const fullTemplatePath = join(__dirname, '..', 'themes', templateName);
    if (!pathExists(this.templatePath)) {
      await createDirectory(this.templatePath);
    }
    await copyAllFilesFromOneDirectoryToAnother(
      fullTemplatePath,
      this.templatePath,
      (path) =>
        !path.includes('.contentlayer') &&
        !path.includes('.git') &&
        !path.includes('.next'),
    );
  }

  protected async initializeTemplate() {
    const templateInitCommand = this.getTemplateConfig((rc) => rc?.initScript);
    if (templateInitCommand) {
      const initCommandParts = templateInitCommand.split(' ');
      return this.spawnAndWaitAndStopIfError(
        initCommandParts[0],
        initCommandParts.slice(1),
        {
          cwd: this.templatePath,
        },
      );
    }
    return Promise.resolve();
  }

  protected isFirstRun(templatePath: string) {
    //TOOD: Be more specific about this condition
    return !pathExists(templatePath);
  }

  protected async copyAssetsAndContentFilesToTemplate() {
    const createDirectoryPromises = [];
    if (!pathExists(this.templateContentPath)) {
      createDirectoryPromises.push(createDirectory(this.templateContentPath));
    }

    if (!pathExists(this.templateAssetsPath)) {
      createDirectoryPromises.push(createDirectory(this.templateAssetsPath));
    }

    await Promise.all(createDirectoryPromises);

    return await Promise.all([
      copyAllFilesFromOneDirectoryToAnother(
        this.workingDirectory,
        this.templateContentPath,
        (filePath) =>
          this.shouldIncludeFile(filePath) &&
          this.getChangedFileType(filePath) === 'content',
      ),
      copyAllFilesFromOneDirectoryToAnother(
        this.workingDirectory,
        this.templateAssetsPath,
        (filePath) =>
          this.shouldIncludeFile(filePath) &&
          this.getChangedFileType(filePath) === 'assets',
      ),
    ]);
  }

  protected async addOrUpdateMetadataOfFiles() {
    return Promise.all([
      createOrModifyMetaFile(
        this.logger,
        this.workingDirectory,
        InitCommand.metaFileName,
      ),
      performOnAllFilesInDirectory(
        this.workingDirectory,
        createOrModifyChapterFile,
        this.shouldIncludeChapterFile.bind(this),
      ),
    ]);
  }

  protected async copyExampleFilesToWorkingDirectory(example?: string) {
    if (!directoryEmpty(this.workingDirectory)) {
      throw new ExampleDirectoryNotEmptyException();
    }

    const exampleDirectory = example ?? InitCommand.defaultExample;
    const fullExamplePath = join(__dirname, '..', 'examples', exampleDirectory);
    await copyAllFilesFromOneDirectoryToAnother(
      fullExamplePath,
      this.workingDirectory,
      () => true,
    );
  }
}
