// lib/webpush
// 서버 전용: web-push를 지연 로드하고 VAPID 키를 초기화하여 알림 전송
let configured = false;
let webpushInstance = null;

async function getWebPush() {
  if (webpushInstance) return webpushInstance;
  const mod = await import("web-push");
  webpushInstance = mod.default || mod;
  return webpushInstance;
}

export async function initWebPush() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@citysignal.local";
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys missing: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
    return;
  }
  const webpush = await getWebPush();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPush(sub, payload) {
  await initWebPush();
  const webpush = await getWebPush();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    const gone = err.statusCode === 404 || err.statusCode === 410;
    return { ok: false, gone, error: err.message };
  }
}
