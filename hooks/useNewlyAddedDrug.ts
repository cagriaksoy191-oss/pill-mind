import { useEffect, useState, useRef } from "react";
import { Drug } from "@/components/VirtualPillbox";

/**
 * Custom hook to track drug additions to the pillbox to trigger entry animations.
 */
export function useNewlyAddedDrug(selectedDrugs: Drug[]): string | null {
  const prevCountRef = useRef(selectedDrugs.length);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDrugs.length > prevCountRef.current) {
      const added = selectedDrugs[selectedDrugs.length - 1];
      if (added) {
        const raf = requestAnimationFrame(() => {
          setNewlyAddedId(added.id);
        });
        const timer = setTimeout(() => setNewlyAddedId(null), 1000);

        prevCountRef.current = selectedDrugs.length;
        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
        };
      }
    }
    prevCountRef.current = selectedDrugs.length;
  }, [selectedDrugs]);

  return newlyAddedId;
}
