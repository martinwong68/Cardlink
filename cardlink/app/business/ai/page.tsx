"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Mic,
  MicOff,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  History,
  FileText,
  ChevronDown,
  ChevronUp,
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

type DocumentActionStep = {
  label: string;
  module: string;
  operation: string;
  params: Record<string, unknown>;
};

type ProcessResult = {
  documentType: string;
  summary: string;
  steps: DocumentActionStep[];
};

type StepStatus = "pending" | "success" | "error";

type StepRow = DocumentActionStep & {
  id: string;
  selected: boolean;
  status: StepStatus;
  errorMessage?: string;
  editing: boolean;
  paramsJson: string;
};

type UploadedFile = {
  name: string;
  content: string; // text or base64
  size: number;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXTENSIONS = [
  ".csv",
  ".tsv",
  ".txt",
  ".json",
  ".xml",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
];

/* ── Helpers ── */

function generateId(): string {
  return crypto.randomUUID();
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 payload from data URL (data:<mime>;base64,<payload>)
      const commaIdx = result.indexOf(",");
      const base64 = commaIdx !== -1 ? result.slice(commaIdx + 1) : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readUploadedFile(file: File): Promise<UploadedFile | null> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  let content: string;
  if (isImage || isPdf) {
    // PDFs and images are read as base64 for server-side processing
    content = await readFileAsDataURL(file);
  } else {
    content = await readFileAsText(file);
  }

  return { name: file.name, content, size: file.size };
}

/* ── Web Speech API types ── */

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Main Page Component                                              */
/* ══════════════════════════════════════════════════════════════════ */

export default function AiPage() {
  const t = useTranslations("businessAi");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  /* ── Plan enforcement ── */
  const [aiAccess, setAiAccess] = useState<PlanCheckResult | null>(null);
  const [aiBalance, setAiBalance] = useState<PlanCheckResult | null>(null);
  const [enforcementLoading, setEnforcementLoading] = useState(true);

  useEffect(() => {
    if (companyLoading || !companyId) return;
    let cancelled = false;
    const fn = async () => {
      const [access, balance] = await Promise.all([
        checkAiAccess(supabase, companyId),
        checkAiActionBalance(supabase, companyId),
      ]);
      if (!cancelled) {
        setAiAccess(access);
        setAiBalance(balance);
        setEnforcementLoading(false);
      }
    };
    void fn();
    return () => {
      cancelled = true;
    };
  }, [companyId, companyLoading, supabase]);

  /* ── Upload state ── */
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Voice state ── */
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  /* ── Text instruction state ── */
  const [textInstruction, setTextInstruction] = useState<string>("");

  /* ── Processing state ── */
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  /** Increment to trigger processing — avoids stale closure in useEffect */
  const [processKey, setProcessKey] = useState(0);

  /* ── Results state ── */
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [rows, setRows] = useState<StepRow[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionDone, setExecutionDone] = useState(false);
  const [executionCount, setExecutionCount] = useState(0);
  const [showParams, setShowParams] = useState<Record<string, boolean>>({});

  /* ── Check voice support ── */
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !window.SpeechRecognition &&
      !window.webkitSpeechRecognition
    ) {
      setVoiceSupported(false);
    }
  }, []);

  /* ── File upload handlers ── */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setFileError(null);
      const fileArray = Array.from(files);
      const valid: UploadedFile[] = [];

      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          setFileError(t("fileTooBig"));
          continue;
        }
        const ext = "." + (file.name.toLowerCase().split(".").pop() ?? "");
        if (!ACCEPTED_EXTENSIONS.includes(ext)) continue;

        const uploaded = await readUploadedFile(file);
        if (uploaded) valid.push(uploaded);
      }

      if (valid.length > 0) {
        setUploadedFiles((prev) => [...prev, ...valid]);
        // Reset results when new files are added
        setResult(null);
        setRows([]);
        setExecutionDone(false);
        setProcessError(null);
        // Don't auto-process — let the user add text instruction and click Process
      }
    },
    [t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Voice input ── */
  const startRecording = useCallback(() => {
    if (!voiceSupported) return;
    const SpeechRec =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = navigator.language ?? "en-US";

    rec.onresult = (event) => {
      const results = Array.from(
        event.results as ArrayLike<ArrayLike<{ transcript: string }>>,
      );
      const transcript = results
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      setVoiceTranscript(transcript);
      setIsRecording(false);
      // Trigger processing for voice-only input
      setProcessKey((k) => k + 1);
    };

    rec.onerror = () => {
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
    setVoiceTranscript("");
  }, [voiceSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  /* ── Process document ── */
  const uploadedFilesRef = useRef<UploadedFile[]>([]);
  const voiceTranscriptRef = useRef<string>("");
  const textInstructionRef = useRef<string>("");
  uploadedFilesRef.current = uploadedFiles;
  voiceTranscriptRef.current = voiceTranscript;
  textInstructionRef.current = textInstruction;

  const processDocuments = useCallback(async () => {
    const files = uploadedFilesRef.current;
    const transcript = voiceTranscriptRef.current;
    const instruction = textInstructionRef.current;
    // Combine voice + text instructions
    const combinedInstruction = [transcript, instruction].filter(Boolean).join("\n").trim();
    if (files.length === 0 && !combinedInstruction) return;
    setProcessing(true);
    setProcessError(null);
    setResult(null);
    setRows([]);
    setExecutionDone(false);

    try {
      // Process the first file; instruction is sent alongside
      const file = files[0];
      const payload: Record<string, unknown> = {
        voiceInstruction: combinedInstruction || undefined,
      };

      if (file) {
        payload.fileContent = file.content;
        payload.fileName = file.name;
      } else {
        // Text/voice-only: send the instruction as a "virtual" text file
        payload.fileContent = combinedInstruction;
        payload.fileName = "text-instruction.txt";
      }

      const res = await fetch("/api/business/ai/process-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unknown error");
      }

      const data = (await res.json()) as ProcessResult;
      setResult(data);

      // Build rows from steps
      const stepRows: StepRow[] = (data.steps ?? []).map((step) => ({
        ...step,
        id: generateId(),
        selected: true,
        status: "pending",
        editing: false,
        paramsJson: JSON.stringify(step.params, null, 2),
      }));
      setRows(stepRows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setProcessError(msg);
    } finally {
      setProcessing(false);
    }
  }, []);

  /* ── Auto-process when processKey changes (triggered by file upload or voice) ── */
  useEffect(() => {
    if (processKey > 0) {
      void processDocuments();
    }
  }, [processKey, processDocuments]);

  /* ── Row editing ── */
  const toggleSelected = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleEdit = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, editing: !r.editing } : r)),
    );
  };

  const updateParamsJson = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, paramsJson: value } : r)),
    );
  };

  const saveRowEdit = (id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        try {
          const parsed = JSON.parse(r.paramsJson) as Record<string, unknown>;
          return { ...r, params: parsed, editing: false };
        } catch {
          return r;
        }
      }),
    );
  };

  /* ── Toggle params visibility ── */
  const toggleParams = (id: string) => {
    setShowParams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Execute confirmed steps ── */
  const executeSteps = useCallback(async () => {
    const selectedRows = rows.filter((r) => r.selected && r.status === "pending");
    if (selectedRows.length === 0) return;

    setExecuting(true);

    try {
      const stepsPayload = selectedRows.map((r) => ({
        label: r.label,
        module: r.module,
        operation: r.operation,
        params: r.params,
      }));

      const res = await fetch("/api/business/ai/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify({ steps: stepsPayload }),
      });

      const json = (await res.json()) as {
        results?: Array<{ stepIndex: number; success: boolean; error?: string }>;
        successCount?: number;
      };

      let successCount = 0;
      if (json.results) {
        setRows((prev) =>
          prev.map((row) => {
            if (!row.selected || row.status !== "pending") return row;
            const idx = selectedRows.findIndex((s) => s.id === row.id);
            if (idx === -1) return row;
            const resultItem = json.results?.[idx];
            if (!resultItem) return row;
            if (resultItem.success) successCount++;
            return {
              ...row,
              status: resultItem.success ? "success" : "error",
              errorMessage: resultItem.error,
            };
          }),
        );
      } else {
        successCount = json.successCount ?? selectedRows.length;
      }

      setExecutionCount(successCount);
      setExecutionDone(true);
    } catch (err) {
      console.error("[execute]", err);
    } finally {
      setExecuting(false);
    }
  }, [rows]);

  const resetAll = () => {
    setUploadedFiles([]);
    setVoiceTranscript("");
    setTextInstruction("");
    setResult(null);
    setRows([]);
    setProcessError(null);
    setExecutionDone(false);
    setExecutionCount(0);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Loading state ── */
  if (companyLoading || enforcementLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ── Plan gate ── */
  if (aiAccess && !aiAccess.allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <UpgradePrompt
          feature="AI Document Processor"
          currentPlan={aiAccess.currentPlan ?? "Free"}
          description={t("planError")}
        />
      </div>
    );
  }

  if (aiBalance && !aiBalance.allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <AiLimitPrompt
          limit={aiBalance.limit ?? 0}
          used={aiBalance.used ?? 0}
        />
      </div>
    );
  }

  const selectedCount = rows.filter(
    (r) => r.selected && r.status === "pending",
  ).length;

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        <div className="mt-3 flex justify-center">
          <Link
            href="/business/ai/history"
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
          >
            <History className="h-3.5 w-3.5" />
            {t("historyLink")}
          </Link>
        </div>
      </div>

      {/* ── Upload Zone ── */}
      {!processing && !result && !executionDone && (
        <div className="app-card p-6 mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            {t("uploadTitle")}
          </h2>

          {/* Drop zone */}
          <div
            className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload
              className={`mb-3 h-10 w-10 ${isDragging ? "text-indigo-500" : "text-gray-400"}`}
            />
            {isDragging ? (
              <p className="text-sm font-medium text-indigo-600">
                {t("dropHereActive")}
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">
                  {t("uploadDesc")}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {t("acceptedFormats")}
                </p>
              </>
            )}
          </div>

          {/* File error */}
          {fileError && (
            <p className="mt-2 text-xs text-red-500">{fileError}</p>
          )}

          {/* Uploaded file list */}
          {uploadedFiles.length > 0 && (
            <ul className="mt-3 space-y-1">
              {uploadedFiles.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {f.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-indigo-400 hover:text-red-500"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Text instruction input */}
          <div className="mt-4">
            <label htmlFor="text-instruction" className="block text-xs font-medium text-gray-600 mb-1">
              {t("instructionLabel")}
            </label>
            <textarea
              id="text-instruction"
              value={textInstruction}
              onChange={(e) => setTextInstruction(e.target.value)}
              placeholder={t("instructionPlaceholder")}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Voice input (compact) */}
          {voiceSupported && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-10 w-10 items-center justify-center rounded-full shadow transition-all focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  isRecording
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                }`}
                title={isRecording ? t("voiceRecording") : t("voiceButton")}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              <span className="text-xs text-gray-400">
                {isRecording ? t("voiceRecording") : t("voiceButton")}
              </span>
              {voiceTranscript && (
                <span className="text-xs text-gray-600 truncate flex-1">
                  {voiceTranscript}
                </span>
              )}
            </div>
          )}

          {/* Process button */}
          {(uploadedFiles.length > 0 || textInstruction.trim() || voiceTranscript) && (
            <button
              onClick={() => setProcessKey((k) => k + 1)}
              className="mt-4 w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("processButton")}
            </button>
          )}
        </div>
      )}

      {/* ── Processing State ── */}
      {processing && (
        <div className="app-card p-10 mb-6 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-800">
              {uploadedFiles.length > 0
                ? t("processing")
                : t("processingVoice")}
            </p>
            <p className="mt-1 text-sm text-gray-500">{t("processingDesc")}</p>
          </div>
        </div>
      )}

      {/* ── Process Error ── */}
      {processError && (
        <div className="app-card p-4 mb-6 flex items-center gap-3 border border-red-200 bg-red-50">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">{processError}</p>
          </div>
          <button
            onClick={resetAll}
            className="text-xs text-red-500 hover:underline"
          >
            {t("uploadAnother")}
          </button>
        </div>
      )}

      {/* ── Execution Done Banner ── */}
      {executionDone && (
        <div className="app-card p-5 mb-6 flex items-center gap-3 border border-green-200 bg-green-50">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              {t("executionComplete", { count: executionCount })}
            </p>
          </div>
          <button
            onClick={resetAll}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            {t("uploadAnother")}
          </button>
        </div>
      )}

      {/* ── Results Preview Table ── */}
      {result && rows.length > 0 && (
        <div className="app-card p-6 mb-6">
          {/* Summary */}
          <div className="mb-4 rounded-xl bg-indigo-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
              {t("documentType")}: {result.documentType}
            </p>
            <p className="mt-0.5 text-sm text-indigo-700">{result.summary}</p>
          </div>

          <h2 className="mb-1 text-sm font-semibold text-gray-700">
            {t("previewTitle")}
          </h2>
          <p className="mb-4 text-xs text-gray-400">{t("previewDesc")}</p>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border p-3 transition-colors ${
                  row.status === "success"
                    ? "border-green-200 bg-green-50"
                    : row.status === "error"
                      ? "border-red-200 bg-red-50"
                      : row.selected
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  {row.status === "pending" && (
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleSelected(row.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  )}
                  {row.status === "success" && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  )}
                  {row.status === "error" && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {row.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {row.module} / {row.operation}
                    </p>
                    {row.status === "error" && row.errorMessage && (
                      <p className="mt-1 text-xs text-red-600">
                        {row.errorMessage}
                      </p>
                    )}

                    {/* Params toggle */}
                    <button
                      onClick={() => toggleParams(row.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showParams[row.id] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      params
                    </button>

                    {showParams[row.id] && (
                      <div className="mt-2">
                        {row.editing ? (
                          <div>
                            <textarea
                              className="w-full rounded-lg border border-gray-200 p-2 font-mono text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              rows={6}
                              value={row.paramsJson}
                              onChange={(e) =>
                                updateParamsJson(row.id, e.target.value)
                              }
                            />
                            <button
                              onClick={() => saveRowEdit(row.id)}
                              className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <pre className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(row.params, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {row.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleEdit(row.id)}
                        className="text-xs text-gray-400 hover:text-indigo-600"
                        title={t("editRow")}
                      >
                        {t("editRow")}
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-gray-300 hover:text-red-500"
                        title={t("removeRow")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Confirm button */}
          {!executionDone && selectedCount > 0 && (
            <button
              onClick={() => void executeSteps()}
              disabled={executing}
              className="mt-5 w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {executing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                t("confirmAll")
              )}
            </button>
          )}

          {/* Upload another */}
          <button
            onClick={resetAll}
            className="mt-3 w-full rounded-2xl border border-gray-200 px-6 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            {t("uploadAnother")}
          </button>
        </div>
      )}

      {/* No steps found */}
      {result && rows.length === 0 && (
        <div className="app-card p-8 mb-6 text-center">
          <p className="text-sm text-gray-500">{t("noStepsFound")}</p>
          <button
            onClick={resetAll}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("uploadAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
