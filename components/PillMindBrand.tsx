import PillMindMark from "./PillMindMark";

type PillMindBrandProps = {
  tone?: "auto" | "light" | "ink";
  className?: string;
};

export default function PillMindBrand({ tone = "auto", className = "" }: PillMindBrandProps) {
  const wordColor = tone === "light" ? "text-white" : tone === "ink" ? "text-slate-950" : "text-slate-950 dark:text-white";
  const taglineColor = tone === "light" ? "text-slate-400" : tone === "ink" ? "text-slate-600" : "text-slate-600 dark:text-slate-400";

  return (
    <span aria-label="PillMind — Akıllı İlaç Güvenliği" className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <PillMindMark className="h-10 w-[35px] shrink-0" />
      <span className="flex flex-col gap-0.5">
        <span className={`inline-flex text-[24px] font-semibold leading-[1.05] tracking-[-0.045em] ${wordColor}`}>
          <span>P</span><span className="pillmind-brand-i">i</span><span>llMind</span>
        </span>
        <span className={`whitespace-nowrap text-[10px] font-medium leading-tight tracking-[0.01em] ${taglineColor}`}>Akıllı İlaç Güvenliği</span>
      </span>
    </span>
  );
}
