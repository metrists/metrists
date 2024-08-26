import { getArbitraryMeta, getArbitraryChapter } from './content-layer.util';
import { serializeFrontmatter } from './frontmatter.util';

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
      header: serializeFrontmatter(
        getArbitraryChapter('elephant-and-mouse', 1, author),
      ),
      content: `# Elephant 
An elephant makes a big poop
A mouse makes a small poop
`,
    },
    {
      header: serializeFrontmatter(getArbitraryChapter('camel', 1, author)),
      content: `# Camels
A one-hump camel makes a one-hump poop
A two-hump camel makes a two-hump poop
Only kidding!
`,
    },
    {
      header: serializeFrontmatter(
        getArbitraryChapter('fish-and-birds', 1, author),
      ),
      content: `# Fish and Birds
Fish poop
And so do birds
And bugs too
`,
    },
  ],
};
