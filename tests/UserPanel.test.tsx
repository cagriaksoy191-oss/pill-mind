/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("handles checkSession not ok response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/list?limit=50") {
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

  it("handles checkSession error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("[PillMind Auth] Oturum kontrolü başarısız:", expect.any(Error));
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("handles checkSession JSON parse error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error("JSON Parse Error"); }
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("[PillMind Auth] Oturum kontrolü başarısız:", expect.any(Error));
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("handles fetchSavedBoxes non-ok response", async () => {
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
      if (url === "/api/pillbox/list?limit=50") {
        return Promise.resolve({
          ok: false,
          status: 500
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

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("Bulutta kayıtlı kutunuz bulunmuyor.")).toBeInTheDocument();
      expect(screen.queryByText("Yükleniyor...")).not.toBeInTheDocument();
    });
  });

  it("handles fetchSavedBoxes error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
      if (url === "/api/pillbox/list?limit=50") {
        return Promise.reject(new Error("Database Error"));
      }
      return Promise.reject(new Error("not found"));
    });

    render(<UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Pillbox List] Çekilirken hata:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles fetchSavedBoxes error, checking loading state and fallback", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let rejectListPromise: (reason?: unknown) => void;
    const listPromise = new Promise((resolve, reject) => {
      rejectListPromise = reject;
    });

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
      if (url === "/api/pillbox/list?limit=50") {
        return listPromise;
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeInTheDocument();
    });

    rejectListPromise!(new Error("Database Error"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("[Pillbox List] Çekilirken hata:", expect.any(Error));
      expect(screen.getByText("Bulutta kayıtlı kutunuz bulunmuyor.")).toBeInTheDocument();
      expect(screen.queryByText("Yükleniyor...")).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("handles logout error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
      if (url === "/api/pillbox/list?limit=50") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      if (url === "/api/auth/logout") {
        return Promise.reject(new Error("Logout Failed"));
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("🚪 Çıkış Yap")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("🚪 Çıkış Yap"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("[Pillbox Logout] Hata:", expect.any(Error));
    });

    // State must not change — user should still be logged in
    expect(screen.queryByText("🔐 Giriş Yap")).not.toBeInTheDocument();
    expect(screen.getByText("👤 test")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });


  it("handles logout API error response", async () => {
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
      if (url === "/api/pillbox/list?limit=50") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      if (url === "/api/auth/logout") {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("🚪 Çıkış Yap")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("🚪 Çıkış Yap"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    });

    // Ensure state didn't change (we should still see user and not see login button)
    expect(screen.queryByText("🔐 Giriş Yap")).not.toBeInTheDocument();
    expect(screen.getByText("👤 test")).toBeInTheDocument();
  });

  it("handles opening and closing AuthModal", async () => {
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

    // AuthModal mock
    jest.mock('../components/AuthModal', () => {
      return function MockAuthModal(props: Record<string, unknown>) {
        return (
          <div data-testid="auth-modal">
            <button onClick={() => props.onClose()}>Close Modal</button>
            <button onClick={() => props.onSuccess({ id: '2', email: 'modal@test.com' })}>Success Modal</button>
          </div>
        )
      }
    });

    fireEvent.click(screen.getByText("🔐 Giriş Yap"));

    await waitFor(() => {
      expect(screen.getByText("PillMind Hesabınıza Giriş Yapın")).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText("Kapat");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("PillMind Hesabınıza Giriş Yapın")).not.toBeInTheDocument();
    });
  });

  it("handles AuthModal onSuccess", async () => {
    let listFetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ authenticated: false }),
        });
      }
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ isOtpRequired: false, user: { id: "1", email: "newuser@example.com" } }),
        });
      }
      if (url === "/api/pillbox/list?limit=50") {
        listFetchCount++;
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
      expect(screen.getByText("🔐 Giriş Yap")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("🔐 Giriş Yap"));

    await waitFor(() => {
      expect(screen.getByText("PillMind Hesabınıza Giriş Yapın")).toBeInTheDocument();
    });

    // Fill in email
    fireEvent.change(screen.getByPlaceholderText("isim@örnek.com"), { target: { value: 'newuser@example.com' } });

    const initialListCount = listFetchCount;

    // Submit form
    fireEvent.click(screen.getByText("Giriş Yap / Kaydol"));

    await waitFor(() => {
      expect(screen.queryByText("PillMind Hesabınıza Giriş Yapın")).not.toBeInTheDocument();
      expect(screen.getByText("👤 newuser")).toBeInTheDocument();
      expect(listFetchCount).toBeGreaterThan(initialListCount);
    });
  });

  it("handles opening SavePillboxModal, close and success", async () => {
    let listFetchCount = 0;
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
      if (url === "/api/pillbox/list?limit=50") {
        listFetchCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ pillboxes: [] }),
        });
      }
      if (url === "/api/pillbox/save") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(new Error("not found"));
    });

    render(
      <UserPanel selectedDrugIds={["d1"]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("💾 Kutuyu Kaydet")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("💾 Kutuyu Kaydet"));

    await waitFor(() => {
      expect(screen.getByText("İlaç Kutunuzu Kaydedin")).toBeInTheDocument();
    });

    // Test onClose callback of SavePillboxModal
    const closeBtn = screen.getByLabelText("Kapat");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("İlaç Kutunuzu Kaydedin")).not.toBeInTheDocument();
    });

    // Reopen modal to test success case
    fireEvent.click(screen.getByText("💾 Kutuyu Kaydet"));

    await waitFor(() => {
      expect(screen.getByText("İlaç Kutunuzu Kaydedin")).toBeInTheDocument();
    });

    const initialListCount = listFetchCount;

    // Fill the name and submit
    fireEvent.change(screen.getByPlaceholderText("Örn: Sabah İlaçlarım, Tansiyon Tedavim"), { target: { value: 'My Test Box' } });
    fireEvent.click(screen.getByText("Buluta Kaydet"));

    await waitFor(() => {
      expect(screen.queryByText("İlaç Kutunuzu Kaydedin")).not.toBeInTheDocument();
      expect(listFetchCount).toBeGreaterThan(initialListCount);
    });
  });

  it("handles loading a pillbox", async () => {
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
      if (url === "/api/pillbox/list?limit=50") {
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

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByText("Yükle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Yükle"));

    expect(mockOnLoadPillbox).toHaveBeenCalledWith(["d1", "d2"]);
  });

  it("handles delete box cancel", async () => {
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
      if (url === "/api/pillbox/list?limit=50") {
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

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByTitle("Sil")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Sil"));

    expect(confirmSpy).toHaveBeenCalled();
    // fetch is not called again for delete
    const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(c => c[0] === "/api/pillbox/delete");
    expect(deleteCalls.length).toBe(0);

    confirmSpy.mockRestore();
  });

  it("handles delete box success", async () => {
    let listCalls = 0;
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
      if (url === "/api/pillbox/list?limit=50") {
        listCalls++;
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
      if (url === "/api/pillbox/delete") {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error("not found"));
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByTitle("Sil")).toBeInTheDocument();
    });

    const listCallsBeforeDelete = listCalls;
    fireEvent.click(screen.getByTitle("Sil"));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
       expect(listCalls).toBeGreaterThan(listCallsBeforeDelete);
    });

    confirmSpy.mockRestore();
  });

  it("handles delete box API error response", async () => {
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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/delete") {
        return Promise.resolve({
           ok: false,
           json: async () => ({ error: "Delete failed due to constraint" })
        });
      }
      return Promise.reject(new Error("not found"));
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByTitle("Sil")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Sil"));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
       expect(alertSpy).toHaveBeenCalledWith("Delete failed due to constraint");
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("handles delete box network error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/delete") {
        return Promise.reject(new Error("Network delete error"));
      }
      return Promise.reject(new Error("not found"));
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByTitle("Sil")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Sil"));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
       expect(consoleSpy).toHaveBeenCalledWith("[Pillbox Delete] Hata:", expect.any(Error));
       expect(alertSpy).toHaveBeenCalledWith("İlaç kutusu silinirken bir hata oluştu.");
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("handles delete box network error gracefully", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
      if (url === "/api/pillbox/list?limit=50") {
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
      if (url === "/api/pillbox/delete") {
        return Promise.reject(new Error("Network failure"));
      }
      return Promise.reject(new Error("not found"));
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <UserPanel selectedDrugIds={[]} onLoadPillbox={mockOnLoadPillbox} />
    );

    await waitFor(() => {
      expect(screen.getByText("👤 test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("👤 test"));

    await waitFor(() => {
      expect(screen.getByTitle("Sil")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Sil"));

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
       expect(consoleSpy).toHaveBeenCalledWith("[Pillbox Delete] Hata:", expect.any(Error));
       expect(alertSpy).toHaveBeenCalledWith("İlaç kutusu silinirken bir hata oluştu.");
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
