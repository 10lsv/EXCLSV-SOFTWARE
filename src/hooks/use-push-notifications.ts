"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BBxLO9O5hwSGt2NArohi9j5p3szLI-R_jkbrnhQp1aLRRo7OAkEs14Z_UDq38sOKQjDLeE2llfoYdRy124xCCHs";

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

  // On mount: check support + existing subscription
  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    console.log("[Push] supported:", isSupported);
    setSupported(isSupported);
    if (!isSupported) return;

    console.log("[Push] permission:", Notification.permission);

    // If denied, nothing to do
    if (Notification.permission === "denied") return;

    // Check if browser already has a push subscription
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) {
        console.log("[Push] No SW registered, showing banner");
        setShowBanner(true);
        return;
      }
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          console.log("[Push] Existing browser subscription found");
          // Sync to server in case it's missing
          const subJson = sub.toJSON();
          fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subJson.endpoint,
              keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
            }),
          })
            .then((res) => {
              console.log("[Push] Sync response:", res.status);
              setSubscribed(true);
            })
            .catch(() => setSubscribed(true));
        } else {
          console.log("[Push] No subscription, showing banner");
          setShowBanner(true);
        }
      });
    });
  }, []);

  // Subscribe: called on button click (explicit user gesture — required for iOS)
  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);

    try {
      // Step 1: Request permission (requires user gesture on iOS)
      console.log("[Push] Requesting permission...");
      const permission = await Notification.requestPermission();
      console.log("[Push] Permission result:", permission);

      if (permission !== "granted") {
        console.log("[Push] Permission denied");
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // Step 2: Register service worker
      console.log("[Push] Registering service worker...");
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("[Push] SW registered, scope:", registration.scope);

      // Step 3: Wait for SW to be active
      await navigator.serviceWorker.ready;
      console.log("[Push] SW ready");

      // Step 4: Subscribe to push
      console.log("[Push] Subscribing to push...");
      // Push notifications only work in production (HTTPS required)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
      });
      console.log("[Push] Push subscription created:", subscription.endpoint.substring(0, 60));

      // Step 5: Send subscription to server
      const subJson = subscription.toJSON();
      console.log("[Push] Sending to server...");
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
      console.log("[Push] Server response:", res.status);

      if (res.ok) {
        console.log("[Push] Successfully subscribed!");
        setSubscribed(true);
        setShowBanner(false);
      } else {
        const body = await res.text();
        console.error("[Push] Server error:", res.status, body);
      }
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
    }

    setLoading(false);
  }, [supported]);

  const dismiss = useCallback(() => {
    setShowBanner(false);
  }, []);

  return { supported, subscribed, showBanner, loading, subscribe, dismiss };
}
