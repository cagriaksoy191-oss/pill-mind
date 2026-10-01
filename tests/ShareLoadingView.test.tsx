/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareLoadingView from "@/components/ShareView/ShareLoadingView";

describe("ShareLoadingView", () => {
  it("renders loading message and spinner element", () => {
    const { container } = render(<ShareLoadingView />);

    expect(screen.getByText("Güvenli Klinik Rapor Yükleniyor...")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders with proper container layout styles", () => {
    const { container } = render(<ShareLoadingView />);

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass("min-h-screen", "bg-slate-950", "flex", "flex-col", "items-center", "justify-center");
  });
});
