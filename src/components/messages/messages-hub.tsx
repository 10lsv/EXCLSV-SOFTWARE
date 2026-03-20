"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/customs/status-badge";
import type { CustomStatus } from "@prisma/client";
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  customId: string;
  description: string;
  status: CustomStatus;
  model: { id: string; stageName: string; photoUrl: string | null };
  chatter: { id: string; name: string };
  totalMessages: number;
  unreadCount: number;
  lastMessage: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  } | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { name: string; role: string };
}

function trunc(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export function MessagesHub({
  currentUserId,
  customDetailPath,
}: {
  currentUserId: string;
  customDetailPath: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  // ─── Poll conversations every 5s ───
  const fetchConversations = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/messages/conversations");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setConversations(json.data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ─── Poll messages for active conversation every 5s ───
  const fetchMessages = useCallback(async () => {
    if (!activeId) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch(`/api/customs/${activeId}/messages`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        const fetched = json.data as Message[];
        setMessages(fetched);
        if (fetched.length > prevMsgCount.current) {
          // New messages arrived — mark as read + scroll
          fetch(`/api/customs/${activeId}/messages/read`, { method: "PATCH" });
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          }, 50);
        }
        prevMsgCount.current = fetched.length;
      }
    } catch {
      // ignore
    }
  }, [activeId]);

  useEffect(() => {
    if (activeId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeId, fetchMessages]);

  // ─── Open a conversation ───
  function openConversation(id: string) {
    setActiveId(id);
    setMessages([]);
    prevMsgCount.current = 0;
    setMobileChat(true);
    // Mark as read on server
    fetch(`/api/customs/${id}/messages/read`, { method: "PATCH" })
      .then(() => fetchConversations());
    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.customId === id ? { ...c, unreadCount: 0 } : c))
    );
  }

  async function handleSend() {
    if (!newMsg.trim() || sending || !activeId) return;
    setSending(true);
    await fetch(`/api/customs/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg.trim() }),
    });
    setNewMsg("");
    setSending(false);
    await fetchMessages();
    await fetchConversations();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeConvo = conversations.find((c) => c.customId === activeId);
  const unreadTotal = conversations.filter((c) => c.unreadCount > 0).length;

  // ─── Conversation list ───
  const ConvoList = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-bold">Messages</h2>
        {unreadTotal > 0 && (
          <p className="text-xs text-primary font-medium">
            {unreadTotal} conversation{unreadTotal > 1 ? "s" : ""} non lue{unreadTotal > 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Chargement...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune conversation</p>
          </div>
        ) : (
          conversations.map((c) => {
            const hasUnread = c.unreadCount > 0;
            return (
              <button
                key={c.customId}
                onClick={() => openConversation(c.customId)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 flex items-start gap-3",
                  activeId === c.customId && "bg-muted",
                  hasUnread && activeId !== c.customId && "bg-primary/[0.04]"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                  <AvatarImage src={c.model.photoUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {c.model.stageName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm truncate", hasUnread ? "font-bold" : "font-medium")}>
                      {c.model.stageName}
                    </span>
                    {c.lastMessage && (
                      <span className={cn("text-[10px] shrink-0", hasUnread ? "text-primary font-medium" : "text-muted-foreground")}>
                        {formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false, locale: fr })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {trunc(c.description, 50)}
                  </p>
                  {c.lastMessage && (
                    <p className={cn(
                      "text-xs truncate mt-0.5",
                      hasUnread ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                      {c.lastMessage.senderName}: {trunc(c.lastMessage.content, 40)}
                    </p>
                  )}
                </div>
                {/* Blue dot for unread (iMessage style) */}
                <div className="flex flex-col items-center gap-1 shrink-0 mt-2">
                  {hasUnread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Chat view ───
  const ChatView = (
    <div className="flex flex-col h-full">
      {activeConvo ? (
        <>
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <button
              onClick={() => { setMobileChat(false); setActiveId(null); }}
              className="md:hidden shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={activeConvo.model.photoUrl || undefined} />
              <AvatarFallback className="text-[10px]">
                {activeConvo.model.stageName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">
                  {activeConvo.model.stageName}
                </span>
                <StatusBadge status={activeConvo.status} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {trunc(activeConvo.description, 60)}
              </p>
            </div>
            <a
              href={`${customDetailPath}/${activeConvo.customId}`}
              className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
            >
              Voir le custom
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    isOwn ? "bg-foreground text-background" : "bg-muted"
                  )}>
                    {!isOwn && msg.sender && (
                      <p className="mb-0.5 text-[10px] font-semibold opacity-70">{msg.sender.name}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {format(new Date(msg.createdAt), "d MMM HH:mm", { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 border-t p-3">
            <Textarea
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              rows={1}
              className="min-h-[40px] resize-none"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMsg.trim() || sending}
              className="shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Sélectionnez une conversation</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-lg border overflow-hidden bg-background">
      <div className={cn("w-[350px] shrink-0 border-r hidden md:flex md:flex-col")}>
        {ConvoList}
      </div>
      <div className="flex-1 hidden md:flex md:flex-col">
        {ChatView}
      </div>
      <div className={cn("flex-1 md:hidden flex flex-col", mobileChat && activeId ? "hidden" : "")}>
        {ConvoList}
      </div>
      <div className={cn("flex-1 md:hidden flex flex-col", !mobileChat || !activeId ? "hidden" : "")}>
        {ChatView}
      </div>
    </div>
  );
}
