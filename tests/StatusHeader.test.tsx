/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import StatusHeader from "../components/StatusHeader";
import { CheckResult } from "../lib/interactions";

// Mock child components and next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="mock-link">
      {children}
    </a>
  );
});

jest.mock("../components/UserPanel", () => {
  return function MockUserPanel() {
    return <div data-testid="mock-user-panel">UserPanel</div>;
  };
});

describe("StatusHeader Component", () => {
  // Mock window.matchMedia globally for all tests
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  const defaultProps = {
    selectedDrugIds: [],
    isChecking: false,
    interactions: [],
    onLoadPillbox: jest.fn(),
  };

  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();
    localStorage.clear();
    // Clear dark mode classes that might persist between tests
    document.documentElement.classList.remove("dark");
  });

  it("renders correctly with default props", () => {
    render(<StatusHeader {...defaultProps} />);
    expect(screen.getByText("PillMind")).toBeInTheDocument();
    expect(screen.getByText("Portal")).toBeInTheDocument();
    expect(screen.getByText("Ana Sayfa")).toBeInTheDocument();
    expect(screen.getByTestId("mock-user-panel")).toBeInTheDocument();
  });

  describe("Status Labels", () => {
    it("shows 'İlaç Bekleniyor' when no drugs are selected", () => {
      render(<StatusHeader {...defaultProps} selectedDrugIds={[]} />);
      expect(screen.getByText("İlaç Bekleniyor")).toBeInTheDocument();
    });

    it("shows 'İkinci İlaç Bekleniyor' when one drug is selected", () => {
      render(<StatusHeader {...defaultProps} selectedDrugIds={["drug1"]} />);
      expect(screen.getByText("İkinci İlaç Bekleniyor")).toBeInTheDocument();
    });

    it("shows 'Taranıyor...' when isChecking is true", () => {
      render(
        <StatusHeader
          {...defaultProps}
          selectedDrugIds={["drug1", "drug2"]}
          isChecking={true}
        />
      );
      expect(screen.getByText("Taranıyor...")).toBeInTheDocument();
    });

    it("shows 'Temiz Rapor (Etkileşim Saptanmadı)' when 2 drugs are selected and no interactions", () => {
      render(
        <StatusHeader
          {...defaultProps}
          selectedDrugIds={["drug1", "drug2"]}
          interactions={[]}
        />
      );
      expect(screen.getByText("Temiz Rapor (Etkileşim Saptanmadı)")).toBeInTheDocument();
    });

    it("shows 'Klinik Etkileşim Tespit Edildi' for moderate severity interactions", () => {
      const mockInteractions: CheckResult[] = [
        {
          drugs: ["drug1", "drug2"],
          interaction: {
            id: "int1",
            severity: "moderate",
            description: "Test description",
          },
        },
      ];
      render(
        <StatusHeader
          {...defaultProps}
          selectedDrugIds={["drug1", "drug2"]}
          interactions={mockInteractions}
        />
      );
      expect(screen.getByText("Klinik Etkileşim Tespit Edildi")).toBeInTheDocument();
    });

    it("shows 'Potansiyel Ciddi Etkileşim!' for high severity interactions", () => {
      const mockInteractions: CheckResult[] = [
        {
          drugs: ["drug1", "drug2"],
          interaction: {
            id: "int1",
            severity: "high",
            description: "Test description",
          },
        },
      ];
      render(
        <StatusHeader
          {...defaultProps}
          selectedDrugIds={["drug1", "drug2"]}
          interactions={mockInteractions}
        />
      );
      expect(screen.getByText("Potansiyel Ciddi Etkileşim!")).toBeInTheDocument();
    });
  });

  describe("Offline Mode", () => {
    it("does not show offline badge when isOffline is false or undefined", () => {
      render(<StatusHeader {...defaultProps} />);
      expect(screen.queryByText("Çevrimdışı Mod (Yerel Koruma)")).not.toBeInTheDocument();
    });

    it("shows offline badge when isOffline is true", () => {
      render(<StatusHeader {...defaultProps} isOffline={true} />);
      expect(screen.getByText("Çevrimdışı Mod (Yerel Koruma)")).toBeInTheDocument();
    });
  });

  describe("Theme Toggle", () => {


    it("toggles theme correctly and updates localStorage", () => {
      render(<StatusHeader {...defaultProps} />);

      const themeButton = screen.getByRole("button", { name: "Aydınlık / Karanlık Tema Değiştirici" });

      // Default might be dark based on initial state setup in the component
      // The component initially sets to 'dark' if matchMedia is false and no localStorage
      // Let's check initial localStorage interaction after toggle

      // Click to toggle
      fireEvent.click(themeButton);

      // Check if localStorage was updated (should be either 'light' or 'dark')
      const storedTheme = localStorage.getItem("pillmind_theme");
      expect(storedTheme === "light" || storedTheme === "dark").toBeTruthy();

      // Click again
      fireEvent.click(themeButton);

      // Check if it toggled back
      const newStoredTheme = localStorage.getItem("pillmind_theme");
      expect(newStoredTheme).not.toBe(storedTheme);

      // Verify document classes are updated
      if (newStoredTheme === "dark") {
        expect(document.documentElement.classList.contains("dark")).toBeTruthy();
      } else {
        expect(document.documentElement.classList.contains("dark")).toBeFalsy();
      }
    });

    it("initializes from localStorage", () => {
      localStorage.setItem("pillmind_theme", "light");
      render(<StatusHeader {...defaultProps} />);

      // Since it's light mode, the button should show 🌙 (for switching to dark) or ☀️
      // The code logic: {theme === "dark" ? "☀️" : "🌙"}
      expect(screen.getByText("🌙")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBeFalsy();
    });
  });
});
