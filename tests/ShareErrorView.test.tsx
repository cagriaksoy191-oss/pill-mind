/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareErrorView from "@/components/ShareView/ShareErrorView";

describe("ShareErrorView", () => {
  it("renders expired link view when statusCode is 410", () => {
    render(<ShareErrorView statusCode={410} />);

    expect(screen.getByText("Bağlantı Süresi Dolmuş")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Hekim güvenliği ve veri gizliliği \(KVKK\/GDPR\) nedeniyle paylaşılan ilaç raporları 24 saat sonra otomatik olarak silinir\./i
      )
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Yeni İlaç Kutusu Oluştur/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/kontrol");

    // Verify Disclaimer is present
    expect(screen.getByText(/PillMind bir bilgilendirme aracıdır\./i)).toBeInTheDocument();
  });

  it("renders share not found view when statusCode is not 410 (e.g., 404)", () => {
    render(<ShareErrorView statusCode={404} />);

    expect(screen.getByText("Paylaşım Bulunamadı")).toBeInTheDocument();
    expect(
      screen.getByText(
        /İstediğiniz güvenli rapor bağlantısı mevcut değil veya sistem yöneticisi tarafından kaldırılmış olabilir\./i
      )
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Yeni İlaç Kutusu Oluştur/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/kontrol");

    // Verify Disclaimer is present
    expect(screen.getByText(/PillMind bir bilgilendirme aracıdır\./i)).toBeInTheDocument();
  });
});
