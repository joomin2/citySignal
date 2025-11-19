"use client";
// Registers service worker early so PWA install is available even before push setup
import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;
        // Avoid duplicate registrations; this is idempotent in modern browsers
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);
  return null;
}
