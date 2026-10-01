/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareLoadingView from "@/components/ShareView/ShareLoadingView";

describe("ShareLoadingView", () => {
  it.each([
    ["loading message", "Güvenli Klinik Rapor Yükleniyor..."],
    ["brand letter icon", "P"],
  ])("renders %s correctly", (_label, expectedText) => {
    render(<ShareLoadingView />);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it("renders animated spinner element", () => {
    const { container } = render(<ShareLoadingView />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("rounded-full", "h-12", "w-12", "border-indigo-500");
  });

  it("renders with proper full-screen container layout styles", () => {
    const { container } = render(<ShareLoadingView />);

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass(
      "min-h-screen",
      "bg-slate-950",
      "text-slate-100",
      "flex",
      "flex-col",
      "items-center",
      "justify-center"
    );
  });
});
