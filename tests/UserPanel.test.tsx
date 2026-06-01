/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserPanel from "../components/UserPanel";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Suppress console.error/alert in tests to keep output clean when we test failure cases
const originalConsoleError = console.error;
const originalAlert = window.alert;
const originalConfirm = window.confirm;

beforeAll(() => {
  console.error = jest.fn();
  window.alert = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  window.alert = originalAlert;
  window.confirm = originalConfirm;
});

describe("UserPanel Component", () => {
  const mockOnLoadPillbox = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const setupMockFetch = (mockAuthSession: Record<string, unknown>, mockBoxes?: Record<string, unknown>) => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthSession),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBoxes || { pillboxes: [] }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  };

  it("renders loading state initially, then shows login button if unauthenticated", async () => {
    setupMockFetch({ authenticated: false });

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    // Test loading state presence
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Wait for the auth check to complete and state to update
    await waitFor(() => {
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });
  });

  it("handles fetch auth session error gracefully and shows login button", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => {
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(new Error("Network Error"));
  });

  it("shows authenticated user info and dropdown, and loads pillboxes", async () => {
    const mockUser = { id: "1", email: "test@example.com" };
    const mockBoxes = {
      pillboxes: [
        { id: "box1", name: "My Box", drugIds: ["d1", "d2"], createdAt: "2023-01-01T00:00:00Z" }
      ]
    };
    setupMockFetch({ authenticated: true, user: mockUser }, mockBoxes);

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    // Wait for auth & pillboxes to load
    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    // Click dropdown to open
    fireEvent.click(screen.getByText("👤 test"));

    // Check dropdown content
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("My Box")).toBeInTheDocument();
    });
    expect(screen.getByText(/2 İlaç/)).toBeInTheDocument();
  });

  it("opens login modal, handles login success", async () => {
    setupMockFetch({ authenticated: false });
    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    // Wait for unauthenticated state
    await waitFor(() => screen.getByText("🔐 Giriş Yap"));

    // Open Modal
    fireEvent.click(screen.getByText("🔐 Giriş Yap"));
    expect(screen.getByText(/E-POSTA ADRESİ/i)).toBeInTheDocument();

    // Input email
    const emailInput = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    // Mock login endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: "2", email: "new@example.com" } }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ pillboxes: [] }) });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    // Submit
    const loginButton = screen.getByText("Giriş Yap / Kaydol");
    fireEvent.click(loginButton);

    // Verify modal closes and user info is displayed
    await waitFor(() => {
      expect(screen.queryByText(/E-POSTA ADRESİ/i)).not.toBeInTheDocument();
      expect(screen.getByText("👤 new")).toBeInTheDocument();
    });
  });

  it("shows error on failed login", async () => {
    setupMockFetch({ authenticated: false });
    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => screen.getByText("🔐 Giriş Yap"));
    fireEvent.click(screen.getByText("🔐 Giriş Yap"));

    const emailInput = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(emailInput, { target: { value: "invalid@example.com" } });

    // Mock login failure
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Invalid credentials" }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    fireEvent.click(screen.getByText("Giriş Yap / Kaydol"));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/)).toBeInTheDocument();
    });
  });

  it("handles logout", async () => {
    setupMockFetch({ authenticated: true, user: { id: "1", email: "test@example.com" } });
    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => screen.getByText("👤 test"));

    // Open dropdown
    fireEvent.click(screen.getByText("👤 test"));

    // Mock logout endpoint
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === "/api/auth/logout") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    fireEvent.click(screen.getByText("🚪 Çıkış Yap"));

    await waitFor(() => {
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });
  });

  it("opens save pillbox modal and saves successfully", async () => {
    setupMockFetch({ authenticated: true, user: { id: "1", email: "test@example.com" } });
    render(<UserPanel selectedDrugIds={["d1", "d2"]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => screen.getByText("💾 Kutuyu Kaydet"));

    // Open save modal
    fireEvent.click(screen.getByText("💾 Kutuyu Kaydet"));
    expect(screen.getByText("İlaç Kutunuzu Kaydedin")).toBeInTheDocument();

    // Enter name
    const nameInput = screen.getByPlaceholderText("Örn: Sabah İlaçlarım, Tansiyon Tedavim");
    fireEvent.change(nameInput, { target: { value: "My New Box" } });

    // Mock save endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/pillbox/save") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            pillboxes: [
              { id: "box2", name: "My New Box", drugIds: ["d1", "d2"], createdAt: new Date().toISOString() }
            ]
          }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    // Save
    fireEvent.click(screen.getByText("Buluta Kaydet"));

    await waitFor(() => {
      expect(screen.queryByText("İlaç Kutunuzu Kaydedin")).not.toBeInTheDocument();
    });
  });

  it("loads pillbox from dropdown", async () => {
    const mockBoxes = {
      pillboxes: [
        { id: "box1", name: "My Box", drugIds: ["d1", "d2"], createdAt: "2023-01-01T00:00:00Z" }
      ]
    };
    setupMockFetch({ authenticated: true, user: { id: "1", email: "test@example.com" } }, mockBoxes);

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => screen.getByText("👤 test"));
    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => screen.getByText("Yükle"));
    fireEvent.click(screen.getByText("Yükle"));

    expect(mockOnLoadPillbox).toHaveBeenCalledWith(["d1", "d2"]);
  });

  it("deletes pillbox from dropdown", async () => {
    const mockBoxes = {
      pillboxes: [
        { id: "box1", name: "My Box", drugIds: ["d1", "d2"], createdAt: "2023-01-01T00:00:00Z" }
      ]
    };
    setupMockFetch({ authenticated: true, user: { id: "1", email: "test@example.com" } }, mockBoxes);

    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true);

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => screen.getByText("👤 test"));
    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => screen.getByTitle("Sil"));

    // Mock delete endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/pillbox/delete") {
        return Promise.resolve({ ok: true });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ pillboxes: [] }) });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    fireEvent.click(screen.getByTitle("Sil"));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
       expect(screen.getByText("Bulutta kayıtlı kutunuz bulunmuyor.")).toBeInTheDocument();
    });
  });
});
