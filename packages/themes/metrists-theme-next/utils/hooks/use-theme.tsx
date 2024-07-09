import { useFetchers } from "@remix-run/react";
import { parse } from "@conform-to/zod";
import { useHints } from "@utils/client-hints";
import { schema } from "@routes/preferences.theme";
import { useRequestInfo } from "@utils/request-info";

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
  const hints = useHints();
  const requestInfo = useRequestInfo();
  const optimisticMode = useOptimisticThemeMode();
  if (optimisticMode) {
    return optimisticMode === "system" ? hints.theme : optimisticMode ?? "dark";
  }
  return requestInfo.userPreferences.theme ?? hints.theme;
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
  const fetchers = useFetchers();

  const themeFetcher = fetchers.find(
    (f) => f.formData?.get("intent") === "update-theme"
  );

  if (themeFetcher && themeFetcher.formData) {
    const submission = parse(themeFetcher.formData, {
      schema,
    });
    return submission.value?.theme;
  }
}
