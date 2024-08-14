import { Header } from "@/components/patterns/header";
import { Sidebar } from "@/components/patterns/sidebar";
import { allMeta, allChapters } from "contentlayer/generated";
import {
  getChapterNavigation,
  getCoverPath,
  invariant,
  useShare,
} from "@/lib/utils";
import { Reader } from "@/components/patterns/reader";

export function getStaticPaths() {
  const paths = allChapters.map((chapter) => ({
    params: { chapter: chapter.slug },
  }));

  return { paths, fallback: false };
}

export async function getStaticProps({
  params,
}: ReturnType<typeof getStaticPaths>["paths"][0]) {
  const chapter = allChapters.find(
    (chapter) => chapter.slug === params.chapter,
  );
  invariant(chapter, `Chapter not found for slug: ${params.chapter}`);
  const navigation = getChapterNavigation(chapter, allChapters);
  return {
    props: {
      meta: allMeta[0],
      chapters: allChapters,
      navigation,
      chapter,
      coverPath: await getCoverPath(),
    },
  };
}

export default function Index({
  meta,
  chapters,
  navigation,
  chapter,
  coverPath,
}: Awaited<ReturnType<typeof getStaticProps>>["props"]) {
  const shareMeta = useShare(meta);

  return (
    <Header meta={meta} coverPath={coverPath}>
      <Sidebar meta={meta} chapters={chapters} navigation={navigation}>
        <div className="my-4">
          <Reader markdown={chapter.body} />
        </div>
      </Sidebar>
    </Header>
  );
}
