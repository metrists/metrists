import type { Markdown } from "contentlayer/core";

export type ReaderProps = {
  markdown: Markdown;
};

export function Reader({ markdown }: ReaderProps) {
  return (
    <div
      className="reader"
      dangerouslySetInnerHTML={{
        __html: markdown.html,
      }}
    />
  );
}
