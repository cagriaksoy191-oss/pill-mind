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

  it("calls fetch and onSuccess upon successful login via OTP", async () => {
    const mockUser = { id: "123", email: "test@example.com" };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isOtpRequired: true, otpToken: "mock-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Step 1: Submit Email
    const emailInput = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const emailSubmitBtn = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(emailSubmitBtn);

    // Verify transition to OTP step
    await waitFor(() => {
      expect(screen.getByPlaceholderText("123456")).toBeTruthy();
    });

    // Step 2: Submit OTP
    const otpInput = screen.getByPlaceholderText("123456");
    fireEvent.change(otpInput, { target: { value: "123456" } });

    const otpSubmitBtn = screen.getByRole("button", { name: "Doğrula ve Giriş Yap" });
    fireEvent.click(otpSubmitBtn);

    // Verify successful login
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", otp: "123456", otpToken: "mock-token" }),
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it("displays an error message upon failed OTP login", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isOtpRequired: true, otpToken: "mock-token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Geçersiz kimlik bilgileri." }),
      });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const emailSubmitBtn = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(emailSubmitBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("123456")).toBeTruthy();
    });

    const otpInput = screen.getByPlaceholderText("123456");
    fireEvent.change(otpInput, { target: { value: "123456" } });

    const otpSubmitBtn = screen.getByRole("button", { name: "Doğrula ve Giriş Yap" });
    fireEvent.click(otpSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText("⚠️ Geçersiz kimlik bilgileri.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays a fallback error message if fetch throws an error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Some unexpected error"));

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Some unexpected error")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays network error message if fetch throws a TypeError", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays HTTP error message if data.error is provided upon failed login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bilinmeyen bir hata oluştu." }),
    });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Bilinmeyen bir hata oluştu.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays a fallback error message if data.error is not provided upon failed login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Giriş başarısız.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays generic error message if a non-Error is caught", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce("String error");

    render(<AuthModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText("isim@örnek.com");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "Giriş Yap / Kaydol" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("⚠️ Giriş yaparken bir hata oluştu.")).toBeTruthy();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
