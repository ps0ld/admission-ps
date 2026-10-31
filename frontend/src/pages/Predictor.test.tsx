import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { FinderResponse } from "../lib/types";
import Predictor from "./Predictor";

vi.mock("../lib/api", () => ({
  api: {
    facets: vi.fn().mockResolvedValue({
      states: [{ value: "Karnataka", count: 3 }],
      institution_types: [],
      ownerships: [],
      exams: [],
    }),
    recommend: vi.fn(),
  },
}));

const RESPONSE: FinderResponse = {
  count: 1,
  note: "",
  results: [
    {
      slug: "test-institute-bengaluru",
      name: "Test Institute of Technology",
      city: "Bengaluru",
      state: "Karnataka",
      ownership: "Private",
      website: "https://example.edu",
      admission_url: null,
      verification_status: "unverified",
      status: "eligible",
      reason: "Meets the minimum percentage.",
      courses: [],
    },
  ],
};

function setup() {
  render(
    <MemoryRouter>
      <Predictor />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("Predictor", () => {
  beforeEach(() => {
    vi.mocked(api.recommend).mockReset();
  });

  it("shows the eligibility disclaimer", () => {
    setup();
    expect(screen.getAllByText(/not admission probability/i).length).toBeGreaterThan(0);
  });

  it("shows only the fields that belong to the chosen qualification", async () => {
    const user = setup();
    expect(screen.getByLabelText(/10th percentage/i)).toBeTruthy();
    expect(screen.getByLabelText(/12th percentage/i)).toBeTruthy();
    expect(screen.queryByLabelText(/diploma percentage/i)).toBeNull();

    await user.click(screen.getByRole("radio", { name: /diploma/i }));
    expect(screen.getByLabelText(/diploma percentage/i)).toBeTruthy();
    expect(screen.queryByLabelText(/12th percentage/i)).toBeNull();
    expect(screen.queryByLabelText(/10th percentage/i)).toBeNull();
  });

  it("does not call the API when required fields are empty", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /find colleges/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/10th percentage/i);
    expect(api.recommend).not.toHaveBeenCalled();
  });

  it("rejects a percentage above 100", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /10th pass/i }));
    await user.type(screen.getByLabelText(/10th percentage/i), "101");
    await user.click(screen.getByRole("button", { name: /find colleges/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/0 to 100/);
    expect(api.recommend).not.toHaveBeenCalled();
  });

  it("sends only the relevant fields and shows the result card", async () => {
    vi.mocked(api.recommend).mockResolvedValue(RESPONSE);
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /10th pass/i }));
    await user.type(screen.getByLabelText(/10th percentage/i), "75");
    await user.click(screen.getByRole("button", { name: /find colleges/i }));

    expect(await screen.findByText("Test Institute of Technology")).toBeTruthy();
    expect(screen.getAllByText("Eligible").length).toBeGreaterThan(0);
    expect(api.recommend).toHaveBeenCalledWith({ qualification: "10th", percentage_10: 75 }, expect.anything());
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(api.recommend).mockRejectedValue(new Error("The server had a problem."));
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /10th pass/i }));
    await user.type(screen.getByLabelText(/10th percentage/i), "75");
    await user.click(screen.getByRole("button", { name: /find colleges/i }));
    expect(await screen.findByText(/server had a problem/i)).toBeTruthy();
  });
});
