// EXCLSV Push Notification Service Worker

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "EXCLSV", {
      body: data.message || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.link || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(event.notification.data.url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(event.notification.data.url);
    })
  );
});
