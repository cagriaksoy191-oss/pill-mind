"use client";

import { useEffect, useState, useRef } from "react";
import { useTiltEffect } from "@/hooks/useTiltEffect";

interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

interface VirtualPillboxProps {
  selectedDrugs: Drug[];
  onRemove: (id: string) => void;
}

export default function VirtualPillbox({
  selectedDrugs,
  onRemove,
}: VirtualPillboxProps) {
  const prevCountRef = useRef(selectedDrugs.length);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const {
    containerRef,
    tilt,
    isHovered,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = useTiltEffect();

  // Track additions to trigger the 3D entry animation
  useEffect(() => {
    if (selectedDrugs.length > prevCountRef.current) {
      const added = selectedDrugs[selectedDrugs.length - 1];
      if (added) {
        setTimeout(() => setNewlyAddedId(added.id), 0);
        const timer = setTimeout(() => setNewlyAddedId(null), 1000);
        prevCountRef.current = selectedDrugs.length;
        return () => {
          clearTimeout(timer);
        };
      }
    }
    prevCountRef.current = selectedDrugs.length;
  }, [selectedDrugs]);

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

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div style={{ transform: "translateZ(30px)" }}>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              📥 Sanal İlaç Kutusu
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-500/20 font-semibold">
                {selectedDrugs.length} Aktif İlaç
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Etkileşim kontrolü için kutuya eklediğiniz ilaçlar
            </p>
          </div>

          {selectedDrugs.length > 0 && (
            <div
              className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 self-start md:self-center"
              style={{ transform: "translateZ(20px)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Klinik Tarama Aktif
            </div>
          )}
        </div>

        {selectedDrugs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/5 transition-all duration-300"
            style={{ transform: "translateZ(10px)" }}
          >
            <span className="text-4xl mb-3 animate-bounce">💊</span>
            <p className="text-slate-400 text-sm italic text-center px-4">
              Kutunuz şu an boş. Üst kısımdan ilaç arayıp ekleyerek anında
              tarama başlatabilirsiniz.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            style={{ transform: "translateZ(15px)" }}
          >
            {selectedDrugs.map((drug) => {
              const isNew = drug.id === newlyAddedId;
              return (
                <div
                  key={drug.id}
                  className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ease-out group overflow-hidden ${
                    isNew
                      ? "animate-drop-pill border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/10 bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-900/60"
                  }`}
                  style={{
                    transformStyle: "preserve-3d",
                    animation: isNew
                      ? "drop-pill 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards"
                      : undefined,
                  }}
                >
                  {/* Glowing background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div
                    className="flex items-center gap-3 relative z-10"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                      💊
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                        {drug.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px] mt-0.5">
                        {drug.activeIngredient}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(drug.id)}
                    className="relative z-10 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer shadow-md"
                    aria-label={`${drug.name} ilacını kutudan çıkar`}
                    style={{ transform: "translateZ(20px)" }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
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
