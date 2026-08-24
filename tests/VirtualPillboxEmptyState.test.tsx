/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VirtualPillboxEmptyState } from "@/components/VirtualPillboxEmptyState";

describe("VirtualPillboxEmptyState", () => {
  it("renders empty state message and pill emoji", () => {
    render(<VirtualPillboxEmptyState />);

    expect(screen.getByText("💊")).toBeInTheDocument();
    expect(
      screen.getByText(/Kutunuz şu an boş. Üst kısımdan ilaç arayıp ekleyerek anında tarama başlatabilirsiniz./i)
    ).toBeInTheDocument();
  });
});
