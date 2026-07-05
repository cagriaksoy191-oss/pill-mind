"use client";

import { useState } from "react";

interface User {
  id: string;
  email: string;
}

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otpInput, setOtpInput] = useState("");
  const [otpToken, setOtpToken] = useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "email") {
      if (!emailInput || !emailInput.includes("@")) {
        setErrorMsg("Lütfen geçerli bir e-posta adresi girin.");
        return;
      }
    } else {
      if (!otpInput || otpInput.length !== 6) {
        setErrorMsg("Lütfen 6 haneli doğrulama kodunu girin.");
        return;
      }
    }

    setAuthLoading(true);
    setErrorMsg(null);

    try {
      const payload = step === "email"
        ? { email: emailInput }
        : { email: emailInput, otp: otpInput, otpToken };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız.");
      }

      if (data.isOtpRequired) {
        setOtpToken(data.otpToken);
        setStep("otp");
      } else {
        onSuccess(data.user);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Giriş yaparken bir hata oluştu.";
      setErrorMsg(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 sm:w-7 sm:h-7 rounded-xl sm:rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-sm sm:text-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-slate-500/40"
          aria-label="Kapat"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
            🩺
          </div>
          <h3 className="text-xl font-extrabold text-white">PillMind Hesabınıza Giriş Yapın</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            İlaç kutularınızı buluta kaydetmek ve dilediğiniz an erişmek için e-posta adresinizle anında şifresiz giriş yapın.
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {step === "email" ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">E-POSTA ADRESİ</label>
              <input
                type="email"
                placeholder="isim@örnek.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">DOĞRULAMA KODU (OTP)</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-center text-xl tracking-[0.5em]"
                required
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                E-posta adresinize gönderilen 6 haneli kodu girin.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              step === "email" ? "Giriş Yap / Kaydol" : "Doğrula ve Giriş Yap"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
