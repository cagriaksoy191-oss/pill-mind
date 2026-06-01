import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full py-4 px-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            PillMind
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/kontrol"
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-indigo-500/20"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </header>
  );
}
