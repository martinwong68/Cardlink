"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  Send,
  Plus,
  Menu,
  X,
  Settings,
  Paperclip,
  Trash2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import {
  checkAiAccess,
  checkAiActionBalance,
  type PlanCheckResult,
} from "@/src/lib/plan-enforcement";
import UpgradePrompt from "@/components/business/UpgradePrompt";
import AiLimitPrompt from "@/components/business/AiLimitPrompt";

/* ── Types ── */
type Conversation = {
  id: string;
  title: string;
  model_used: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  tokens_used: number;
  created_at: string;
};

const MODEL_OPTIONS = [
  { value: "gemini-flash", label: "Gemini Flash" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "gpt-4o", label: "GPT-4o" },
] as const;

export default function BusinessAiPage() {
  const t = useTranslations("businessAi");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [model, setModel] = useState<string>("gemini-flash");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Plan enforcement ── */
  const [aiAccess, setAiAccess] = useState<PlanCheckResult | null>(null);
  const [aiBalance, setAiBalance] = useState<PlanCheckResult | null>(null);
  const [enforcementLoading, setEnforcementLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Plan enforcement check ── */
  useEffect(() => {
    if (companyLoading || !companyId) return;
    let cancelled = false;
    (async () => {
      const [access, balance] = await Promise.all([
        checkAiAccess(supabase, companyId),
        checkAiActionBalance(supabase, companyId),
      ]);
      if (!cancelled) {
        setAiAccess(access);
        setAiBalance(balance);
        setEnforcementLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, companyLoading, supabase]);

  /* ── Helpers ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Load conversations ── */
  const fetchConversations = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });
    setConversations((data as Conversation[]) ?? []);
    setLoadingConvos(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void fetchConversations();
  }, [companyLoading, companyId, fetchConversations]);

  /* ── Load messages for active conversation ── */
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((data as Message[]) ?? []);
        setLoadingMessages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeConvoId, supabase]);

  /* ── Auto-scroll when messages change ── */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ── Sync model when selecting a conversation ── */
  const activeConvo = useMemo(
    () => conversations.find((c) => c.id === activeConvoId),
    [conversations, activeConvoId],
  );
  useEffect(() => {
    if (activeConvo) setModel(activeConvo.model_used);
  }, [activeConvo]);

  /* ── Create new conversation ── */
  const handleNewChat = async () => {
    if (!companyId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        company_id: companyId,
        user_id: user.user.id,
        title: t("newChat"),
        model_used: model,
      })
      .select()
      .single();

    if (!error && data) {
      const convo = data as Conversation;
      setConversations((prev) => [convo, ...prev]);
      setActiveConvoId(convo.id);
      setSidebarOpen(false);
    }
  };

  /* ── Delete conversation ── */
  const handleDeleteConvo = async (convoId: string) => {
    setDeletingId(null);
    await supabase.from("ai_conversations").delete().eq("id", convoId);
    setConversations((prev) => prev.filter((c) => c.id !== convoId));
    if (activeConvoId === convoId) {
      setActiveConvoId(null);
      setMessages([]);
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !activeConvoId || !companyId) return;

    // Re-check balance before each message
    const balance = await checkAiActionBalance(supabase, companyId);
    setAiBalance(balance);
    if (!balance.allowed) return;

    setSending(true);
    setInputText("");

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Insert user message
    const { data: userMsg } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: activeConvoId,
        role: "user",
        content: text,
      })
      .select()
      .single();

    if (userMsg) {
      setMessages((prev) => [...prev, userMsg as Message]);
    }

    // Update title if first message
    const isFirstMessage = messages.filter((m) => m.role === "user").length === 0;
    if (isFirstMessage) {
      const title = text.length > 40 ? text.slice(0, 40) + "…" : text;
      await supabase
        .from("ai_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", activeConvoId);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvoId ? { ...c, title } : c)),
      );
    }

    // Build message history for AI context
    const chatHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    // Call real AI API
    let aiContent: string;
    try {
      const response = await fetch("/api/business/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify({
          messages: chatHistory,
          model,
          includeBusinessContext: true,
        }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
        aiContent = errBody.error ?? t("aiError");
        // If limit reached, update balance state
        if (response.status === 429) {
          setAiBalance({ allowed: false, reason: errBody.reason ?? "ai_limit_reached" });
        }
      } else {
        const data = (await response.json()) as { content?: string };
        aiContent = data.content ?? t("aiError");
      }
    } catch {
      aiContent = t("aiError");
    }

    // Insert AI response
    const { data: aiMsg } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: activeConvoId,
        role: "assistant",
        content: aiContent,
      })
      .select()
      .single();

    if (aiMsg) {
      setMessages((prev) => [...prev, aiMsg as Message]);
    }

    // Update message count
    await supabase
      .from("ai_conversations")
      .update({
        message_count: (activeConvo?.message_count ?? 0) + 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConvoId);

    setSending(false);
    void fetchConversations();
  };

  /* ── Handle Enter/Shift+Enter ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  /* ── Auto-grow textarea ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  /* ── Model change ── */
  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    if (activeConvoId) {
      await supabase
        .from("ai_conversations")
        .update({ model_used: newModel })
        .eq("id", activeConvoId);
    }
  };

  /* ── Relative time ── */
  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("time.justNow");
    if (mins < 60) return t("time.minsAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("time.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("time.daysAgo", { count: days });
  };

  /* ── Quick actions ── */
  const quickActions = [
    { key: "recordSale", label: t("quickActions.recordSale") },
    { key: "checkBalance", label: t("quickActions.checkBalance") },
    { key: "whatsOverdue", label: t("quickActions.whatsOverdue") },
  ];

  const handleQuickAction = (label: string) => {
    setInputText(label);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  if (companyLoading || enforcementLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  /* ── AI access blocked for free plan ── */
  if (aiAccess && !aiAccess.allowed) {
    return (
      <div className="flex items-center justify-center py-20">
        <UpgradePrompt
          feature={t("chatTitle")}
          currentPlan={aiAccess.currentPlan ?? "Free"}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-0 -mx-4 md:mx-0">
      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200
          md:static md:z-auto md:translate-x-0 md:w-[280px] md:rounded-l-2xl md:border md:border-gray-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            {t("conversations")}
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="app-primary-btn flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            {t("newChat")}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-gray-400">
              {t("noConversations")}
            </p>
          ) : (
            conversations.map((convo) => (
              <div key={convo.id} className="relative group">
                <button
                  onClick={() => {
                    setActiveConvoId(convo.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                    activeConvoId === convo.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{convo.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {relativeTime(convo.updated_at)}
                      </span>
                      {convo.message_count > 0 && (
                        <span className="text-[10px] text-gray-400">
                          · {convo.message_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Delete button */}
                {deletingId === convo.id ? (
                  <div className="absolute right-1 top-1 flex gap-1 bg-white rounded-lg shadow-md p-1">
                    <button
                      onClick={() => handleDeleteConvo(convo.id)}
                      className="text-[10px] text-red-600 px-2 py-1 hover:bg-red-50 rounded"
                    >
                      {t("confirmDelete")}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-[10px] text-gray-500 px-2 py-1 hover:bg-gray-50 rounded"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(convo.id)}
                    className="absolute right-2 top-2 hidden group-hover:flex p-1 rounded hover:bg-gray-200"
                  >
                    <Trash2 className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex flex-1 flex-col min-w-0 bg-white md:rounded-r-2xl md:border md:border-l-0 md:border-gray-200">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <Menu className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">
                {t("chatTitle")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Link
              href="/business/settings"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <Settings className="h-4 w-4 text-gray-500" />
            </Link>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeConvoId ? (
            /* Empty state — no conversation selected */
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mb-4">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                {t("emptyTitle")}
              </p>
              <p className="text-xs text-gray-400 max-w-xs mb-6">
                {t("emptyDesc")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map((qa) => (
                  <button
                    key={qa.key}
                    onClick={() => handleQuickAction(qa.label)}
                    className="app-secondary-btn px-3 py-1.5 text-xs"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty conversation */
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 mb-4">
                <Bot className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="text-xs text-gray-400 mb-4">{t("emptyConvoHint")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map((qa) => (
                  <button
                    key={qa.key}
                    onClick={() => handleQuickAction(qa.label)}
                    className="app-secondary-btn px-3 py-1.5 text-xs"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        {activeConvoId && (
          <div className="border-t border-gray-100 px-4 py-3">
            {aiBalance && !aiBalance.allowed ? (
              <AiLimitPrompt
                limit={aiBalance.limit ?? 0}
                used={aiBalance.used ?? 0}
              />
            ) : (
            <div className="flex items-end gap-2">
              {/* Attachment button (disabled) */}
              <button
                disabled
                title={t("attachmentComingSoon")}
                className="p-2 rounded-lg text-gray-300 cursor-not-allowed"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder")}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 max-h-[120px]"
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className={`p-2.5 rounded-xl transition ${
                  inputText.trim() && !sending
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
