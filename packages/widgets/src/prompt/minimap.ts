/**
 * The prompt widget's minimap declaration (MET-172): what its dot says.
 * The generic rail (../minimap) owns how dots look; this module maps the
 * widget's phase onto the two-axis vocabulary and keeps it live.
 *
 * Live rows arrive through a registered observer factory rather than the
 * React host: the minimap is a ProseMirror plugin view, constructed
 * outside React with no host in scope — the same seam, for the same
 * reason, as the mention suggestion's `registerMentionService`. The app
 * registers the factory once at editor setup; before registration (or in
 * schema-only editors) every dot degrades to a composing draft.
 */
import type { Node as PMNode } from "@tiptap/pm/model";
import type {
  AgentEntry,
  AgentTaskRow,
  AgentTurn,
} from "@notefig/shared/agent";
import { sortEntriesChronologically } from "@notefig/shared/agent";
import type {
  MinimapDotState,
  MinimapObserveHandle,
  MinimapObserver,
  MinimapSource,
} from "../minimap/contract";
import {
  derivePhase,
  deriveQueuePosition,
  deriveWidgetResponse,
  type BlobPhase,
} from "./state";
import { getPromptBlob, subscribePromptBlob } from "./store";

// ── the app-registered live-rows seam ─────────────────────────────────

export type PromptRoundSnapshot = {
  turn: AgentTurn | undefined;
  task: AgentTaskRow | undefined;
  /** Every turn on the bound task — for the queue-position readout. */
  taskTurns: AgentTurn[];
  hasPendingPermission: boolean;
  /** The bound turn's transcript, for the widget_respond issue flag. */
  entries: AgentEntry[];
};

export type PromptRoundObservation = {
  get(): PromptRoundSnapshot;
  destroy(): void;
};

export type PromptRoundObserverFactory = (
  args: { turnId: string | null; taskId: string | null },
  onChange: () => void,
) => PromptRoundObservation;

let roundObserverFactory: PromptRoundObserverFactory | null = null;

/** @returns the unregistration, mirroring `registerMentionService`. */
export function registerPromptRoundObserver(
  factory: PromptRoundObserverFactory,
): () => void {
  roundObserverFactory = factory;
  return () => {
    if (roundObserverFactory === factory) roundObserverFactory = null;
  };
}

// ── phase → dot state (the settled two-axis map) ──────────────────────

const QUIET: Omit<MinimapDotState, "core" | "label"> = {
  hollow: false,
  breathe: false,
  pulse: false,
  ping: false,
};

/**
 * Phase → visual treatment. Color only where it means something, motion
 * only for live states: waiting pulses, working breathes, states blocked
 * on a human wave — including a completed turn nobody has looked at.
 */
export function describeDotState(
  phase: BlobPhase,
  {
    unseen,
    queueAhead,
    issue = false,
  }: { unseen: boolean; queueAhead: number; issue?: boolean },
): MinimapDotState {
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

/** A completed turn whose widget_respond answer flags an issue. */
function roundHasIssue(
  snapshot: PromptRoundSnapshot | undefined,
  phase: BlobPhase,
): boolean {
  if (phase !== "done" || !snapshot) return false;
  const response = deriveWidgetResponse(
    sortEntriesChronologically(snapshot.entries),
  );
  return response?.kind === "issue";
}

function queuedBehind(
  snapshot: PromptRoundSnapshot | undefined,
  phase: BlobPhase,
  boundTurnId: string | null,
): number {
  if (phase !== "queued" || !boundTurnId || !snapshot) return 0;
  return deriveQueuePosition(snapshot.taskTurns, boundTurnId);
}

/** The dot's inputs, derived from one round snapshot. Pure — recompute
 *  just applies it and manages the visibility watcher. */
function deriveDotInputs(
  snapshot: PromptRoundSnapshot | undefined,
  blobId: string | null,
  boundTurnId: string | null,
): {
  phase: BlobPhase;
  roundKey: string | null;
  unseen: boolean;
  queueAhead: number;
  issue: boolean;
} {
  const phase = derivePhase({
    turn: snapshot?.turn,
    task: snapshot?.task,
    hasPendingPermission: snapshot?.hasPendingPermission ?? false,
    isSending: false,
  });
  const roundKey =
    snapshot?.turn && blobId ? `${blobId}:${snapshot.turn.turnId}` : null;
  return {
    phase,
    roundKey,
    unseen: roundKey ? !seenRounds.has(roundKey) : false,
    queueAhead: queuedBehind(snapshot, phase, boundTurnId),
    issue: roundHasIssue(snapshot, phase),
  };
}

// ── the source ────────────────────────────────────────────────────────

/** Finished rounds whose widget the user has scrolled into view. Session-
 *  scoped on purpose: nothing persists, ids never recur. */
const seenRounds = new Set<string>();

function promptEntry(node: PMNode): { id?: string; title: string } | null {
  const blobId = (node.attrs.blobId as string | null) ?? null;
  const draftText = node.firstChild?.textContent.trim() ?? "";
  const title =
    draftText ||
    (blobId ? getPromptBlob(blobId).lastSentPrompt.trim() : "") ||
    "Prompt";
  return { id: blobId ?? undefined, title };
}

function observePrompt(
  handle: MinimapObserveHandle,
  onChange: () => void,
): MinimapObserver {
  const blobId = (handle.getNode()?.attrs.blobId as string | null) ?? null;
  let current = describeDotState("composing", { unseen: false, queueAhead: 0 });
  let round: PromptRoundObservation | null = null;
  let boundTurnId: string | null = null;
  let boundTaskId: string | null = null;
  let intersection: IntersectionObserver | null = null;
  let destroyed = false;

  const stopWatchingVisibility = () => {
    intersection?.disconnect();
    intersection = null;
  };

  const watchVisibility = (roundKey: string) => {
    if (intersection || typeof IntersectionObserver === "undefined") return;
    const element = handle.getElement();
    if (!element) return;
    intersection = new IntersectionObserver(
      (observed) => {
        if (!observed.some((o) => o.isIntersecting)) return;
        seenRounds.add(roundKey);
        stopWatchingVisibility();
        recompute();
      },
      { threshold: 0.35 },
    );
    intersection.observe(element);
  };

  const recompute = () => {
    if (destroyed) return;
    const inputs = deriveDotInputs(round?.get(), blobId, boundTurnId);
    current = describeDotState(inputs.phase, inputs);
    if (inputs.phase === "done" && inputs.unseen && inputs.roundKey) {
      watchVisibility(inputs.roundKey);
    } else {
      stopWatchingVisibility();
    }
    onChange();
  };

  /** (Re)build the round observation for the blob's current binding. */
  const bindRound = () => {
    const record = blobId ? getPromptBlob(blobId) : null;
    const turnId = record?.boundTurnId ?? null;
    const taskId = record?.boundTaskId ?? null;
    if (turnId === boundTurnId && taskId === boundTaskId && round) return;
    boundTurnId = turnId;
    boundTaskId = taskId;
    round?.destroy();
    round = roundObserverFactory
      ? roundObserverFactory({ turnId, taskId }, recompute)
      : null;
    recompute();
  };

  const unsubscribeBlob = blobId
    ? subscribePromptBlob(blobId, bindRound)
    : null;
  bindRound();

  return {
    get: () => current,
    destroy() {
      destroyed = true;
      unsubscribeBlob?.();
      round?.destroy();
      stopWatchingVisibility();
    },
  };
}

export const promptMinimapSource: MinimapSource = {
  entry: promptEntry,
  observe: observePrompt,
};
