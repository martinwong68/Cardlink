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
  Upload,
  Wrench,
  CalendarCheck,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  ArrowLeft,
  Loader2,
  History,
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
import AiPresetCard, {
  type PresetCardData,
  type ActionStep,
} from "@/components/business/AiPresetCard";

/* ── Types ── */
type AgentMode = "chat" | "setup" | "operations" | "review";

type Conversation = {
  id: string;
  title: string;
  model_used: string;
  message_count: number;
  agent_mode?: AgentMode;
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

type ReviewType = "daily" | "monthly" | "annual";

type ActionRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source_module: string | null;
  created_at: string;
};

/* ── Model tiers — auto-selected based on file size / operation complexity ── */
const MODEL_OPTIONS = [
  { value: "claude-haiku-4.5", label: "Haiku 4.5 (Fast)" },
  { value: "claude-sonnet-4.6", label: "Sonnet 4.6 (Balanced)" },
  { value: "claude-opus-4.6", label: "Opus 4.6 (Advanced)" },
] as const;

/** Byte thresholds for auto model selection */
const FILE_SIZE_SONNET_THRESHOLD = 500 * 1024; // 500 KB
const FILE_SIZE_OPUS_THRESHOLD = 5 * 1024 * 1024; // 5 MB

/** Max characters of file content to include in AI prompt */
const MAX_FILE_CONTENT_IN_PROMPT = 15000;

function selectModelForFile(fileSize: number): string {
  if (fileSize >= FILE_SIZE_OPUS_THRESHOLD) return "claude-opus-4.6";
  if (fileSize >= FILE_SIZE_SONNET_THRESHOLD) return "claude-sonnet-4.6";
  return "claude-haiku-4.5";
}

type UploadedFile = { name: string; content: string; size: number };

/* ── Preset operation definitions ── */
type PresetOperation = {
  key: string;
  labelKey: string;
  descKey: string;
  icon: typeof Bot;
  category: "accounting" | "inventory" | "report" | "crm" | "setup" | "review";
  /** Additional fields the user can fill in before running */
  fields: { key: string; labelKey: string; type: "text" | "number" | "date" | "textarea" | "file" | "account-select" }[];
  /** If true this is a "hard" operation that defaults to sonnet */
  complex?: boolean;
};

const PRESET_OPERATIONS: PresetOperation[] = [
  {
    key: "recordExpense",
    labelKey: "presets.recordExpense",
    descKey: "presets.recordExpenseDesc",
    icon: DollarSign,
    category: "accounting",
    fields: [
      { key: "amount", labelKey: "fields.amount", type: "number" },
      { key: "description", labelKey: "fields.description", type: "text" },
      { key: "date", labelKey: "fields.date", type: "date" },
      { key: "debitAccount", labelKey: "fields.debitAccount", type: "account-select" },
      { key: "creditAccount", labelKey: "fields.creditAccount", type: "account-select" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "createInvoice",
    labelKey: "presets.createInvoice",
    descKey: "presets.createInvoiceDesc",
    icon: FileText,
    category: "accounting",
    fields: [
      { key: "customerName", labelKey: "fields.customerName", type: "text" },
      { key: "amount", labelKey: "fields.amount", type: "number" },
      { key: "description", labelKey: "fields.description", type: "text" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "recordSale",
    labelKey: "presets.recordSale",
    descKey: "presets.recordSaleDesc",
    icon: ShoppingCart,
    category: "accounting",
    fields: [
      { key: "item", labelKey: "fields.item", type: "text" },
      { key: "amount", labelKey: "fields.amount", type: "number" },
      { key: "customerName", labelKey: "fields.customerName", type: "text" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "checkInventory",
    labelKey: "presets.checkInventory",
    descKey: "presets.checkInventoryDesc",
    icon: Package,
    category: "inventory",
    fields: [
      { key: "productName", labelKey: "fields.productName", type: "text" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "crmAddLead",
    labelKey: "presets.crmAddLead",
    descKey: "presets.crmAddLeadDesc",
    icon: Users,
    category: "crm",
    fields: [
      { key: "leadName", labelKey: "fields.leadName", type: "text" },
      { key: "email", labelKey: "fields.email", type: "text" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "generateReport",
    labelKey: "presets.generateReport",
    descKey: "presets.generateReportDesc",
    icon: BarChart3,
    category: "report",
    fields: [
      { key: "reportType", labelKey: "fields.reportType", type: "text" },
      { key: "dateRange", labelKey: "fields.dateRange", type: "text" },
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
    complex: true,
  },
  {
    key: "dailyReview",
    labelKey: "presets.dailyReview",
    descKey: "presets.dailyReviewDesc",
    icon: CheckCircle,
    category: "review",
    fields: [
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
  },
  {
    key: "monthlyAudit",
    labelKey: "presets.monthlyAudit",
    descKey: "presets.monthlyAuditDesc",
    icon: CalendarCheck,
    category: "report",
    fields: [
      { key: "notes", labelKey: "fields.notes", type: "textarea" },
    ],
    complex: true,
  },
];

const AGENT_MODES: { value: AgentMode; icon: typeof Bot; labelKey: string }[] = [
  { value: "chat", icon: MessageCircle, labelKey: "agentModes.chat" },
  { value: "setup", icon: Upload, labelKey: "agentModes.setup" },
  { value: "operations", icon: Wrench, labelKey: "agentModes.operations" },
  { value: "review", icon: CalendarCheck, labelKey: "agentModes.review" },
];

export default function BusinessAiPage() {
  const t = useTranslations("businessAi");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [model, setModel] = useState<string>("claude-haiku-4.5");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Agent mode state ── */
  const [agentMode, setAgentMode] = useState<AgentMode>("chat");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Preset workflow state ── */
  const [activePreset, setActivePreset] = useState<PresetOperation | null>(null);
  const [presetFields, setPresetFields] = useState<Record<string, string>>({});
  const [presetResult, setPresetResult] = useState<string | null>(null);
  const [presetRunning, setPresetRunning] = useState(false);
  const [presetCard, setPresetCard] = useState<PresetCardData | null>(null);
  const [presetExecuted, setPresetExecuted] = useState<string | null>(null);

  /* ── Accounts list for debit/credit selection ── */
  const [accountsList, setAccountsList] = useState<{ id: string; code: string; name: string; type: string }[]>([]);

  /* ── Plan enforcement ── */
  const [aiAccess, setAiAccess] = useState<PlanCheckResult | null>(null);
  const [aiBalance, setAiBalance] = useState<PlanCheckResult | null>(null);
  const [enforcementLoading, setEnforcementLoading] = useState(true);

  /* ── Operation history state ── */
  const [actionRecords, setActionRecords] = useState<ActionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  /* ── Load accounts for debit/credit selection ── */
  useEffect(() => {
    if (companyLoading || !companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounting/accounts", {
          headers: { "x-cardlink-app-scope": "business" },
        });
        if (res.ok) {
          const json = await res.json() as { accounts?: { id: string; code: string; name: string; type: string }[] };
          if (!cancelled && json.accounts) setAccountsList(json.accounts);
        }
      } catch {
        // Accounts may not be set up yet - that's okay
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, companyLoading]);

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

  /* ── Load operation history (ai_action_cards) ── */
  const fetchActionRecords = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("ai_action_cards")
      .select("id, title, description, status, source_module, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20);
    setActionRecords((data as ActionRecord[]) ?? []);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void fetchActionRecords();
  }, [companyLoading, companyId, fetchActionRecords]);

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
        agent_mode: agentMode,
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

    // Determine which endpoint to call based on agent mode
    const currentMode = activeConvo?.agent_mode ?? agentMode;
    let apiUrl = "/api/business/ai/chat";
    type ChatApiBody = { messages: typeof chatHistory; model: string; includeBusinessContext: boolean };
    type SetupApiBody = { messages: typeof chatHistory; model: string; fileContent?: string; fileName?: string };
    type OpsApiBody = { messages: typeof chatHistory; model: string };
    let apiBody: ChatApiBody | SetupApiBody | OpsApiBody = {
      messages: chatHistory,
      model,
      includeBusinessContext: true,
    };

    if (currentMode === "setup") {
      apiUrl = "/api/business/ai/setup";
      const firstFile = uploadedFiles[0] ?? null;
      apiBody = {
        messages: chatHistory,
        model,
        ...(firstFile ? { fileContent: firstFile.content, fileName: firstFile.name } : {}),
      };
    } else if (currentMode === "operations") {
      apiUrl = "/api/business/ai/operations";
      apiBody = { messages: chatHistory, model };
    }

    // Call AI API
    let aiContent: string;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify(apiBody),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
        aiContent = errBody.error ?? t("aiError");
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

    // Clear uploaded files after first use
    if (uploadedFiles.length > 0) setUploadedFiles([]);

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

  /* ── File upload handler — auto-selects model based on file size, supports multiple files ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Auto-select model tier based on the largest file size
    const maxSize = Math.max(...fileArray.map((f) => f.size));
    const autoModel = selectModelForFile(maxSize);
    setModel(autoModel);

    // Read all files
    for (const file of fileArray) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const isText = ["csv", "tsv", "txt", "json", "xml"].includes(ext);

      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, content: reader.result as string, size: file.size },
        ]);
      };
      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }

    // Reset input so the same files can be re-uploaded
    e.target.value = "";
  };

  /* ── Execute a preset operation ── */
  const handleRunPreset = async () => {
    if (!activePreset || !companyId || presetRunning) return;

    // Re-check balance
    const balance = await checkAiActionBalance(supabase, companyId);
    setAiBalance(balance);
    if (!balance.allowed) return;

    setPresetRunning(true);
    setPresetResult(null);

    // Build a structured prompt from the preset + user fields
    const fieldEntries = Object.entries(presetFields).filter(([, v]) => (v as string).trim());
    const fieldSummary = fieldEntries
      .map(([k, v]) => `- ${k}: ${v as string}`)
      .join("\n");

    // Choose model — auto-upgrade for complex ops or large files
    let selectedModel = model;
    if (activePreset.complex && selectedModel === "claude-haiku-4.5") {
      selectedModel = "claude-sonnet-4.6";
      setModel(selectedModel);
    }
    if (uploadedFiles.length > 0) {
      const maxFileSize = Math.max(...uploadedFiles.map((f) => f.size));
      const fileModel = selectModelForFile(maxFileSize);
      if (fileModel !== "claude-haiku-4.5") {
        selectedModel = fileModel;
        setModel(selectedModel);
      }
    }

    // Prepare file context for the prompt (all uploaded files)
    let fileContext = "";
    if (uploadedFiles.length > 0) {
      const perFileLimit = Math.floor(MAX_FILE_CONTENT_IN_PROMPT / uploadedFiles.length);
      const fileContextParts = uploadedFiles.map((file, idx) => {
        const ext = file.name.toLowerCase().split(".").pop() ?? "";
        const isImage = ["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext);
        const isPdf = ext === "pdf";
        const isBinary = isImage || isPdf || ext === "xlsx";

        if (isBinary) {
          return `ATTACHED FILE ${idx + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${ext.toUpperCase()} format)
NOTE: This is a ${isImage ? "image" : isPdf ? "PDF document" : "binary"} file. The file data is attached as base64.
If you can read the content, extract relevant data from it. If you cannot fully read it, mention in the summary what you found or that the file could not be fully processed and suggest the user enter the data manually.
FILE DATA (base64):
${file.content.slice(0, perFileLimit)}`;
        } else {
          return `ATTACHED FILE ${idx + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
FILE CONTENT:
${file.content.slice(0, perFileLimit)}${file.content.length > perFileLimit ? "\n... (truncated)" : ""}`;
        }
      });
      fileContext = fileContextParts.join("\n\n");
    }

    const prompt = `You are Cardlink AI assistant. The user wants to perform this operation:

OPERATION: ${activePreset.key}
CATEGORY: ${activePreset.category}

USER INPUT:
${fieldSummary || "(No additional input provided)"}

${fileContext}

SUPPORTED OPERATIONS (use ONLY these exact module + operation combinations):
- module: "accounting", operation: "record_expense" — params: { amount: number (required), description: string (required), category: string (optional, e.g. "Office Supplies"), date: "YYYY-MM-DD" (optional) }
- module: "accounting", operation: "create_invoice" — params: { customer_name: string (required), amount: number (required), due_date: "YYYY-MM-DD" (optional), notes: string (optional) }
- module: "accounting", operation: "create_journal_entry" — params: { description: string, date: "YYYY-MM-DD", entries: [{account: string, debit: number, credit: number}] }
- module: "accounting", operation: "record_payment" — params: { amount: number (required), payment_method: string (e.g. "cash","bank_transfer","credit_card"), reference: string, date: "YYYY-MM-DD", description: string (optional) }
- module: "inventory", operation: "check_stock" — params: { product_name: string }
- module: "inventory", operation: "adjust_stock" — params: { product_name: string, quantity: number (new on-hand quantity) }
- module: "inventory", operation: "add_product" — params: { name: string (required), sku: string (optional), quantity: number (optional, initial stock), unit: string (optional, default "pcs") }
- module: "pos", operation: "record_sale" — params: { amount: number (required, total including tax), payment_method: string, customer_name: string, items: [{name: string, qty: number, unit_price: number}] (optional) }
- module: "crm", operation: "add_lead" — params: { name: string (required), email: string, phone: string, source: string }
- module: "crm", operation: "add_contact" — params: { name: string (required), email: string, phone: string }

You MUST respond with ONLY a JSON object wrapped in \`\`\`json ... \`\`\` code fences. No text before or after.

The JSON object must have:
1. "summary" — Short sentence describing what will be done. If a file was attached but had issues, mention it here.
2. "actions" — Array of action steps. Each step:
   - "label": Human-readable description
   - "module": One of: accounting, inventory, crm, pos
   - "operation": One of the exact operation names listed above
   - "params": Object with parameter values matching the schema above
3. "questions" — Array of clarification questions (empty array [] if all info is provided). Each:
   - "id": e.g. "q1"
   - "question": The question text
   - "options": Array of 2-5 suggested options
   - "allowOther": true
   If a question answer should fill a param, set that param to "{{question_id}}".

\`\`\`json
{
  "summary": "Record a $150 office supply expense",
  "actions": [
    {
      "label": "Record expense of $150 for office supplies",
      "module": "accounting",
      "operation": "record_expense",
      "params": { "amount": 150, "description": "Office supplies", "category": "Office Supplies" }
    }
  ],
  "questions": []
}
\`\`\``;

    const messages = [{ role: "user" as const, content: prompt }];

    // Determine endpoint based on category
    let apiUrl = "/api/business/ai/operations";
    if (activePreset.category === "review") apiUrl = "/api/business/ai/review";

    // For review category, use the review endpoint format
    if (activePreset.category === "review") {
      const reviewType: ReviewType = activePreset.key === "dailyReview" ? "daily" : "monthly";
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-cardlink-app-scope": "business" },
          body: JSON.stringify({ reviewType, model: selectedModel }),
        });
        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as { error?: string };
          setPresetResult(errBody.error ?? t("aiError"));
        } else {
          const data = (await response.json()) as { content?: string };
          setPresetResult(data.content ?? t("aiError"));
        }
      } catch {
        setPresetResult(t("aiError"));
      }
    } else {
      // Use operations endpoint for all non-review presets
      try {
        const bodyPayload = {
          messages,
          model: selectedModel,
          includeBusinessContext: true,
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-cardlink-app-scope": "business" },
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
          setPresetResult(errBody.error ?? t("aiError"));
          if (response.status === 429) {
            setAiBalance({ allowed: false, reason: errBody.reason ?? "ai_limit_reached" });
          }
        } else {
          const data = (await response.json()) as { content?: string };
          const content = data.content ?? "";

          // Try to parse structured JSON card from AI response
          const parsed = parsePresetCardJson(content);
          if (parsed) {
            setPresetCard(parsed);
            setPresetResult(null);
          } else {
            // Fallback: show raw text if JSON parsing fails
            setPresetResult(content || t("aiError"));
          }
        }
      } catch {
        setPresetResult(t("aiError"));
      }
    }

    // Clear files after use
    if (uploadedFiles.length > 0) setUploadedFiles([]);
    setPresetRunning(false);
  };

  /* ── Parse structured JSON card from AI response ── */
  const parsePresetCardJson = (content: string): PresetCardData | null => {
    try {
      // Try extracting JSON from multiple possible code fence formats
      const patterns = [
        /```json\s*([\s\S]*?)```/,
        /```action-plan\s*([\s\S]*?)```/,
        /```\s*([\s\S]*?)```/,
      ];

      let rawText: string | null = null;
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match?.[1]) {
          rawText = match[1].trim();
          break;
        }
      }

      // Fallback: try parsing the entire content as JSON
      if (!rawText) rawText = content.trim();

      const raw = JSON.parse(rawText) as Record<string, unknown>;

      // Handle both preset card format (summary/actions) and action-plan format (intent/steps)
      const summary = raw.summary ?? raw.intent;
      const actions = raw.actions ?? raw.steps;
      if (!summary || !Array.isArray(actions)) return null;

      return {
        summary: String(summary),
        actions: (actions as Array<Record<string, unknown>>).map((a) => ({
          label: String(a.label ?? a.operation ?? ""),
          module: String(a.module ?? "general"),
          operation: String(a.operation ?? ""),
          params: (a.params ?? {}) as Record<string, unknown>,
        })),
        questions: Array.isArray(raw.questions)
          ? (raw.questions as Array<Record<string, unknown>>).map((q) => ({
              id: String(q.id ?? ""),
              question: String(q.question ?? ""),
              options: Array.isArray(q.options) ? (q.options as string[]).map(String) : [],
              allowOther: q.allowOther !== false,
            }))
          : [],
      };
    } catch {
      return null;
    }
  };

  /* ── Execute confirmed preset card actions ── */
  const handlePresetCardConfirm = async (
    answers: Record<string, string>,
    actions: ActionStep[],
  ) => {
    try {
      const response = await fetch("/api/business/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cardlink-app-scope": "business" },
        body: JSON.stringify({ steps: actions, answers }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        setPresetExecuted(errBody.error ?? t("aiError"));
      } else {
        const data = (await response.json()) as { message?: string; results?: Array<{ step: number; label: string; success: boolean; error?: string }> };
        const lines = (data.results ?? []).map(
          (r) => `${r.success ? "✓" : "✗"} Step ${r.step}: ${r.label}${r.error ? ` — ${r.error}` : ""}`,
        );
        setPresetExecuted(
          `${data.message ?? "Done"}\n\n${lines.join("\n")}`,
        );
      }
    } catch {
      setPresetExecuted(t("aiError"));
    }
    setPresetCard(null);
    // Refresh operation history after execution
    void fetchActionRecords();
  };

  const handlePresetCardCancel = () => {
    setPresetCard(null);
    setPresetResult(null);
  };

  /* ── Trigger business review ── */
  const handleTriggerReview = async (reviewType: ReviewType) => {
    if (!companyId || reviewLoading) return;
    setReviewLoading(true);

    try {
      const response = await fetch("/api/business/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify({ reviewType, model }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        // Show as assistant message if we have an active convo
        if (activeConvoId) {
          const content = errBody.error ?? t("aiError");
          const { data: aiMsg } = await supabase
            .from("ai_messages")
            .insert({ conversation_id: activeConvoId, role: "assistant", content })
            .select()
            .single();
          if (aiMsg) setMessages((prev) => [...prev, aiMsg as Message]);
        }
      } else {
        const data = (await response.json()) as { content?: string };
        const content = data.content ?? t("aiError");
        // Create convo if needed
        let convoId = activeConvoId;
        if (!convoId) {
          await handleNewChat();
          convoId = activeConvoId;
        }
        if (convoId) {
          // Insert the review trigger message
          const { data: userMsg } = await supabase
            .from("ai_messages")
            .insert({
              conversation_id: convoId,
              role: "user",
              content: t("reviewTrigger", { type: reviewType }),
            })
            .select()
            .single();
          if (userMsg) setMessages((prev) => [...prev, userMsg as Message]);

          // Insert the review result
          const { data: aiMsg } = await supabase
            .from("ai_messages")
            .insert({ conversation_id: convoId, role: "assistant", content })
            .select()
            .single();
          if (aiMsg) setMessages((prev) => [...prev, aiMsg as Message]);
        }
      }
    } catch {
      // silent
    }
    setReviewLoading(false);
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

  /* ── Quick actions (mode-aware) ── */
  const quickActions = useMemo(() => {
    const currentMode = activeConvo?.agent_mode ?? agentMode;
    switch (currentMode) {
      case "setup":
        return [
          { key: "uploadAccounting", label: t("quickActions.uploadAccounting") },
          { key: "uploadInventory", label: t("quickActions.uploadInventory") },
          { key: "uploadContacts", label: t("quickActions.uploadContacts") },
        ];
      case "operations":
        return [
          { key: "recordSale", label: t("quickActions.recordSale") },
          { key: "createInvoice", label: t("quickActions.createInvoice") },
          { key: "checkInventory", label: t("quickActions.checkInventory") },
        ];
      case "review":
        return [
          { key: "dailyReview", label: t("quickActions.dailyReview") },
          { key: "monthlyAudit", label: t("quickActions.monthlyAudit") },
          { key: "annualReview", label: t("quickActions.annualReview") },
        ];
      default:
        return [
          { key: "recordSale", label: t("quickActions.recordSale") },
          { key: "checkBalance", label: t("quickActions.checkBalance") },
          { key: "whatsOverdue", label: t("quickActions.whatsOverdue") },
        ];
    }
  }, [agentMode, activeConvo, t]);

  const handleQuickAction = (label: string, key?: string) => {
    // Handle review triggers directly
    if (key === "dailyReview") {
      void handleTriggerReview("daily");
      return;
    }
    if (key === "monthlyAudit") {
      void handleTriggerReview("monthly");
      return;
    }
    if (key === "annualReview") {
      void handleTriggerReview("annual");
      return;
    }
    // Handle file upload triggers
    if (key === "uploadAccounting" || key === "uploadInventory" || key === "uploadContacts") {
      fileInputRef.current?.click();
      return;
    }
    setInputText(label);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  /* ── Handle selecting a preset operation ── */
  const handleSelectPreset = (preset: PresetOperation) => {
    setActivePreset(preset);
    setPresetFields({});
    setPresetResult(null);
    setPresetCard(null);
    setPresetExecuted(null);
    setUploadedFiles([]);
    // Set default model based on complexity
    if (preset.complex) {
      setModel("claude-sonnet-4.6");
    } else {
      setModel("claude-haiku-4.5");
    }
  };

  const handleBackToPresets = () => {
    setActivePreset(null);
    setPresetFields({});
    setPresetResult(null);
    setPresetCard(null);
    setPresetExecuted(null);
    setUploadedFiles([]);
    setModel("claude-haiku-4.5");
  };

  const handleClearUploadedFile = (index?: number) => {
    if (index !== undefined) {
      setUploadedFiles((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // Reset model if no files left after removal
        if (updated.length === 0) {
          setModel(activePreset?.complex ? "claude-sonnet-4.6" : "claude-haiku-4.5");
        }
        return updated;
      });
    } else {
      setUploadedFiles([]);
      setModel(activePreset?.complex ? "claude-sonnet-4.6" : "claude-haiku-4.5");
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
            AI Assistant
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

        {/* ── Previous AI Actions (Primary Section) ── */}
        <div className="border-b border-gray-100">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-gray-700">
                {t("operationHistory")}
              </span>
            </div>
            <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              {actionRecords.length}
            </span>
          </div>
          <div className="px-2 pb-2 max-h-64 overflow-y-auto space-y-1">
            {actionRecords.length === 0 ? (
              <p className="px-3 py-3 text-center text-[10px] text-gray-400">
                {t("noOperationHistory")}
              </p>
            ) : (
              actionRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 hover:bg-gray-100 transition cursor-default"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {record.status === "approved" ? (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    ) : record.status === "rejected" ? (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                    <span className="text-[10px] font-medium text-gray-700 truncate">
                      {record.title}
                    </span>
                  </div>
                  {record.description && (
                    <p className="text-[9px] text-gray-400 line-clamp-2 pl-4.5 ml-1">
                      {record.description.slice(0, 120)}
                      {record.description.length > 120 ? "..." : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 pl-4.5 ml-1">
                    {record.source_module && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                        {record.source_module}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      record.status === "approved" ? "bg-green-50 text-green-600" :
                      record.status === "rejected" ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    }`}>
                      {record.status}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {relativeTime(record.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Conversations (Secondary Section, Collapsible) ── */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">
                {t("conversations")}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">
              {conversations.length} {showHistory ? "▲" : "▼"}
            </span>
          </button>
          {showHistory && (
            <div className="px-2 pb-2 max-h-48 overflow-y-auto">
              {loadingConvos ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-3 py-3 text-center text-[10px] text-gray-400">
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
          )}
        </div>
      </aside>

      {/* ── Main content area ── */}
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
            {/* Model indicator */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-[10px] text-gray-500">
              <span className="hidden sm:inline">{t("modelLabel")}:</span>
              <span className="font-medium text-gray-700">
                {MODEL_OPTIONS.find((m) => m.value === model)?.label ?? model}
              </span>
            </div>
            <Link
              href="/business/settings"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <Settings className="h-4 w-4 text-gray-500" />
            </Link>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.json,.xml,.xlsx,.pdf,.png,.jpg,.jpeg,.gif,.webp,.heic"
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />

          {aiBalance && !aiBalance.allowed ? (
            <div className="flex items-center justify-center h-full">
              <AiLimitPrompt
                limit={aiBalance.limit ?? 0}
                used={aiBalance.used ?? 0}
              />
            </div>
          ) : activePreset ? (
            /* ── Preset operation form ── */
            <div className="max-w-2xl mx-auto">
              {/* Back button */}
              <button
                onClick={handleBackToPresets}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="h-3 w-3" />
                {t("backToPresets")}
              </button>

              {/* Preset header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                  <activePreset.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {t(activePreset.labelKey)}
                  </h2>
                  <p className="text-xs text-gray-500">{t(activePreset.descKey)}</p>
                </div>
              </div>

              {/* Dynamic fields */}
              <div className="space-y-4">
                {activePreset.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t(field.labelKey)}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={presetFields[field.key] ?? ""}
                        onChange={(e) => setPresetFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={t("optionalNotes")}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    ) : field.type === "account-select" ? (
                      <select
                        value={presetFields[field.key] ?? ""}
                        onChange={(e) => setPresetFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      >
                        <option value="">Auto (let AI decide)</option>
                        {accountsList.map((acct) => (
                          <option key={acct.id} value={`${acct.code} – ${acct.name}`}>
                            {acct.code} – {acct.name} ({acct.type})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={presetFields[field.key] ?? ""}
                        onChange={(e) => setPresetFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    )}
                  </div>
                ))}

                {/* File attachment — available on all presets, supports multiple files */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("attachFile")}
                  </label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-sm text-gray-500"
                  >
                    <Paperclip className="h-4 w-4 text-indigo-500" />
                    {uploadedFiles.length > 0
                      ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} attached`
                      : t("attachFileHint")}
                  </button>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate flex-1">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] text-indigo-500 shrink-0">
                              → {MODEL_OPTIONS.find((m) => m.value === model)?.label}
                            </span>
                          )}
                          <button
                            onClick={() => handleClearUploadedFile(idx)}
                            className="p-0.5 hover:bg-indigo-100 rounded shrink-0"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Run button */}
              <button
                onClick={handleRunPreset}
                disabled={presetRunning}
                className="mt-6 w-full app-primary-btn flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium"
              >
                {presetRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("runOperation")}
                  </>
                )}
              </button>

              {/* Result area — AI Action Card */}
              {presetCard && (
                <AiPresetCard
                  data={presetCard}
                  onConfirm={handlePresetCardConfirm}
                  onCancel={handlePresetCardCancel}
                />
              )}

              {/* Execution result */}
              {presetExecuted && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">{t("executionComplete")}</span>
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {presetExecuted}
                  </div>
                </div>
              )}

              {/* Fallback: plain text result (when JSON parsing fails) */}
              {presetResult && !presetCard && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-gray-700">{t("aiResponse")}</span>
                    <span className="text-[10px] text-gray-400">
                      ({MODEL_OPTIONS.find((m) => m.value === model)?.label})
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {presetResult}
                  </div>
                </div>
              )}
            </div>
          ) : !activeConvoId ? (
            /* ── Preset operations grid ── */
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-3">
                  <Bot className="h-7 w-7 text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800 mb-1">
                  {t("presetTitle")}
                </h2>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {t("presetDesc")}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_OPERATIONS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => handleSelectPreset(preset)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 transition"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                        <Icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-800">
                        {t(preset.labelKey)}
                      </span>
                      <span className="text-[10px] text-gray-400 line-clamp-2">
                        {t(preset.descKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty conversation — show quick actions */
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 mb-4">
                <Bot className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="text-xs text-gray-400 mb-4">{t("emptyConvoHint")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map((qa) => (
                  <button
                    key={qa.key}
                    onClick={() => handleQuickAction(qa.label, qa.key)}
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

        {/* Input area — only shown when inside a conversation */}
        {activeConvoId && (
          <div className="border-t border-gray-100 px-4 py-3">
            {aiBalance && !aiBalance.allowed ? (
              <AiLimitPrompt
                limit={aiBalance.limit ?? 0}
                used={aiBalance.used ?? 0}
              />
            ) : (
            <>
            {/* File upload indicator */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate flex-1">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={() => handleClearUploadedFile(idx)}
                      className="p-0.5 hover:bg-indigo-100 rounded"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title={t("uploadFile")}
                className="p-2 rounded-lg transition text-indigo-600 hover:bg-indigo-50"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t(`inputPlaceholder_${(activeConvo?.agent_mode ?? agentMode)}`)}
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
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
