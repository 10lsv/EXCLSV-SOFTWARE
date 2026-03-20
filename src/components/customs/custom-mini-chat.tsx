"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CustomMessageItem } from "@/types/custom.types";

interface CustomMiniChatProps {
  customId: string;
  messages: CustomMessageItem[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
  canSendMessage: boolean;
}

export function CustomMiniChat({
  customId,
  messages: initialMessages,
  currentUserId,
  onSendMessage,
  canSendMessage,
}: CustomMiniChatProps) {
  const [messages, setMessages] = useState<CustomMessageItem[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(initialMessages.length);

  // Sync initial messages when prop changes (e.g. navigation)
  useEffect(() => {
    setMessages(initialMessages);
    prevCountRef.current = initialMessages.length;
  }, [initialMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Poll messages every 5s
  const fetchMessages = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch(`/api/customs/${customId}/messages`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        const fetched = json.data as CustomMessageItem[];
        setMessages((prev) => {
          if (fetched.length === prev.length) return prev;
          // Detect new messages from others (for fade-in animation)
          if (fetched.length > prev.length) {
            const prevIds = new Set(prev.map((m) => m.id));
            const incoming = fetched
              .filter((m) => !prevIds.has(m.id) && m.senderId !== currentUserId)
              .map((m) => m.id);
            if (incoming.length > 0) {
              setNewIds(new Set(incoming));
              setTimeout(() => setNewIds(new Set()), 1500);
            }
          }
          return fetched;
        });
      }
    } catch {
      // ignore
    }
  }, [customId, currentUserId]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await onSendMessage(newMessage.trim());
    setNewMessage("");
    setSending(false);
    // Fetch immediately after send for instant feedback
    await fetchMessages();
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
            const isNew = newIds.has(msg.id);
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col transition-all duration-500",
                  isOwn ? "items-end" : "items-start",
                  isNew && "animate-in fade-in slide-in-from-bottom-2"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    isNew && !isOwn && "ring-2 ring-primary/30"
                  )}
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
