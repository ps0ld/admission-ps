import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { CompareProvider } from "../lib/compare";
import type { CollegeSummary } from "../lib/types";
import { CollegeCard } from "./CollegeCard";

const college: CollegeSummary = {
  id: 1,
  slug: "indian-institute-of-technology-madras-chennai",
  name: "Indian Institute of Technology Madras",
  short_name: "IIT Madras",
  state: "Tamil Nadu",
  city: "Chennai",
  institution_type: "IIT",
  ownership: "Government",
  website: "https://www.iitm.ac.in",
  admission_url: "https://josaa.nic.in",
  entrance_exams: ["JEE Advanced"],
  admission_routes: ["JEE Advanced via JoSAA"],
  verification_status: "unverified",
  last_verified_on: null,
};

function setup() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <CollegeCard college={college} />
      </CompareProvider>
    </MemoryRouter>,
  );
}

describe("CollegeCard", () => {
  beforeEach(() => localStorage.clear());

  it("shows the college, its location and an honest verification stamp", () => {
    setup();
    expect(screen.getByRole("heading", { name: college.name })).toBeInTheDocument();
    expect(screen.getByText("Chennai, Tamil Nadu")).toBeInTheDocument();
    expect(screen.getByText("Not yet verified")).toBeInTheDocument();
  });

  it("never invents fees or admission chances", () => {
    setup();
    expect(screen.getByText("Not verified yet")).toBeInTheDocument();
    expect(screen.getByText("Insufficient data")).toBeInTheDocument();
  });

  it("opens official links in a new tab safely", () => {
    setup();
    const link = screen.getByRole("link", { name: /iitm\.ac\.in/ });
    expect(link).toHaveAttribute("href", "https://www.iitm.ac.in");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("toggles comparison selection", async () => {
    setup();
    const button = screen.getByRole("button", { name: /compare/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: /added/i })).toHaveAttribute("aria-pressed", "true");
  });
});
