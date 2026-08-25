"use client";

import { useTiltEffect } from "@/hooks/useTiltEffect";
import { useNewlyAddedDrug } from "@/hooks/useNewlyAddedDrug";
import { CheckResult, AccumulationWarning } from "@/lib/interactions";
import { VirtualPillboxWarnings } from "./VirtualPillboxWarnings";
import { VirtualPillboxHeader } from "./VirtualPillboxHeader";
import { VirtualPillboxEmptyState } from "./VirtualPillboxEmptyState";
import { VirtualPillboxBackground } from "./VirtualPillboxBackground";
import { VirtualPillboxGrid, Drug } from "./VirtualPillboxGrid";

export type { Drug };

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
        <VirtualPillboxBackground />

        <VirtualPillboxHeader drugCount={selectedDrugs.length} />

        {/* Duplicate/Overdose warnings list */}
        <VirtualPillboxWarnings accumulationWarnings={accumulationWarnings} />

        {selectedDrugs.length === 0 ? (
          <VirtualPillboxEmptyState />
        ) : (
          <VirtualPillboxGrid
            selectedDrugs={selectedDrugs}
            newlyAddedId={newlyAddedId}
            interactions={interactions}
            onRemove={onRemove}
          />
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
