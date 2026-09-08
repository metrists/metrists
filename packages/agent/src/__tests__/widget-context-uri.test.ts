import { describe, it, expect } from "vitest";
import {
  encodeWidgetContextUri,
  decodeWidgetContextUri,
} from "../widget-context-uri";

describe("encodeWidgetContextUri / decodeWidgetContextUri", () => {
  it("round-trips a path and position", () => {
    const uri = encodeWidgetContextUri({ path: "notes.md", pos: 42 });
    expect(uri.startsWith("notefig://widget-context?")).toBe(true);
    expect(decodeWidgetContextUri(uri)).toEqual({ path: "notes.md", pos: 42 });
  });

  it("round-trips paths with characters that need escaping", () => {
    const uri = encodeWidgetContextUri({
      path: "some folder/a doc.md",
      pos: 7,
    });
    expect(decodeWidgetContextUri(uri)).toEqual({
      path: "some folder/a doc.md",
      pos: 7,
    });
  });

  it("round-trips a referenced from/to range, and omits it without one", () => {
    const withRange = encodeWidgetContextUri({
      path: "notes.md",
      pos: 42,
      selectedRange: { from: 4, to: 9 },
    });
    expect(decodeWidgetContextUri(withRange)).toEqual({
      path: "notes.md",
      pos: 42,
      selectedRange: { from: 4, to: 9 },
    });
    const without = encodeWidgetContextUri({ path: "notes.md", pos: 42 });
    expect(without).not.toContain("from");
    expect(decodeWidgetContextUri(without)).toEqual({
      path: "notes.md",
      pos: 42,
    });
  });

  it("drops a half-present or non-numeric range instead of failing", () => {
    expect(
      decodeWidgetContextUri("notefig://widget-context?path=a.md&pos=1&from=4"),
    ).toEqual({ path: "a.md", pos: 1 });
    expect(
      decodeWidgetContextUri(
        "notefig://widget-context?path=a.md&pos=1&from=4&to=x",
      ),
    ).toEqual({ path: "a.md", pos: 1 });
  });

  it("returns undefined for a uri outside the widget-context scheme", () => {
    expect(decodeWidgetContextUri("file:///ws/notes.md")).toBeUndefined();
  });

  it("returns undefined when the path param is missing", () => {
    expect(
      decodeWidgetContextUri("notefig://widget-context?pos=1"),
    ).toBeUndefined();
  });

  it("returns undefined when the pos param is missing", () => {
    expect(
      decodeWidgetContextUri("notefig://widget-context?path=notes.md"),
    ).toBeUndefined();
  });

  it("returns undefined when pos is not a finite number", () => {
    expect(
      decodeWidgetContextUri(
        "notefig://widget-context?path=notes.md&pos=not-a-number",
      ),
    ).toBeUndefined();
  });
});
