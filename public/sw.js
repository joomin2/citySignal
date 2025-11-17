self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "CitySignal";
    const body = data.body || "새 알림";
    const payload = data.data || {};
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: payload,
      })
    );
  } catch (e) {
    // ignore
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const url = payloadToUrl(payload);
  event.waitUntil(
    (async () => {
      // Simplified: just open the detail page
      const cl = await clients.openWindow(url);
      return cl;
    })()
  );
});

function payloadToUrl(data) {
  try {
    if (data && data.id) return `/signals/${data.id}`;
  } catch {}
  return "/";
}
