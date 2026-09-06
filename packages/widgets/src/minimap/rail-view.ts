/**
 * The minimap rail, as a ProseMirror plugin view — the UI lives inside the
 * editor, so registering the extension is the whole installation.
 *
 * Vanilla DOM by necessity (plugin views are imperative; Tiptap only
 * portals React into node views) and by fit: the rail is a projection with
 * a hover state, not an app surface. Tailwind's group-hover classes work
 * on plain elements, so the visual language is shared verbatim with the
 * rest of the package.
 *
 * Layout: the rail mounts inside the editor's scroll container through a
 * zero-height `position: sticky` host, so it stays pinned near the
 * viewport's top-right while the document scrolls beneath it — no wrapper
 * or mount point required from the application.
 *
 * Rendering: three svg groups in paint order — the pulse underlay (waves
 * travel beneath everything), the gooey layer (line + bumps under a
 * blur + alpha-contrast filter; opaque, dimmed via color-mix so it
 * occludes the underlay), and the crisp overlay (hollow punches, bright
 * cores). A plain button layer above carries hover, click, tooltip, aria.
 */
import type { EditorView } from "@tiptap/pm/view";
import type { PluginView } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  MINIMAP_STILL_DOT,
  deriveMinimapEntries,
  type MinimapDotState,
  type MinimapEntry,
  type MinimapObserver,
  type MinimapSource,
} from "./contract";

const SVG_NS = "http://www.w3.org/2000/svg";

const GOO_LAYER_CLASS =
  "text-[color-mix(in_oklab,hsl(var(--muted-foreground))_50%,hsl(var(--background)))] transition-colors duration-200 group-hover/map:text-[color-mix(in_oklab,hsl(var(--muted-foreground))_80%,hsl(var(--background)))]";
const SIDE_LAYER_CLASS =
  "opacity-80 transition-opacity duration-200 group-hover/map:opacity-100";
const NEUTRAL_WAVE_CLASS = "fill-foreground/70";
const ERROR_WAVE_CLASS =
  "fill-[color-mix(in_oklab,hsl(var(--destructive))_55%,hsl(var(--background)))]";
const TOOLTIP_CLASS =
  "pointer-events-none absolute right-full top-1/2 z-10 mr-1 hidden max-w-[14rem] -translate-y-1/2 truncate whitespace-nowrap rounded border border-border bg-popover px-1.5 py-0.5 text-[0.625rem] leading-tight text-muted-foreground shadow-sm group-hover/dot:block";
const BUTTON_CLASS =
  "group/dot absolute left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0";

let nextFilterId = 0;

type Dot = {
  entry: MinimapEntry;
  state: MinimapDotState;
  hovered: boolean;
  bump: SVGCircleElement;
  wave: SVGCircleElement;
  core: SVGCircleElement;
  punch: SVGCircleElement;
  button: HTMLButtonElement;
  tooltip: HTMLSpanElement;
};

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

/** The nearest scrollable ancestor — where the sticky host must live. */
function findScroller(from: HTMLElement): HTMLElement {
  let el: HTMLElement | null = from.parentElement;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return from.parentElement ?? from;
}

export class MinimapRailView implements PluginView {
  private readonly view: EditorView;
  private readonly sources: Record<string, MinimapSource>;
  private readonly stickyHost: HTMLDivElement;
  private readonly nav: HTMLElement;
  private readonly underlay: SVGGElement;
  private readonly goo: SVGGElement;
  private readonly overlay: SVGGElement;
  private readonly buttons: HTMLDivElement;
  private dots: Dot[] = [];
  private observers = new Map<string, MinimapObserver>();
  private lastSerialized = "";

  constructor(view: EditorView, sources: Record<string, MinimapSource>) {
    this.view = view;
    this.sources = sources;

    this.stickyHost = document.createElement("div");
    // Zero-height sticky overlay: pinned to the scrollport, no layout cost.
    this.stickyHost.style.cssText =
      "position:sticky;top:0;height:0;overflow:visible;z-index:10;";

    this.nav = document.createElement("nav");
    this.nav.setAttribute("data-widget-minimap", "");
    this.nav.setAttribute("aria-label", "Prompt widgets in this document");
    this.nav.className = "group/map absolute right-2 top-6 h-28 w-3";
    this.nav.hidden = true;

    const svg = svgEl("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute(
      "class",
      "pointer-events-none absolute inset-0 h-full w-full overflow-visible",
    );

    const filterId = `nf-minimap-goo-${nextFilterId++}`;
    const defs = svgEl("defs");
    const filter = svgEl("filter");
    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-150%");
    filter.setAttribute("y", "-25%");
    filter.setAttribute("width", "400%");
    filter.setAttribute("height", "150%");
    const blur = svgEl("feGaussianBlur");
    blur.setAttribute("in", "SourceGraphic");
    blur.setAttribute("stdDeviation", "1.4");
    blur.setAttribute("result", "blur");
    const matrix = svgEl("feColorMatrix");
    matrix.setAttribute("in", "blur");
    matrix.setAttribute("mode", "matrix");
    matrix.setAttribute(
      "values",
      "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7",
    );
    filter.append(blur, matrix);
    defs.append(filter);

    this.underlay = svgEl("g");
    this.underlay.setAttribute("class", SIDE_LAYER_CLASS);
    this.goo = svgEl("g");
    this.goo.setAttribute("filter", `url(#${filterId})`);
    this.goo.setAttribute("class", GOO_LAYER_CLASS);
    const line = svgEl("line");
    line.setAttribute("x1", "50%");
    line.setAttribute("x2", "50%");
    line.setAttribute("y1", "0%");
    line.setAttribute("y2", "100%");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "2");
    this.goo.append(line);
    this.overlay = svgEl("g");
    this.overlay.setAttribute("class", SIDE_LAYER_CLASS);
    svg.append(defs, this.underlay, this.goo, this.overlay);

    this.buttons = document.createElement("div");
    this.buttons.className = "relative h-full";

    this.nav.append(svg, this.buttons);
    this.stickyHost.append(this.nav);
    const scroller = findScroller(view.dom);
    scroller.insertBefore(this.stickyHost, scroller.firstChild);

    this.render();
  }

  update(): void {
    this.render();
  }

  destroy(): void {
    for (const observer of this.observers.values()) observer.destroy();
    this.observers.clear();
    this.stickyHost.remove();
  }

  private render(): void {
    const entries = deriveMinimapEntries(this.view.state.doc, this.sources);
    const serialized = JSON.stringify(entries);
    if (serialized === this.lastSerialized) return;
    this.lastSerialized = serialized;

    this.nav.hidden = entries.length === 0;
    this.reconcileDots(entries);
    this.syncObservers(entries);
    // A created dot for an already-observed identity (a duplicated marker)
    // starts still — pull every observer's current state onto its dots.
    for (const key of this.observers.keys()) this.applyObserver(key);
  }

  /**
   * Reconcile dots against the new entries, reusing DOM per identity
   * (observerKey, disambiguated per duplicate occurrence). Reuse is what
   * keeps CSS animations running: entries change on every document edit
   * (ratios shift with doc size), and a recreated element restarts its
   * animation from frame zero — a streaming agent turn would freeze every
   * breathing and pulsing dot at its first frame.
   */
  private reconcileDots(entries: MinimapEntry[]): void {
    const occurrence = new Map<string, number>();
    const reuseKeyOf = (observerKey: string) => {
      const n = occurrence.get(observerKey) ?? 0;
      occurrence.set(observerKey, n + 1);
      return `${observerKey}#${n}`;
    };
    const existing = new Map<string, Dot>();
    {
      const counts = new Map<string, number>();
      for (const dot of this.dots) {
        const n = counts.get(dot.entry.observerKey) ?? 0;
        counts.set(dot.entry.observerKey, n + 1);
        existing.set(`${dot.entry.observerKey}#${n}`, dot);
      }
    }

    const next: Dot[] = entries.map((entry) => {
      const key = reuseKeyOf(entry.observerKey);
      const reused = existing.get(key);
      if (reused) {
        existing.delete(key);
        return this.moveDot(reused, entry);
      }
      return this.createDot(entry);
    });

    // Anything not reused is gone from the document.
    const kept = new Set(next);
    for (const dot of this.dots) {
      if (kept.has(dot)) continue;
      dot.bump.remove();
      dot.wave.remove();
      dot.core.remove();
      dot.punch.remove();
      dot.button.remove();
    }
    this.dots = next;
  }

  /** Update a surviving dot's position and title in place — the DOM nodes
   *  (and their running animations) are untouched. */
  private moveDot(dot: Dot, entry: MinimapEntry): Dot {
    const y = `${entry.ratio * 100}%`;
    dot.entry = entry;
    for (const circle of [dot.bump, dot.wave, dot.core, dot.punch]) {
      circle.setAttribute("cy", y);
    }
    dot.button.style.top = y;
    dot.tooltip.textContent = entry.title;
    this.applyState(dot);
    return dot;
  }

  private createDot(entry: MinimapEntry): Dot {
    const y = `${entry.ratio * 100}%`;

    const bump = svgEl("circle");
    bump.setAttribute("cx", "50%");
    bump.setAttribute("cy", y);
    bump.setAttribute("fill", "currentColor");
    this.goo.append(bump);

    const wave = svgEl("circle");
    wave.setAttribute("cx", "50%");
    wave.setAttribute("cy", y);
    wave.style.animation = "nf-minimap-bubble 1.8s infinite";
    this.underlay.append(wave);

    const core = svgEl("circle");
    core.setAttribute("cx", "50%");
    core.setAttribute("cy", y);
    core.setAttribute("r", "1.75");
    core.setAttribute("class", "fill-foreground/55");
    this.overlay.append(core);

    const punch = svgEl("circle");
    punch.setAttribute("cx", "50%");
    punch.setAttribute("cy", y);
    punch.setAttribute("r", "1.75");
    this.overlay.append(punch);

    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.style.top = y;
    const tooltip = document.createElement("span");
    tooltip.className = TOOLTIP_CLASS;
    tooltip.textContent = entry.title;
    button.append(tooltip);
    this.buttons.append(button);

    const dot: Dot = {
      entry,
      state: MINIMAP_STILL_DOT,
      hovered: false,
      bump,
      wave,
      core,
      punch,
      button,
      tooltip,
    };
    button.addEventListener("mouseenter", () => {
      dot.hovered = true;
      this.applyState(dot);
    });
    button.addEventListener("mouseleave", () => {
      dot.hovered = false;
      this.applyState(dot);
    });
    button.addEventListener("click", () => this.jumpTo(dot));
    this.applyState(dot);
    return dot;
  }

  /** One observer per identity; duplicated markers share their dot state. */
  private syncObservers(entries: MinimapEntry[]): void {
    const wanted = new Set(entries.map((e) => e.observerKey));
    for (const [key, observer] of this.observers) {
      if (!wanted.has(key)) {
        observer.destroy();
        this.observers.delete(key);
      }
    }
    for (const entry of entries) {
      if (this.observers.has(entry.observerKey)) continue;
      const source = this.sources[entry.nodeTypeName];
      if (!source.observe) continue;
      const handle = {
        getNode: (): PMNode | null => this.currentNode(entry.observerKey),
        getElement: (): HTMLElement | null => {
          const dot = this.dots.find(
            (d) => d.entry.observerKey === entry.observerKey,
          );
          if (!dot) return null;
          const dom = this.view.nodeDOM(dot.entry.pos);
          return dom instanceof HTMLElement ? dom : null;
        },
      };
      const key = entry.observerKey;
      const observer = source.observe(handle, () => this.applyObserver(key));
      this.observers.set(key, observer);
      this.applyObserver(key);
    }
  }

  private currentNode(observerKey: string): PMNode | null {
    const dot = this.dots.find((d) => d.entry.observerKey === observerKey);
    if (!dot) return null;
    return this.view.state.doc.nodeAt(dot.entry.pos);
  }

  private applyObserver(observerKey: string): void {
    const observer = this.observers.get(observerKey);
    if (!observer) return;
    const state = observer.get();
    for (const dot of this.dots) {
      if (dot.entry.observerKey !== observerKey) continue;
      dot.state = state;
      this.applyState(dot);
    }
  }

  private applyState(dot: Dot): void {
    const { state, hovered } = dot;

    dot.bump.style.r = hovered ? "6px" : "4px";
    dot.bump.style.transition = "r 150ms ease";
    dot.bump.style.animation =
      state.breathe && !hovered
        ? "nf-minimap-breathe 2.4s ease-in-out infinite"
        : "";

    const showWave = state.ping;
    dot.wave.style.display = showWave ? "" : "none";
    dot.wave.setAttribute(
      "class",
      state.core === "error" ? ERROR_WAVE_CLASS : NEUTRAL_WAVE_CLASS,
    );

    const showCore = state.core === "fresh" || state.core === "error";
    dot.core.style.display = showCore ? "" : "none";

    dot.punch.style.display = state.hollow ? "" : "none";
    dot.punch.setAttribute(
      "class",
      `fill-background${state.pulse ? " animate-pulse" : ""}`,
    );

    dot.button.setAttribute(
      "aria-label",
      `Jump to prompt: ${dot.entry.title}${state.label ? ` (${state.label})` : ""}`,
    );
  }

  private jumpTo(dot: Dot): void {
    const dom = this.view.nodeDOM(dot.entry.pos);
    if (dom instanceof HTMLElement) {
      dom.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
}
