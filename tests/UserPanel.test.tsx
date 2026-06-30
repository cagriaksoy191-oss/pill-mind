/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UserPanel from "../components/UserPanel";

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

describe("UserPanel Component", () => {
  const mockOnLoadPillbox = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Keep it pending to simulate loading
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    // Check for the spinner
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders unauthenticated state", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false }),
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });
  });

  it("renders authenticated state without selected drugs", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: "1", email: "test@example.com" },
          }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    // Should not show the save button
    expect(screen.queryByText("💾 Kutuyu Kaydet")).not.toBeInTheDocument();
  });

  it("renders authenticated state with selected drugs", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: "1", email: "test@example.com" },
          }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={["drug-1"]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("💾 Kutuyu Kaydet")).toBeInTheDocument();
    });
  });

  it("interacts with dropdown menu and lists pillboxes", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: "1", email: "test@example.com" },
          }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            pillboxes: [
              {
                id: "box-1",
                name: "Morning Meds",
                drugIds: ["d1", "d2"],
                createdAt: "2023-10-01T00:00:00.000Z",
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    // Click on the user button to open the dropdown
    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("Aktif Oturum")).toBeInTheDocument();
      expect(screen.getByText("💾 Kayıtlı Kutularım")).toBeInTheDocument();
      expect(screen.getByText("Morning Meds")).toBeInTheDocument();
    });
  });

  it("handles logout interaction", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { id: "1", email: "test@example.com" },
          }),
        });
      }
      if (url === "/api/pillbox/list") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      if (url === "/api/auth/logout") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("🚪 Çıkış Yap")).toBeInTheDocument();
    });

    // Click logout
    fireEvent.click(screen.getByText("🚪 Çıkış Yap"));

    await waitFor(() => {
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });
  });
});
