import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesHub } from "@/components/messages/messages-hub";

export default async function ChatterManagerMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <MessagesHub
      currentUserId={session.user.id}
      customDetailPath="/chatter-manager/customs"
    />
  );
}
