import { ChapterNavigationProps } from "~/components/patterns/chapter-navigation";
import type { Chapter } from ".contentlayer/generated";

export type ChapterLike = Pick<Chapter, "slug" | "title" | "index">;

export type ChapterNavigation = [ChapterLike | undefined, ChapterLike | undefined];

export function getChapterNavigation(
  currentChapter: ChapterLike | undefined,
  chapters: ChapterLike[]
): ChapterNavigationProps["navigation"] {
  const slug = currentChapter?.slug;
  const index = slug ? getSlugChapterIndex(slug, chapters) : -1;
  return [chapters[index - 1], chapters[index + 1]];
}

export function getSlugChapterIndex(slug: string, chapters: ChapterLike[]): number {
  return chapters.findIndex((chapter: ChapterLike) => chapter.slug === slug);
}
