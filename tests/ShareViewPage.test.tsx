/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareViewPage from "../app/share/[token]/page";

// Mock the Disclaimer component as it's not the subject of this test
jest.mock("@/components/Disclaimer", () => {
  return function MockDisclaimer() {
    return <div data-testid="mock-disclaimer">Disclaimer</div>;
  };
});

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode, href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock React's `use` hook to just return the resolved value for simplicity in tests
jest.mock("react", () => {
  const actualReact = jest.requireActual("react");
  return {
    ...actualReact,
    use: jest.fn((promiseOrValue) => {
      if (promiseOrValue instanceof Promise) {
        throw new Error("Pass resolved value directly to params in tests to bypass Suspense");
      }
      return promiseOrValue;
    }),
  };
});

describe("ShareViewPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockToken = "test-token-123";
  // We pass the resolved value because of our `use` mock
  const mockParamsPromise = { token: mockToken } as unknown as Promise<{ token: string }>;

  const mockData = {
    success: true,
    token: mockToken,
    createdAt: "2024-01-01T10:00:00Z",
    expiresAt: "2024-12-31T10:00:00Z",
    drugs: [
      {
        id: "1",
        name: "Aspirin",
        activeIngredient: "Acetylsalicylic acid",
        category: "NSAID",
      },
      {
        id: "2",
        name: "Warfarin",
        activeIngredient: "Warfarin",
        category: "Anticoagulant",
      }
    ],
    interactions: [
      {
        drug1Name: "Aspirin",
        drug2Name: "Warfarin",
        interaction: {
          severity: "high",
          summary: "Increased risk of bleeding.",
          clinicalDetail: "Both drugs affect blood clotting.",
          source: "Test Source"
        }
      }
    ],
    accumulationWarnings: [
      {
        message: "NSAID accumulation",
        detail: "Multiple NSAIDs used.",
      }
    ],
    foodInteractions: [
      {
        drugName: "Warfarin",
        substance: "Vitamin K",
        effect: "Decreased effectiveness of warfarin.",
      }
    ]
  };

  it("renders loading state initially", async () => {
    let resolveMock: (value: unknown) => void;
    (global.fetch as jest.Mock).mockImplementation(() => new Promise((resolve) => {
        resolveMock = resolve;
    }));

    render(<ShareViewPage params={mockParamsPromise} />);

    expect(screen.getByText(/Güvenli Klinik Rapor Yükleniyor/i)).toBeInTheDocument();

    // Resolve the promise to avoid open handles
    await act(async () => {
      if (resolveMock) resolveMock({ ok: true, status: 200, json: async () => mockData });
    });
  });

  it("renders error state on API error (404 Not Found)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Rapor bulunamadı veya süresi dolmuş." })
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    await waitFor(() => {
      expect(screen.getByText(/Paylaşım Bulunamadı/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/mevcut değil veya sistem yöneticisi tarafından kaldırılmış/i)).toBeInTheDocument();
  });

  it("renders success state with data", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    // Wait for the main title to appear
    await waitFor(() => {
      expect(screen.getByText(/İlaç Kutusu Klinik Analiz Raporu/i)).toBeInTheDocument();
    });

    // Check if drugs are rendered (using getAllByText since it's rendered multiple times for mobile/print)
    const aspirinElements = screen.getAllByText("Aspirin");
    expect(aspirinElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acetylsalicylic acid/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warfarin").length).toBeGreaterThan(0);

    // Check if interactions are rendered
    expect(screen.getAllByText(/Aspirin \+ Warfarin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HIGH Risk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Increased risk of bleeding./i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Both drugs affect blood clotting./i)).toBeInTheDocument();

    // Check if accumulation warnings are rendered
    expect(screen.getAllByText(/NSAID accumulation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Multiple NSAIDs used./i)).toBeInTheDocument();

    // Check if food interactions are rendered
    expect(screen.getAllByText(/Warfarin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vitamin K/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Decreased effectiveness of warfarin./i).length).toBeGreaterThan(0);
  });

  it("renders no interactions message when interactions array is empty", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockData,
        interactions: []
      })
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    await waitFor(() => {
      expect(screen.getByText(/Bilinen Etkileşim Saptanmadı/i)).toBeInTheDocument();
    });
  });

  it("calculates and displays time left based on expiresAt", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00Z"));

    const dataWithExpiry = {
      ...mockData,
      expiresAt: "2024-01-01T12:30:15Z"
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => dataWithExpiry
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    await waitFor(() => {
      expect(screen.getByText(/Klinik Analiz Raporu/i)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/2s 30d 1(3|4)sn/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("shows expired state when time is up", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00Z"));

    const expiredData = {
      ...mockData,
      expiresAt: "2024-01-01T10:00:01Z"
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => expiredData
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    await waitFor(() => {
      expect(screen.getByText(/Klinik Analiz Raporu/i)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/Bağlantı Süresi Dolmuş/i)).toBeInTheDocument();
    expect(screen.getByText(/24 saat sonra otomatik olarak silinir/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("calls window.print when print button is clicked", async () => {
    const originalPrint = window.print;
    window.print = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData
    });

    render(<ShareViewPage params={mockParamsPromise} />);

    await waitFor(() => {
      expect(screen.getByText(/Klinik Analiz Raporu/i)).toBeInTheDocument();
    });

    const printButton = screen.getByText(/Yazdır/i).closest('button');
    expect(printButton).toBeInTheDocument();

    if (printButton) {
      fireEvent.click(printButton);
    }

    expect(window.print).toHaveBeenCalledTimes(1);

    window.print = originalPrint;
  });
});
