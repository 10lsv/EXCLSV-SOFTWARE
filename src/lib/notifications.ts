import { prisma } from "@/lib/prisma";

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
  return prisma.notification.create({
    data: { userId, type, title, message, link },
  });
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
