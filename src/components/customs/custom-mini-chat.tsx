"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { CustomMessageItem } from "@/types/custom.types";

interface CustomMiniChatProps {
  messages: CustomMessageItem[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
  canSendMessage: boolean;
}

export function CustomMiniChat({
  messages,
  currentUserId,
  onSendMessage,
  canSendMessage,
}: CustomMiniChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await onSendMessage(newMessage.trim());
    setNewMessage("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-lg border">
      <div className="border-b px-4 py-2">
        <h3 className="text-sm font-medium">Messages</h3>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-col gap-3 overflow-y-auto p-4"
        style={{ maxHeight: "400px", minHeight: "200px" }}
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun message pour le moment.
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {!isOwn && msg.sender && (
                    <p className="mb-1 text-xs font-semibold">
                      {msg.sender.name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {format(new Date(msg.createdAt), "d MMM HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {canSendMessage && (
        <div className="flex gap-2 border-t p-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            rows={1}
            className="min-h-[40px] resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
