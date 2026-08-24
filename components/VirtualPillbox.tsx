"use client";

import { useTiltEffect } from "@/hooks/useTiltEffect";
import { useNewlyAddedDrug } from "@/hooks/useNewlyAddedDrug";
import { CheckResult, AccumulationWarning } from "@/lib/interactions";
import { getDrugSeverityGlow } from "@/lib/pillboxUtils";
import { VirtualPillboxDrugCard } from "./VirtualPillboxDrugCard";
import { VirtualPillboxWarnings } from "./VirtualPillboxWarnings";
import { VirtualPillboxHeader } from "./VirtualPillboxHeader";
import { VirtualPillboxEmptyState } from "./VirtualPillboxEmptyState";

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

interface VirtualPillboxProps {
  selectedDrugs: Drug[];
  onRemove: (id: string) => void;
  interactions?: CheckResult[];
  accumulationWarnings?: AccumulationWarning[];
}

export default function VirtualPillbox({
  selectedDrugs,
  onRemove,
  interactions = [],
  accumulationWarnings = [],
}: VirtualPillboxProps) {
  const newlyAddedId = useNewlyAddedDrug(selectedDrugs);
  const { containerRef, tilt, isHovered, handleMouseMove, handleMouseEnter, handleMouseLeave } = useTiltEffect();

  return (
    <div
      className="perspective-container w-full"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="pillbox-3d relative w-full rounded-3xl p-6 transition-all duration-300 ease-out border border-white/20 bg-gradient-to-br from-slate-900/90 to-indigo-950/90 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          boxShadow: isHovered
            ? "0 25px 50px -12px rgba(99, 102, 241, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)"
            : "0 20px 25px -5px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Dynamic visual mesh background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"
          style={{ transform: "translateZ(-20px)" }}
        />

        <div
          className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"
          style={{ transform: "translateZ(-30px)" }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
          style={{ transform: "translateZ(-30px)" }}
        />

        <VirtualPillboxHeader drugCount={selectedDrugs.length} />

        {/* Duplicate/Overdose warnings list */}
        <VirtualPillboxWarnings accumulationWarnings={accumulationWarnings} />

        {selectedDrugs.length === 0 ? (
          <VirtualPillboxEmptyState />
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            style={{ transform: "translateZ(15px)" }}
          >
            {selectedDrugs.map((drug) => (
              <VirtualPillboxDrugCard
                key={drug.id}
                drug={drug}
                isNew={drug.id === newlyAddedId}
                severityGlow={getDrugSeverityGlow(drug.id, interactions)}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Embedded CSS for custom keyframes and 3D effects */}
      <style jsx global>{`
        @keyframes drop-pill {
          0% {
            transform: translateY(-80px) translateZ(100px) rotateX(45deg);
            opacity: 0;
          }
          60% {
            transform: translateY(8px) translateZ(10px) rotateX(-10deg);
            opacity: 1;
          }
          80% {
            transform: translateY(-4px) translateZ(5px) rotateX(5deg);
          }
          100% {
            transform: translateY(0) translateZ(0) rotateX(0deg);
          }
        }
      `}</style>
    </div>
  );
}
