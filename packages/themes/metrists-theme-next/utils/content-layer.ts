import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { contentDirectory, metaPath } from "~/contentlayer.config";
import { Chapter, Markdown, Meta } from "~/.contentlayer/generated";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const CONTENT_LAYER_DIR = path.join(
  __dirname,
  "..",
  "..",
  ".contentlayer",
  "generated",
);

export const CONTENT_CHAPTER_DIR = path.join(CONTENT_LAYER_DIR, "Chapter");
export const CONTENT_SRC_CHAPTER_DIR = path.join(
  __dirname,
  "..",
  contentDirectory,
);

export const CONTENT_LAYER_META_DIR = path.join(CONTENT_LAYER_DIR, "Meta");

export type ChapterData = Omit<
  Chapter,
  "_id" | "_raw" | "type" | "url" | "body"
> & {
  body: string | Markdown;
};

export async function getChapters(): Promise<Array<Chapter>> {
  // due to a bug, the files generated once by content layer are not removed, this will lead to deleted file names loaded as an outcome of the scan. We check the files in the source dir to identify their targets and correctly load them
  // const dir = await fs.readdir(CONTENT_POST_DIR)
  const dir = await fs.readdir(CONTENT_SRC_CHAPTER_DIR);

  return (
    await Promise.all(
      dir
        .map((filename) => {
          if (filename === metaPath) {
            return null;
          }
          return getJsonData<Chapter>(
            path.join(CONTENT_CHAPTER_DIR, `${filename}.json`),
          );
        })
        .filter(Boolean) as Promise<Chapter>[],
    )
  ).sort(
    (chapterPrev: Chapter, chapterNext: Chapter) =>
      chapterPrev.index - chapterNext.index,
  );
}

export async function getPostSourceFilenames(): Promise<Array<string>> {
  return await fs.readdir(CONTENT_SRC_CHAPTER_DIR);
}

export async function getChapter(slug: string): Promise<Chapter | null> {
  try {
    const file = await getJsonData<Chapter>(
      path.join(CONTENT_CHAPTER_DIR, `${slug}.md.json`),
    );
    return file;
  } catch (e) {
    return null;
  }
}

export async function getMeta(): Promise<Meta | null> {
  try {
    return await getJsonData<Meta>(
      path.join(CONTENT_LAYER_META_DIR, `${metaPath}.json`),
    );
  } catch (e) {
    return null;
  }
}

export async function getChaptersWithoutBody(): Promise<
  Array<Omit<ChapterData, "body">>
> {
  const chapters = await getChapters();
  return chapters.map<Omit<ChapterData, "body">>((chapter: any) => {
    delete chapter.body;
    return chapter;
  });
}

export async function getJsonData<T>(jsonPath: string): Promise<T> {
  const content = await fs.readFile(jsonPath, "utf-8");
  return JSON.parse(content);
}
