import { Header } from "@/components/patterns/header";
import { Sidebar } from "@/components/patterns/sidebar";
import { allMeta, allChapters } from "contentlayer/generated";
import { getChapterNavigation, useShare } from "@/lib/utils";
import { BookOverview } from "@/components/patterns/book-overview";
import { Reader } from "@/components/patterns/reader";
import { Share } from "lucide-react";

export function getStaticProps() {
  const navigation = getChapterNavigation(undefined, allChapters);
  return {
    props: {
      meta: allMeta[0],
      chapters: allChapters,
      navigation,
    },
  };
}

export default function Home({
  meta,
  chapters,
  navigation,
}: ReturnType<typeof getStaticProps>["props"]) {
  const shareMeta = useShare(meta);
  const firstChapter = chapters[0];

  return (
    <Header meta={meta}>
      <Sidebar meta={meta} chapters={chapters} navigation={navigation}>
        <BookOverview
          title={meta.title}
          cover="/default-cover.svg"
          authors={meta.authors}
          actions={[
            ...(firstChapter
              ? [
                  {
                    label: "Start Reading",
                    action: `/${firstChapter.slug}`,
                    buttonProps: {},
                  },
                ]
              : []),
            {
              label: "Download Epub",
              action: () => {},
              buttonProps: { variant: "secondary", disabled: true },
            },
            {
              label: <Share size={16} />,
              action: shareMeta,
              buttonProps: { variant: "secondary", className: "px-3" },
            },
          ]}
          twoToneImageProps={{
            imageContainerClassName: "max-h-[300px]",
          }}
        />
        <div className="pt-4">
          <Reader markdown={meta.body} />
        </div>
      </Sidebar>
    </Header>
  );
}
