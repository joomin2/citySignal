"use client";
/**
 * PushManager component
 * - Registers service worker and requests Notification permission
 * - Creates a browser push subscription with VAPID public key
 * - Posts subscription + user location/zone to /api/push/subscribe
 * - Usage: render once after location/zone are known
 * --------------------------------------------------------------
 * 한국어 요약
 * - 서비스 워커 등록 후 브라우저 알림 권한 요청
 * - VAPID 공개키로 Push 구독 생성
 * - 구독 정보 + 사용자 위치/zone을 /api/push/subscribe에 전송
 * - 위치/zone 확보 뒤 한 번 렌더링하면 충분 (UI 요소 없음)
 */
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PushManager({ zone, lat, lng }) {
  usePushSubscription({ zone, lat, lng });
  return null; // 기존과 동일한 렌더 계약 유지
}
