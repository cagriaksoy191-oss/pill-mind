import { useState, useEffect } from "react";

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.info("[PillMind SW] Servis İşçisi kaydı başarılı:", reg.scope))
          .catch((err) => console.warn("[PillMind SW] Servis İşçisi kaydı başarısız:", err));
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return isOffline;
}
