import React from "react";
import { AccumulationWarning } from "@/lib/interactions";

interface VirtualPillboxWarningsProps {
  accumulationWarnings: AccumulationWarning[];
}

export function VirtualPillboxWarnings({
  accumulationWarnings,
}: VirtualPillboxWarningsProps) {
  if (!accumulationWarnings || accumulationWarnings.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-4 flex flex-col gap-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 animate-slide-down"
      style={{ transform: "translateZ(20px)" }}
    >
      {accumulationWarnings.map((warn, index) => (
        <div
          key={index}
          className="flex items-start gap-2 font-bold leading-relaxed"
        >
          <span className="shrink-0">🚨</span>
          <div>{warn.message}</div>
        </div>
      ))}
    </div>
  );
}
