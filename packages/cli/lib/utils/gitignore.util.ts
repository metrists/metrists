import { createFileIfNotExists, combinePaths, readFileInLines, appendToFile } from './fs.util';
export async function addToGitIgnore(baseDirectory: string, newRecords: string[]) {
  const fullPath = getGitIgnorePath(baseDirectory);
  await createFileIfNotExists(fullPath);
  await addItemsToGitIgnoreIfNotExists(fullPath, newRecords);
}

export async function addItemsToGitIgnoreIfNotExists(path: string, newRecords: string[]) {
  const currentContent = await readFileInLines(path);
  const recordsThatDoNotExist = newRecords.filter(
    (record) =>
      !currentContent.some((currentRecord) => doesRecordContainValue(currentRecord, record)),
  );

  if (recordsThatDoNotExist.length) {
    await appendToFile(path, recordsThatDoNotExist);
  }
}

function getGitIgnorePath(baseDirectory: string) {
  return combinePaths([baseDirectory, '.gitignore']);
}

function doesRecordContainValue(record: string, value: string) {
  //TODO: use a better method that handles wildcards
  return record === value;
}
