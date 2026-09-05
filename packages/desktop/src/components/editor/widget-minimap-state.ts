/**
 * The minimap's pure half (MET-172): what the rail shows, derived from the
 * live doc and each widget's phase. Kept free of collections and React so
 * tests exercise the derivations directly.
 */
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  PROMPT_NODE_NAME,
  getPromptBlob,
  type BlobPhase,
} from "@notefig/widgets";

export type WidgetMapEntry = {
  /** Unique per entry: blobId alone can recur (external edits can
   *  duplicate a marker), so the document position disambiguates. */
  key: string;
  blobId: string | null;
  /** 0..1 position of the widget within the document. */
  ratio: number;
  /** Short human handle: draft text, else last sent prompt, else generic. */
  title: string;
};

const TITLE_MAX_CHARS = 48;

/** Pure derivation, exported for tests. */
export function deriveWidgetMapEntries(doc: PMNode): WidgetMapEntry[] {
  const entries: WidgetMapEntry[] = [];
  const size = Math.max(doc.content.size, 1);
  doc.descendants((node, pos) => {
    if (node.type.name !== PROMPT_NODE_NAME) return true;
    const blobId = (node.attrs.blobId as string | null) ?? null;
    const draftText = node.firstChild?.textContent.trim() ?? "";
    const title =
      draftText ||
      (blobId ? getPromptBlob(blobId).lastSentPrompt.trim() : "") ||
      "Prompt";
    entries.push({
      key: `${blobId ?? "pos"}-${pos}`,
      blobId,
      // Clamped in from the edges so the first/last dot never sits on the
      // rail's boundary.
      ratio: Math.min(Math.max(pos / size, 0.01), 0.99),
      title:
        title.length > TITLE_MAX_CHARS
          ? `${title.slice(0, TITLE_MAX_CHARS)}…`
          : title,
    });
    return false;
  });
  return entries;
}

/**
 * The dot's semantic state class, on the settled two-axis map:
 * CORE = where the round is in its lifecycle (hollow: empty vessel;
 * solid: being filled; bright: holds a result — done or errored).
 * MOTION = what's needed (still: nothing; body breathe: system busy;
 * emitted wave: a human must act — silenced by acting or by seeing).
 * Hover/press motion is reserved for interaction feedback, never state.
 */
export type DotCore =
  | "neutral" // settled and working states
  | "attention" // blocked on the user (permission, auth)
  | "error"
  | "fresh"; // done, result not yet seen

export type DotStateView = {
  core: DotCore;
  /** Phase description for the accessible name; the visuals carry it in
   *  the UI, so the tooltip never spells it out. */
  label: string | null;
  /** Background-colored punch in the bump's center — an empty vessel,
   *  nothing running (draft and waiting-to-run states). */
  hollow: boolean;
  /** Goo bump breathes (radius oscillation through the filter). */
  breathe: boolean;
  /** The hollow punch slowly pulses (waiting states). */
  pulse: boolean;
  /** Two-tone attention pulse: a bright core bubbling large and small
   *  inside the dot — the "needs a human" signal. */
  ping: boolean;
};

const QUIET: Omit<DotStateView, "core" | "label"> = {
  hollow: false,
  breathe: false,
  pulse: false,
  ping: false,
};

/**
 * Phase → visual treatment. Color only where it means something, motion
 * only for live states: waiting pulses, working breathes, blocked pings,
 * settled states hold still.
 */
export function describeDotState(
  phase: BlobPhase,
  {
    unseen,
    queueAhead,
    issue = false,
  }: { unseen: boolean; queueAhead: number; issue?: boolean },
): DotStateView {
  switch (phase) {
    case "composing":
      return { ...QUIET, core: "neutral", hollow: true, label: "Draft" };
    case "sending":
      return {
        ...QUIET,
        core: "neutral",
        hollow: true,
        pulse: true,
        label: "Sending…",
      };
    case "queued":
      return {
        ...QUIET,
        core: "neutral",
        hollow: true,
        pulse: true,
        label:
          queueAhead > 0 ? `Queued · ${queueAhead} ahead` : "Queued · next",
      };
    case "running":
      return { ...QUIET, core: "neutral", label: "Running", breathe: true };
    case "needs-permission":
      return {
        ...QUIET,
        core: "attention",
        label: "Needs permission",
        ping: true,
      };
    case "needs-auth":
      return {
        ...QUIET,
        core: "attention",
        label: "Needs sign-in",
        ping: true,
      };
    case "error":
      // Errors demand attention the same way blocked states do.
      return { ...QUIET, core: "error", label: "Failed", ping: true };
    case "done": {
      // An unread result needs attention too — it pulses until the user
      // has actually scrolled the widget into view. A turn that completed
      // but answered with an issue (widget_respond kind "issue", the
      // face's amber warning) holds a problematic result: error core.
      const label = issue ? "Done · issue" : "Done";
      if (unseen) {
        return {
          ...QUIET,
          core: issue ? "error" : "fresh",
          label: `${label} · unread`,
          ping: true,
        };
      }
      // Seen: a clean result decays to a bare dot; an issue keeps its
      // error core as a quiet, motionless marker.
      return { ...QUIET, core: issue ? "error" : "neutral", label };
    }
  }
}
