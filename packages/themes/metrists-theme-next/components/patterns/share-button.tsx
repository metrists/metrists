"use client";
import { Button, type ButtonProps } from "~/components/ui/button";
import { useShare } from "~/utils/hooks/use-share";

export function ShareButton({
  meta,
  ...buttonProps
}: {
  meta: Parameters<typeof useShare>[0];
} & ButtonProps) {
  const shareMeta = useShare(meta);
  return (
    <Button onClick={shareMeta} {...buttonProps}>
      {buttonProps.children}
    </Button>
  );
}
