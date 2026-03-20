"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "exclsv-push-dismissed";
const DISMISS_DAYS = 7;

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
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setSupported(isSupported);

    if (!isSupported) return;

    // Check if already subscribed
    if (Notification.permission === "granted") {
      navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
        if (reg) {
          reg.pushManager.getSubscription().then((sub) => {
            setSubscribed(!!sub);
          });
        }
      });
      return;
    }

    // Check if dismissed recently
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
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log("[Push] VAPID key:", vapidKey ? "présente" : "MANQUANTE");
      if (!vapidKey) {
        console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing — push disabled");
        setLoading(false);
        return;
      }

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
