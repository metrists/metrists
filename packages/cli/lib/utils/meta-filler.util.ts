import {
  getArbitraryMeta,
  validateMetaDocumentFrontmatter,
  getArbitraryChapter,
  validateChapterDocumentFrontmatter,
} from './content-layer.util';
import {
  serializeFrontmatter,
  parseFrontmatter,
  hasFrontmatter,
  replaceFrontmatter,
  type Frontmatter,
} from './frontmatter.util';
import {
  writeToFile,
  createFile,
  pathExists,
  readFile,
  combinePaths,
} from './fs.util';
import { sep } from 'path';
import { SafeParseReturnType } from 'zod';
import { Logger } from './logger.util';

export async function createOrModifyChapterFile(filePath, index: number) {
  const sanitizedFileName = getLastPartOfThePath(filePath);
  const arbitraryChapter = getArbitraryChapter(sanitizedFileName, index);

  return await updateFileWithFrontmatter(
    filePath,
    arbitraryChapter,
    validateChapterDocumentFrontmatter,
  );
}

export async function createOrModifyMetaFile(
  logger: Logger,
  baseDir: string,
  metaFileName: string,
) {
  const metaFilePath = combinePaths([baseDir, metaFileName]);

  const directoryName = getLastPartOfThePath(baseDir);
  const arbitraryMeta = getArbitraryMeta(directoryName);

  if (!pathExists(metaFilePath)) {
    logger.verbose(`Meta file does not exist. Creating the meta file.`);
    logger.noob(
      `Creating a meta file that contains tile, author, date, tags and short description about the book.`,
    );
    return await createFileWithFrontmatter(metaFilePath, arbitraryMeta);
  } else {
    logger.verbose(`Meta file already exists. Updating the meta file.`);
    return await updateFileWithFrontmatter(
      metaFilePath,
      arbitraryMeta,
      validateMetaDocumentFrontmatter,
    );
  }
}

async function createFileWithFrontmatter(
  metaFilePath: string,
  frontmatter: Frontmatter,
) {
  return await createFile(metaFilePath, serializeFrontmatter(frontmatter));
}

async function updateFileWithFrontmatter(
  filePath: string,
  arbitraryMeta: Frontmatter,
  validate: (frontmatter: Frontmatter) => SafeParseReturnType<any, any>,
) {
  //TODO: Can we stream the file? Do we need to read the whole file into memory?
  const fileContent = await readFile(filePath);
  const isContainingFrontmatter = hasFrontmatter(fileContent);
  if (isContainingFrontmatter) {
    const existingMeta = parseFrontmatter(fileContent);
    const validationResult = validate(existingMeta);
    if (!validationResult.success) {
      return await appendFileByCombiningFrontmatter(
        filePath,
        fileContent,
        existingMeta,
        arbitraryMeta,
      );
    }
  } else {
    return await appendFileWithFrontmatter(
      filePath,
      fileContent,
      arbitraryMeta,
    );
  }
}

async function appendFileWithFrontmatter(
  filePath: string,
  fileContent: string,
  arbitraryMeta: Frontmatter,
) {
  const newContent = serializeFrontmatter(arbitraryMeta) + fileContent;
  return await writeToFile(filePath, newContent);
}

async function appendFileByCombiningFrontmatter(
  filePath: string,
  fileContent: string,
  existingMeta: Frontmatter,
  arbitraryMeta: Frontmatter,
) {
  const combinedMeta = { ...arbitraryMeta, ...existingMeta };
  const newContent = replaceFrontmatter(fileContent, combinedMeta);
  return await writeToFile(filePath, newContent);
}

function getLastPartOfThePath(baseDir: string) {
  return baseDir.split(sep).pop();
}
