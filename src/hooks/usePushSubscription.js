"use client";
import { useEffect, useState } from "react";

// Registers service worker + push subscription when zone/coords ready.
// Returns { ready, error }.
export function usePushSubscription({ zone, lat, lng, radiusKm = 2 }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!zone || lat == null || lng == null) return; // wait until data ready
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const reg = await navigator.serviceWorker.register("/sw.js");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapid) { setError("VAPID public key missing"); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(vapid) });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), zone, lat, lng, radiusKm }),
        });
        if (mounted) setReady(true);
      } catch (e) {
        if (mounted) setError(e.message);
      }
    })();
    return () => { mounted = false; };
  }, [zone, lat, lng, radiusKm]);

  return { ready, error };
}

function toUint8(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}
