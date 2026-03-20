"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "exclsv-push-dismissed";
const DISMISS_DAYS = 7;
const VAPID_FALLBACK = "BBxLO9O5hwSGt2NArohi9j5p3szLI-R_jkbrnhQp1aLRRo7OAkEs14Z_UDq38sOKQjDLeE2llfoYdRy124xCCHs";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  console.log("[Push] Hook loaded");
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("[Push] useEffect running");

    const hasWindow = typeof window !== "undefined";
    const hasNotification = hasWindow && "Notification" in window;
    const hasSW = hasWindow && "serviceWorker" in navigator;
    const hasPush = hasWindow && "PushManager" in window;
    console.log("[Push] Support check:", { hasWindow, hasNotification, hasSW, hasPush });

    const isSupported = hasWindow && hasNotification && hasSW && hasPush;
    setSupported(isSupported);

    if (!isSupported) {
      console.log("[Push] Not supported — aborting");
      return;
    }

    console.log("[Push] Hook mounted, permission:", Notification.permission);

    // Permission already granted — auto-subscribe if no existing subscription
    if (Notification.permission === "granted") {
      (async () => {
        try {
          console.log("[Push] Registering SW...");
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("[Push] SW registered, waiting for ready...");
          await navigator.serviceWorker.ready;
          console.log("[Push] SW ready");

          const existingSub = await registration.pushManager.getSubscription();
          console.log("[Push] Existing subscription:", existingSub ? existingSub.endpoint.substring(0, 50) : "none");

          if (existingSub) {
            // Subscription exists in browser — ensure it's saved server-side too
            const subJson = existingSub.toJSON();
            console.log("[Push] Syncing existing subscription to server...");
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: subJson.endpoint,
                keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
              }),
            }).catch(() => {});
            setSubscribed(true);
            return;
          }

          // No subscription yet — auto-subscribe
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || VAPID_FALLBACK;
          console.log("[Push] VAPID key:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "env" : "fallback");
          console.log("[Push] Auto-subscribing (permission already granted)");

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });
          console.log("[Push] Subscription created:", subscription.endpoint.substring(0, 50));

          const subJson = subscription.toJSON();
          console.log("[Push] Sending to API...");
          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
              },
            }),
          });
          console.log("[Push] Auto-subscribe response:", res.status);

          if (res.ok) {
            setSubscribed(true);
          } else {
            console.error("[Push] Auto-subscribe failed:", res.status);
          }
        } catch (err) {
          console.error("[Push] Auto-subscribe error:", err);
        }
      })();
      return;
    }

    // Permission not yet asked — show banner
    if (Notification.permission === "default") {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedAt = new Date(dismissed);
        const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return;
      }
      setShowBanner(true);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      console.log("[Push] Permission:", permission);
      if (permission !== "granted") {
        setShowBanner(false);
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      console.log("[Push] Service worker registered");

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || VAPID_FALLBACK;
      console.log("[Push] VAPID key:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "env" : "fallback");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      console.log("[Push] Subscription created:", subscription.endpoint.substring(0, 50));

      const subJson = subscription.toJSON();

      // Send to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });
      console.log("[Push] Subscribe response:", res.status);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("[Push] Subscribe failed:", body);
        setLoading(false);
        return;
      }

      setSubscribed(true);
      setShowBanner(false);
    } catch (err) {
      console.error("[Push] subscribe error:", err);
    }
    setLoading(false);
  }, [supported]);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  }, []);

  return { supported, subscribed, showBanner, loading, subscribe, dismiss };
}
