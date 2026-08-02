import { useState, useEffect } from "react";

export function useClinicalMode() {
  const [isClinicalMode, setIsClinicalMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pillmind_clinical_mode") === "true";
    }
    return false;
  });

  const toggleClinicalMode = () => {
    const nextMode = !isClinicalMode;
    setIsClinicalMode(nextMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("pillmind_clinical_mode", String(nextMode));
      window.dispatchEvent(new Event("pillmind_clinical_mode_changed"));
    }
  };

  useEffect(() => {
    const handleModeChange = () => {
      if (typeof window !== "undefined") {
        const currentMode = localStorage.getItem("pillmind_clinical_mode") === "true";
        setIsClinicalMode(currentMode);
      }
    };
    window.addEventListener("pillmind_clinical_mode_changed", handleModeChange);
    return () => {
      window.removeEventListener("pillmind_clinical_mode_changed", handleModeChange);
    };
  }, []);

  return { isClinicalMode, toggleClinicalMode };
}
