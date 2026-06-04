import re

with open("components/UserPanel.tsx", "r") as f:
    content = f.read()

# Add otp states
content = content.replace(
    'const [emailInput, setEmailInput] = useState("");',
    'const [emailInput, setEmailInput] = useState("");\n  const [otpStep, setOtpStep] = useState(false);\n  const [otpInput, setOtpInput] = useState("");'
)

# Reset OTP state when modal is closed
content = content.replace(
    """setShowModal(false);
                setErrorMsg(null);
                setEmailInput("");""",
    """setShowModal(false);
                setErrorMsg(null);
                setEmailInput("");
                setOtpStep(false);
                setOtpInput("");"""
)

# Update handleAuthSubmit to not setUser and instead show OTP step
login_fetch_replacement = """      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız.");
      }

      // Instead of logging in, we move to OTP step
      setOtpStep(true);
      setErrorMsg(null);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMsg(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length < 6) {
      setErrorMsg("Lütfen 6 haneli kodu girin.");
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, otp: otpInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kod doğrulama başarısız.");
      }

      setUser(data.user);
      setShowModal(false);
      setEmailInput("");
      setOtpStep(false);
      setOtpInput("");"""

content = re.sub(
    r'const res = await fetch\("/api/auth/login"[\s\S]*?setUser\(data.user\);\s*setShowModal\(false\);\s*setEmailInput\(""\);',
    login_fetch_replacement,
    content
)

# Update the form UI to handle the otpStep
form_replacement = """            {!otpStep ? (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
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
                  "Giriş Yap / Kaydol"
                )}
              </button>
            </form>
            ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">DOĞRULAMA KODU</label>
                <input
                  type="text"
                  placeholder="6 Haneli Kod (Örn: 123456)"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-center tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-[10px] text-emerald-400 mt-2 text-center">E-posta adresinize gönderilen kodu girin.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Doğrula ve Giriş Yap"
                )}
              </button>
            </form>
            )}"""

content = re.sub(
    r'<form onSubmit=\{handleAuthSubmit\} className="space-y-4">[\s\S]*?</form>',
    form_replacement,
    content
)

with open("components/UserPanel.tsx", "w") as f:
    f.write(content)
