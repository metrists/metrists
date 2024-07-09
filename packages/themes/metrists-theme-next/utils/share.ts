import type { Meta } from ".contentlayer/generated";
import type { useToast } from "~/components/ui/use-toast";

export interface ShareData {
  title: string;
  url: string;
  text: string;
}

export async function shareOrCopy(
  { title, url, text }: ShareData,
  onSuccess: (shareData: ShareData, method: "share" | "clipboard") => void,
  onFail?: (shareData?: ShareData) => void
) {
  if (navigator.share) {
    await navigator.share({
      title: title,
      url: url,
      text: text,
    });
    onSuccess({ title, url, text }, "share");
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    onSuccess({ title, url, text }, "clipboard");
  } else if (onFail) {
    onFail({ title, url, text });
  }
}

export function shareMetaCurry(
  toast: ReturnType<typeof useToast>["toast"],
  meta: Meta
) {
  return async () => {
    await shareOrCopy(
      {
        title: meta.title,
        url: window.location.href,
        text: meta.body.raw,
      },
      (_, method: "clipboard" | "share") => {
        if (method === "clipboard") {
          toast({
            title: "Link Copied",
          });
        }
      },
      (_) => {
        toast({
          title: `Could not share`,
          description: `It seems like your browser does not support sharing or copying links.`,
        });
      }
    );
  };
}
