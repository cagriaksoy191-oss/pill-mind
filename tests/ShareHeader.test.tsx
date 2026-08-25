/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareHeader from "@/components/ShareView/ShareHeader";

describe("ShareHeader", () => {
  it("renders the branding logo, title, and read-only badge", () => {
    render(<ShareHeader onPrint={jest.fn()} />);

    expect(screen.getByText("PillMind")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("Salt Okunur")).toBeInTheDocument();
  });

  it("renders the print button and home link", () => {
    render(<ShareHeader onPrint={jest.fn()} />);

    const printButton = screen.getByRole("button", { name: /Yazdır \/ PDF/i });
    expect(printButton).toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: /Kendi Kunu Kontrol Et/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("calls onPrint handler when print button is clicked", () => {
    const handlePrint = jest.fn();
    render(<ShareHeader onPrint={handlePrint} />);

    const printButton = screen.getByRole("button", { name: /Yazdır \/ PDF/i });
    fireEvent.click(printButton);

    expect(handlePrint).toHaveBeenCalledTimes(1);
  });
});
