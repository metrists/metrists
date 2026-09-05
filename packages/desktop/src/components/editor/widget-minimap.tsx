/**
 * MET-172: a delicate map of the document's prompt widgets, rendered as a
 * vertical gooey rail along the editor's right edge. One dot per widget,
 * placed proportionally to the widget's position; each dot also carries
 * its widget's state: a crisp core colored by phase, breathing while the
 * turn runs, pinging when blocked on the user, and staying accented until
 * a finished result has actually been scrolled into view. Hovering a dot
 * swells it and shows the title plus a phase line; clicking jumps to the
 * widget (reusing jumpToBlob's scroll-and-flash).
 *
 * Everything is derived: positions from the live ProseMirror doc, titles
 * from the draft text or blob store, phases from the same rows the widget
 * face reads (`derivePhase`). No persistent state — "seen" for finished
 * rounds is session-scoped by design.
 */
import { useEffect, useId, useMemo, useReducer, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useLiveQuery, eq } from "@tanstack/react-db";
import {
  getPromptBlob,
  subscribePromptBlob,
  derivePhase,
  deriveQueuePosition,
  deriveWidgetResponse,
  type BlobPhase,
} from "@notefig/widgets";
import { sortEntriesChronologically } from "@notefig/shared/agent";
import {
  agentEntriesCollection,
  agentPermissionRequestsCollection,
  agentTasksCollection,
  agentTurnsCollection,
} from "@/agent/agent-collections";
import { jumpToBlob } from "./blobs/jump-to-blob";
import {
  deriveWidgetMapEntries,
  describeDotState,
  type WidgetMapEntry,
} from "./widget-minimap-state";
import "./widget-minimap.css";

export {
  deriveWidgetMapEntries,
  describeDotState,
  type WidgetMapEntry,
} from "./widget-minimap-state";

function useWidgetMapEntries(editor: Editor): WidgetMapEntry[] {
  const [entries, setEntries] = useState<WidgetMapEntry[]>(() =>
    deriveWidgetMapEntries(editor.state.doc),
  );
  useEffect(() => {
    let last = JSON.stringify(deriveWidgetMapEntries(editor.state.doc));
    const refresh = () => {
      const next = deriveWidgetMapEntries(editor.state.doc);
      const serialized = JSON.stringify(next);
      if (serialized === last) return;
      last = serialized;
      setEntries(next);
    };
    refresh();
    const onTransaction = ({
      transaction,
    }: {
      transaction: { docChanged: boolean };
    }) => {
      if (transaction.docChanged) refresh();
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);
  return entries;
}

type EntryLiveState = {
  phase: BlobPhase;
  queueAhead: number;
  /** Identity of the bound round, for session-scoped seen-tracking. */
  roundKey: string | null;
  /** Turn completed but answered with an issue (widget_respond). */
  issue: boolean;
};

const COMPOSING: EntryLiveState = {
  phase: "composing",
  queueAhead: 0,
  roundKey: null,
  issue: false,
};

/**
 * Each entry's phase, from the same rows the widget face reads. One bulk
 * subscription instead of per-dot queries: the agent collections are
 * session-scale, so filtering in JS is cheaper than N live queries.
 */
function useEntryLiveStates(
  entries: WidgetMapEntry[],
): Map<string, EntryLiveState> {
  const [tick, bump] = useReducer((c: number) => c + 1, 0);
  const blobIdsKey = entries
    .map((e) => e.blobId)
    .filter(Boolean)
    .join("|");
  useEffect(() => {
    const ids = blobIdsKey ? blobIdsKey.split("|") : [];
    const unsubscribes = ids.map((id) => subscribePromptBlob(id, bump));
    return () => unsubscribes.forEach((u) => u());
  }, [blobIdsKey]);

  const { data: turns = [] } = useLiveQuery((q) =>
    q.from({ turn: agentTurnsCollection }),
  );
  const { data: tasks = [] } = useLiveQuery((q) =>
    q.from({ task: agentTasksCollection }),
  );
  const { data: pendingPermissions = [] } = useLiveQuery((q) =>
    q
      .from({ req: agentPermissionRequestsCollection })
      .where(({ req }) => eq(req.status, "pending")),
  );
  const { data: allEntries = [] } = useLiveQuery((q) =>
    q.from({ entry: agentEntriesCollection }),
  );

  return useMemo(() => {
    void tick;
    const map = new Map<string, EntryLiveState>();
    for (const entry of entries) {
      if (!entry.blobId) {
        map.set(entry.key, COMPOSING);
        continue;
      }
      const record = getPromptBlob(entry.blobId);
      const turn = record.boundTurnId
        ? turns.find((t) => t.turnId === record.boundTurnId)
        : undefined;
      const task = record.boundTaskId
        ? tasks.find((t) => t.taskId === record.boundTaskId)
        : undefined;
      const hasPendingPermission =
        !!record.boundTaskId &&
        pendingPermissions.some((p) => p.taskId === record.boundTaskId);
      const phase = derivePhase({
        turn,
        task,
        hasPendingPermission,
        isSending: false,
      });
      // The face's amber warning: a completed turn whose widget_respond
      // answer is kind "issue". Derived only for done rounds — everything
      // else skips the transcript scan.
      const issue =
        phase === "done" && record.boundTurnId
          ? deriveWidgetResponse(
              sortEntriesChronologically(
                allEntries.filter((e) => e.turnId === record.boundTurnId),
              ),
            )?.kind === "issue"
          : false;
      map.set(entry.key, {
        phase,
        queueAhead:
          phase === "queued" && record.boundTurnId
            ? deriveQueuePosition(
                turns.filter((t) => t.taskId === record.boundTaskId),
                record.boundTurnId,
              )
            : 0,
        roundKey:
          turn && record.boundTurnId
            ? `${entry.blobId}:${record.boundTurnId}`
            : null,
        issue,
      });
    }
    return map;
  }, [entries, turns, tasks, pendingPermissions, allEntries, tick]);
}

/** Finished rounds whose widget the user has scrolled into view. Session-
 *  scoped on purpose: nothing persists, ids never recur (MET-172). */
const seenRounds = new Set<string>();

/**
 * Watches each done-but-unseen widget's element; when one becomes visible,
 * its round is marked seen and the dot decays from accent to plain.
 */
function useSeenRounds(
  entries: WidgetMapEntry[],
  liveStates: Map<string, EntryLiveState>,
  editor: Editor,
): void {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const roundByElement = new Map<Element, string>();
    for (const entry of entries) {
      const live = liveStates.get(entry.key);
      if (
        !entry.blobId ||
        live?.phase !== "done" ||
        !live.roundKey ||
        seenRounds.has(live.roundKey)
      )
        continue;
      const element = editor.view.dom.querySelector(
        `[data-blob-id="${CSS.escape(entry.blobId)}"]`,
      );
      if (element) roundByElement.set(element, live.roundKey);
    }
    if (roundByElement.size === 0) return;
    const observer = new IntersectionObserver(
      (observed) => {
        let marked = false;
        for (const o of observed) {
          const roundKey = roundByElement.get(o.target);
          if (o.isIntersecting && roundKey && !seenRounds.has(roundKey)) {
            seenRounds.add(roundKey);
            marked = true;
          }
        }
        if (marked) bump();
      },
      { threshold: 0.35 },
    );
    for (const element of roundByElement.keys()) observer.observe(element);
    return () => observer.disconnect();
  }, [entries, liveStates, editor]);
}

export function WidgetMinimap({
  editor,
  filePath,
}: {
  editor: Editor;
  filePath: string;
}) {
  const entries = useWidgetMapEntries(editor);
  const liveStates = useEntryLiveStates(entries);
  useSeenRounds(entries, liveStates, editor);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const gooId = useId();
  if (entries.length === 0) return null;

  const dots = entries.map((entry) => {
    const live = liveStates.get(entry.key) ?? COMPOSING;
    return {
      entry,
      view: describeDotState(live.phase, {
        unseen: live.roundKey ? !seenRounds.has(live.roundKey) : false,
        queueAhead: live.queueAhead,
        issue: live.issue,
      }),
    };
  });

  return (
    <nav
      className="group/map absolute right-4 top-6 z-10 h-28 max-h-[50%] w-3"
      aria-label="Prompt widgets in this document"
      data-widget-minimap
    >
      {/* Two visual layers in one svg, both monochrome — state speaks
          through form and motion only. The goo layer draws line and dots
          together under a gooey filter (blur + alpha contrast) so the line
          smoothly swells into each circle. The crisp layer above carries
          the semantics: hollow punches (empty vessels), a bright core
          bubbling large and small (attention), and a still bright core
          (unread result). The goo draws at full alpha — its math needs it
          — and fades via group opacity, which applies after the filter. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <filter id={gooId} x="-150%" y="-25%" width="400%" height="150%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="1.4"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>
        {/* Pulse underlay — svg paints in document order, so waves drawn
            here travel beneath the line and dots. One tempo for every
            call to action; an errored round's wave carries a super-muted
            error tint instead of the neutral bright. */}
        <g className="opacity-80 transition-opacity duration-200 group-hover/map:opacity-100">
          {dots.map(
            ({ entry, view }) =>
              view.ping && (
                <circle
                  key={entry.key}
                  cx="50%"
                  cy={`${entry.ratio * 100}%`}
                  className={
                    view.core === "error"
                      ? "fill-[color-mix(in_oklab,hsl(var(--destructive))_55%,hsl(var(--background)))]"
                      : "fill-foreground/70"
                  }
                  style={{
                    animation: "nf-minimap-bubble 1.8s infinite",
                  }}
                />
              ),
          )}
        </g>
        {/* Dimness comes from an opaque color-mix toward the background,
            NOT group opacity — translucent shapes would let the pulse
            underlay shine through instead of being occluded. */}
        <g
          filter={`url(#${gooId})`}
          className="text-[color-mix(in_oklab,hsl(var(--muted-foreground))_50%,hsl(var(--background)))] transition-colors duration-200 group-hover/map:text-[color-mix(in_oklab,hsl(var(--muted-foreground))_80%,hsl(var(--background)))]"
        >
          <line
            x1="50%"
            x2="50%"
            y1="0%"
            y2="100%"
            stroke="currentColor"
            strokeWidth="2"
          />
          {dots.map(({ entry, view }) => (
            <circle
              key={entry.key}
              cx="50%"
              cy={`${entry.ratio * 100}%`}
              fill="currentColor"
              // Geometry-as-CSS so the swell and breathe animate; the
              // hover swell suspends the breathe rather than fighting it.
              style={{
                r: hoveredKey === entry.key ? "6px" : "4px",
                transition: "r 150ms ease",
                animation:
                  view.breathe && hoveredKey !== entry.key
                    ? "nf-minimap-breathe 2.4s ease-in-out infinite"
                    : undefined,
              }}
            />
          ))}
        </g>
        <g className="opacity-80 transition-opacity duration-200 group-hover/map:opacity-100">
          {dots.map(({ entry, view }) => (
            <g key={entry.key}>
              {(view.core === "fresh" || view.core === "error") && (
                // The bright core marks a round that HOLDS a result —
                // done or errored. Mid-run blocks (permission, auth) wave
                // without one: they are interrupted runs, not outcomes.
                <circle
                  cx="50%"
                  cy={`${entry.ratio * 100}%`}
                  r="1.75"
                  className="fill-foreground/55"
                />
              )}
              {view.hollow && (
                <circle
                  cx="50%"
                  cy={`${entry.ratio * 100}%`}
                  r="1.75"
                  className={`fill-background${view.pulse ? " animate-pulse" : ""}`}
                />
              )}
            </g>
          ))}
        </g>
      </svg>
      <div className="relative h-full">
        {dots.map(({ entry, view }) => (
          <button
            key={entry.key}
            type="button"
            aria-label={`Jump to prompt: ${entry.title}${view.label ? ` (${view.label})` : ""}`}
            onClick={() => {
              if (entry.blobId) jumpToBlob(filePath, entry.blobId);
            }}
            onMouseEnter={() => setHoveredKey(entry.key)}
            onMouseLeave={() =>
              setHoveredKey((k) => (k === entry.key ? null : k))
            }
            // Invisible hit target over the drawn dot; the pill hangs off it.
            className="group/dot absolute left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ top: `${entry.ratio * 100}%` }}
          >
            <span className="pointer-events-none absolute right-full top-1/2 z-10 mr-1 hidden max-w-[14rem] -translate-y-1/2 truncate whitespace-nowrap rounded border border-border bg-popover px-1.5 py-0.5 text-[0.625rem] leading-tight text-muted-foreground shadow-sm group-hover/dot:block">
              {entry.title}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
