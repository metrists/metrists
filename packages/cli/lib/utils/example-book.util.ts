import { getArbitraryMeta, getArbitraryChapter } from './content-layer.util';
import { serializeFrontmatter } from './frontmatter.util';
import { createFileIfNotExists, combinePaths } from './fs.util';
import { Logger } from './logger.util';

export function generateExampleBook(logger: Logger, basePath: string) {
  const metaPath = combinePaths([basePath, 'meta.md']);
  const metaFrontmatter = exampleBook.meta.header;
  const metaContent = exampleBook.meta.content;
  createFileIfNotExists(metaPath, `${metaFrontmatter}\n${metaContent}`);

  exampleBook.chapters.forEach((chapter) => {
    const chapterPath = combinePaths([basePath, `${chapter.file}.md`]);
    const chapterFrontmatter = chapter.header;
    const chapterContent = chapter.content;
    createFileIfNotExists(
      chapterPath,
      `${chapterFrontmatter}\n${chapterContent}`,
    );
  });
}
const author = 'Tarō Gomi';
export const exampleBook = {
  meta: {
    header: serializeFrontmatter(
      getArbitraryMeta('everyone-poops', author, ['children', 'humor']),
    ),
    content: `# Everyone Poops`,
  },
  chapters: [
    {
      file: 'elephant-and-mouse',
      header: serializeFrontmatter(
        getArbitraryChapter('elephant-and-mouse', 1, author),
      ),
      content: `# Elephant 
An elephant makes a big poop
A mouse makes a small poop
`,
    },
    {
      file: 'camel',
      header: serializeFrontmatter(getArbitraryChapter('camel', 2, author)),
      content: `# Camels
A one-hump camel makes a one-hump poop
A two-hump camel makes a two-hump poop
Only kidding!
`,
    },
    {
      file: 'fish-and-birds',
      header: serializeFrontmatter(
        getArbitraryChapter('fish-and-birds', 3, author),
      ),
      content: `# Fish and Birds
Fish poop
And so do birds
And bugs too
`,
    },
    {
      file: 'different-animals',
      header: serializeFrontmatter(
        getArbitraryChapter('different-animals', 4, author),
      ),
      content: `# Different Animals 
Different Animals make different kinds of poop
Different shapes
Different colors
Even different smells
`,
    },
  ],
};
