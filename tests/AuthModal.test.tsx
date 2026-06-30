/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthModal from "../components/AuthModal";

// Mock fetch globally
global.fetch = jest.fn() as unknown as typeof fetch;

describe("AuthModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText("PillMind Hesabınıza Giriş Yapın")).toBeTruthy();
    expect(screen.getByPlaceholderText("isim@örnek.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kapat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Giriş Yap / Kaydol" })).toBeTruthy();
  });

  it("calls onClose when the close button is clicked", () => {
    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("shows an error if the email is invalid", async () => {
    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "invalidemail" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/Lütfen geçerli bir e-posta adresi girin/i)).toBeTruthy();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("calls fetch and onSuccess upon successful login", async () => {
    const mockUser = { id: "123", email: "test@example.com" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it("displays an error message upon failed login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Geçersiz kimlik bilgileri." }),
    });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Geçersiz kimlik bilgileri.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays a fallback error message if fetch throws an error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Network error")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
