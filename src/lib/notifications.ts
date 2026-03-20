import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Configure VAPID (silently skip if keys not set)
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contact@exclsv.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/** Send push notification to all subscriptions of a user. */
async function sendPush(userId: string, payload: { title: string; message: string; link?: string }) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  console.log(`[Push] Sending to ${subscriptions.length} subscription(s) for user ${userId}`);
  for (const sub of subscriptions) {
    try {
      console.log("[Push] Sending to", sub.endpoint.substring(0, 50));
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        console.log("[Push] Removing expired subscription:", sub.id);
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("[Push] sendNotification error:", statusCode, err);
      }
    }
  }
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link },
  });

  // Send push in background (don't await to not block response)
  sendPush(userId, { title, message, link }).catch(() => {});

  return notification;
}

/** Send the same notification to all OWNER and ADMIN users. */
export async function notifyAdmins({
  type,
  title,
  message,
  link,
}: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      createNotification({ userId: a.id, type, title, message, link })
    )
  );
}

/** Truncate a string to maxLen chars, adding "..." if truncated. */
export function truncate(str: string, maxLen: number = 50): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
