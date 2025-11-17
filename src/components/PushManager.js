"use client";
/**
 * PushManager component
 * - Registers service worker and requests Notification permission
 * - Creates a browser push subscription with VAPID public key
 * - Posts subscription + user location/zone to /api/push/subscribe
 * - Usage: render once after location/zone are known
 */
import { useEffect, useState } from "react";

export default function PushManager({ zone, lat, lng }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 필수 API 체크: ServiceWorker/PushManager가 없으면 조용히 중단
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        // 서비스워커 등록 (public/sw.js)
        const reg = await navigator.serviceWorker.register("/sw.js");
        // 알림 권한 요청 (사용자가 거부하면 중단)
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        // 공개키로 브라우저 구독 생성(VAPID)
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapid) {
          setError("VAPID public key missing");
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });

        // 서버에 구독 저장(선택: 위치/구역/반경)
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), zone, lat, lng, radiusKm: 2 }),
        });
        if (mounted) setReady(true);
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => { mounted = false; };
  }, [zone, lat, lng]);

  return null;
}

function urlBase64ToUint8Array(base64String) {
  // VAPID 공개키(Base64URL)를 Uint8Array로 변환 (브라우저 PushManager 요구 포맷)
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
