/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VirtualPillboxHeader } from "@/components/VirtualPillboxHeader";

describe("VirtualPillboxHeader", () => {
  it("renders active drug count and hides scan badge when drug count is 0", () => {
    render(<VirtualPillboxHeader drugCount={0} />);

    expect(screen.getByText(/Sanal İlaç Kutusu/i)).toBeInTheDocument();
    expect(screen.getByText("0 Aktif İlaç")).toBeInTheDocument();
    expect(screen.queryByText("Klinik Tarama Aktif")).not.toBeInTheDocument();
  });

  it("renders active drug count and shows scan badge when drug count > 0", () => {
    render(<VirtualPillboxHeader drugCount={3} />);

    expect(screen.getByText("3 Aktif İlaç")).toBeInTheDocument();
    expect(screen.getByText("Klinik Tarama Aktif")).toBeInTheDocument();
  });
});
