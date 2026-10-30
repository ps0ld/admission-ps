import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { CompareProvider, MAX_COMPARE, useCompare } from "./compare";

const wrapper = ({ children }: { children: ReactNode }) => <CompareProvider>{children}</CompareProvider>;

describe("compare list", () => {
  beforeEach(() => localStorage.clear());

  it("adds, removes and reports when full", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    for (let i = 0; i < MAX_COMPARE; i++) {
      act(() => {
        result.current.toggle(`college-${i}`);
      });
    }
    expect(result.current.slugs).toHaveLength(MAX_COMPARE);

    let outcome = "";
    act(() => {
      outcome = result.current.toggle("one-too-many");
    });
    expect(outcome).toBe("full");
    expect(result.current.slugs).not.toContain("one-too-many");

    act(() => {
      result.current.toggle("college-0");
    });
    expect(result.current.has("college-0")).toBe(false);
  });

  it("restores the list from storage and ignores corrupt data", () => {
    localStorage.setItem("admission-ps:compare", JSON.stringify(["a", "b"]));
    const { result } = renderHook(() => useCompare(), { wrapper });
    expect(result.current.slugs).toEqual(["a", "b"]);

    localStorage.setItem("admission-ps:compare", "{not json");
    const again = renderHook(() => useCompare(), { wrapper });
    expect(again.result.current.slugs).toEqual([]);
  });
});
