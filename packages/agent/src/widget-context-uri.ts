/**
 * URI scheme + codec for widget-context MCP resources (MET-68). No
 * server-side registry: everything `resources/read` needs to rebuild the
 * context bundle (the document path and the send-time ProseMirror position)
 * is encoded directly in the URI's query string, so a `resource_link` is
 * self-contained — nothing to store, isolate per task, or clean up on task
 * disposal. Pure and dependency-free so `agents.ts` (the entity-handle
 * facade, not an editor/DOM module) can encode a URI without pulling in any
 * editor state.
 */
const WIDGET_CONTEXT_SCHEME = "notefig://widget-context";

export interface WidgetContextRef {
  /** Workspace-relative document path. */
  path: string;
  /** Raw ProseMirror position at send time, used as-is at read time — no
   *  fuzzy re-anchoring (see document-outline.ts). */
  pos: number;
  /** Capture-time ProseMirror range of the selection this prompt
   *  referenced (the quoted passage at the top of the prompt text). Two
   *  integers, so the URI stays self-contained — the text itself travels
   *  as a markdown blockquote in the prompt. Named exactly like the
   *  resource payload field it becomes. */
  selectedRange?: { from: number; to: number };
}

export function encodeWidgetContextUri(ref: WidgetContextRef): string {
  const params = new URLSearchParams({ path: ref.path, pos: String(ref.pos) });
  if (ref.selectedRange) {
    params.set("from", String(ref.selectedRange.from));
    params.set("to", String(ref.selectedRange.to));
  }
  return `${WIDGET_CONTEXT_SCHEME}?${params.toString()}`;
}

export function decodeWidgetContextUri(
  uri: string,
): WidgetContextRef | undefined {
  const prefix = `${WIDGET_CONTEXT_SCHEME}?`;
  if (!uri.startsWith(prefix)) return undefined;
  const params = new URLSearchParams(uri.slice(prefix.length));
  const path = params.get("path");
  const posRaw = params.get("pos");
  if (!path || posRaw === null) return undefined;
  const pos = Number(posRaw);
  if (!Number.isFinite(pos)) return undefined;
  const from = Number(params.get("from"));
  const to = Number(params.get("to"));
  const range =
    params.has("from") &&
    params.has("to") &&
    Number.isFinite(from) &&
    Number.isFinite(to)
      ? { selectedRange: { from, to } }
      : {};
  return { path, pos, ...range };
}
