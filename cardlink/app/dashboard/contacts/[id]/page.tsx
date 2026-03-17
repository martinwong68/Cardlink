"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ExternalLink,
  Globe,
  Link2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  Tag,
  Trash2,
  Twitter,
  User,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { rejectConnection } from "@/src/lib/connections";
import {
  canAccessCRM,
  getVisibleFields,
  resolveEffectiveViewerPlan,
  type ViewerPlan,
} from "@/src/lib/visibility";
import { useLocale, useTranslations } from "next-intl";

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
  sort_order: number | null;
};

type CardRecord = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  slug: string | null;
  card_fields: CardField[] | null;
};

type ConnectionRecord = {
  id: string;
  status: "pending" | "accepted" | "blocked";
  requester_id: string;
  receiver_id: string;
  connected_at: string | null;
  created_at: string | null;
};

type CrmNote = {
  id: string;
  owner_id: string;
  contact_id: string;
  note_text: string | null;
  tags: string[] | null;
  reminder_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CardShare = {
  id: string;
  card_id: string;
  viewed_by_user_id: string | null;
  share_method: string | null;
  shared_at: string | null;
};

const iconByType: Record<string, typeof Phone> = {
  Phone,
  Email: Mail,
  WeChat: MessageCircle,
  WhatsApp: MessageCircle,
  LinkedIn: Link2,
  "Twitter/X": Twitter,
  XHS: Link2,
  Website: Globe,
  Other: Link2,
};

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateValue(value: string | Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
      new Date(value)
    );
  } catch {
    return typeof value === "string" ? value : value.toISOString();
  }
}

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("contactDetail");
  const [card, setCard] = useState<CardRecord | null>(null);
  const [connection, setConnection] = useState<ConnectionRecord | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerPlan, setViewerPlan] = useState<ViewerPlan>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [crmNotes, setCrmNotes] = useState<CrmNote[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [activeTagRecordId, setActiveTagRecordId] = useState<string | null>(
    null
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [shareHistory, setShareHistory] = useState<CardShare[]>([]);
  const suggestedTags = t.raw("crm.suggestedTags") as string[];
  const fieldTypeLabels: Record<string, string> = {
    Phone: t("fieldTypes.phone"),
    Email: t("fieldTypes.email"),
    WeChat: t("fieldTypes.wechat"),
    WhatsApp: t("fieldTypes.whatsapp"),
    LinkedIn: t("fieldTypes.linkedin"),
    "Twitter/X": t("fieldTypes.twitter"),
    XHS: t("fieldTypes.xhs"),
    Website: t("fieldTypes.website"),
    Other: t("fieldTypes.other"),
  };

  const loadCrm = async (ownerId: string, cardId: string) => {
    const [{ data: notes, error: notesError }, { data: shares }] =
      await Promise.all([
        supabase
          .from("crm_notes")
          .select(
            "id, owner_id, contact_id, note_text, tags, reminder_date, created_at, updated_at"
          )
          .eq("owner_id", ownerId)
          .eq("contact_id", params.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("card_shares")
          .select("id, card_id, viewed_by_user_id, share_method, shared_at")
          .eq("card_id", cardId)
          .eq("viewed_by_user_id", ownerId)
          .order("shared_at", { ascending: false }),
      ]);

    if (notesError) {
      setMessage(notesError.message);
      return;
    }

    const notesList = notes ?? [];
    setCrmNotes(notesList);
    setShareHistory(shares ?? []);

    const tagSource = notesList.find((note) => (note.tags ?? []).length > 0);
    setTags(tagSource?.tags ?? []);
    setActiveTagRecordId(tagSource?.id ?? null);
  };

  const loadContact = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      setMessage(t("errors.signIn"));
      setIsLoading(false);
      return;
    }

    setViewerId(userData.user.id);

    const [
      { data: cardData, error: cardError },
      { data: connectionData },
      { data: profileData },
    ] = await Promise.all([
      supabase
        .from("business_cards")
        .select(
          "id, user_id, full_name, title, company, bio, slug, card_fields(id, field_type, field_label, field_value, visibility, sort_order)"
        )
        .eq("user_id", params.id)
        .eq("is_default", true)
        .order("sort_order", { foreignTable: "card_fields", ascending: true })
        .maybeSingle<CardRecord>(),
      supabase
        .from("connections")
        .select(
          "id, status, requester_id, receiver_id, connected_at, created_at"
        )
        .or(
          `and(requester_id.eq.${userData.user.id},receiver_id.eq.${params.id}),and(requester_id.eq.${params.id},receiver_id.eq.${userData.user.id})`
        )
        .maybeSingle<ConnectionRecord>(),
      supabase
        .from("profiles")
        .select("plan, premium_until")
        .eq("id", userData.user.id)
        .maybeSingle(),
    ]);

    if (cardError || !cardData) {
      setMessage(cardError?.message ?? t("errors.loadCard"));
      setIsLoading(false);
      return;
    }

    setCard(cardData);
    setConnection(connectionData ?? null);
    setViewerPlan(resolveEffectiveViewerPlan(profileData));
    await loadCrm(userData.user.id, cardData.id);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadContact();
  }, [params.id]);

  const handleRemove = async () => {
    if (!connection) {
      return;
    }
    const { error } = await rejectConnection(connection.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/dashboard/cards?tab=contacts");
  };

  const persistTags = async (nextTags: string[]) => {
    if (!viewerId) {
      return;
    }

    if (activeTagRecordId) {
      const { error } = await supabase
        .from("crm_notes")
        .update({ tags: nextTags, updated_at: new Date().toISOString() })
        .eq("id", activeTagRecordId);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("crm_notes")
        .insert({
          owner_id: viewerId,
          contact_id: params.id,
          tags: nextTags,
        })
        .select("id")
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setActiveTagRecordId(data?.id ?? null);
    }

    setTags(nextTags);
  };

  const handleAddTag = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    if (tags.includes(normalized)) {
      setTagInput("");
      setIsAddingTag(false);
      return;
    }

    await persistTags([...tags, normalized]);
    setTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tag: string) => {
    const nextTags = tags.filter((item) => item !== tag);
    await persistTags(nextTags);
  };

  const handleAddNote = async () => {
    if (!viewerId || !noteDraft.trim()) {
      return;
    }

    const { error } = await supabase.from("crm_notes").insert({
      owner_id: viewerId,
      contact_id: params.id,
      note_text: noteDraft.trim(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNoteDraft("");
    setIsAddingNote(false);
    if (card) {
      await loadCrm(viewerId, card.id);
    }
  };

  const handleEditNote = (note: CrmNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.note_text ?? "");
  };

  const handleSaveNote = async (noteId: string) => {
    if (!editingText.trim()) {
      return;
    }

    const { error } = await supabase
      .from("crm_notes")
      .update({
        note_text: editingText.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingNoteId(null);
    setEditingText("");
    if (viewerId && card) {
      await loadCrm(viewerId, card.id);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from("crm_notes").delete().eq("id", noteId);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (viewerId && card) {
      await loadCrm(viewerId, card.id);
    }
  };

  const handleAddReminder = async () => {
    if (!viewerId || !reminderDate) {
      return;
    }

    const { error } = await supabase.from("crm_notes").insert({
      owner_id: viewerId,
      contact_id: params.id,
      reminder_date: new Date(reminderDate).toISOString(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setReminderDate("");
    if (card) {
      await loadCrm(viewerId, card.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        {t("states.loading")}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="app-card p-6 text-center text-sm text-gray-500">
        {t("states.notFound")}
      </div>
    );
  }

  const connectionStatus = !viewerId
    ? "none"
    : viewerId === params.id
    ? "self"
    : connection?.status === "accepted"
    ? "accepted"
    : connection?.status === "pending"
    ? "pending"
    : "none";
  const visibleFields = getVisibleFields(
    card.card_fields ?? [],
    viewerPlan,
    connectionStatus
  );

  const fullName = card.full_name ?? t("defaults.userName");
  const initials = getInitials(fullName);

  return (
    <div className="space-y-6">
      <div className="app-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{fullName}</h1>
            <p className="text-sm text-gray-500">
              {[card.title, card.company].filter(Boolean).join(" • ")}
            </p>
          </div>
          </div>
          <Link
            href={`/c/${card.slug ?? card.id}`}
            className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                viewerPlan === "premium"
                  ? "border-gray-200 text-gray-400"
                  : "border-slate-400 text-gray-600"
              }`}
            >
              <ExternalLink className="h-3 w-3" />
            </span>
            {t("actions.viewCard")}
          </Link>
        </div>
        {card.bio ? (
          <p className="mt-4 text-sm text-gray-600">{card.bio}</p>
        ) : null}

        <div className="mt-4 text-xs text-gray-400">
          {connection?.connected_at
            ? t("connection.connected", {
                date: formatDateValue(connection.connected_at, locale),
              })
            : connection?.created_at
            ? t("connection.requested", {
                date: formatDateValue(connection.created_at, locale),
              })
            : ""}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
          {t("labels.contactFields")}
        </h2>
        <div className="space-y-3">
          {visibleFields.map((field) => {
            if (!field.visible) {
              return null;
            }

            const isLocked = !!field.message;
            const Icon = iconByType[field.field_type] ?? User;
            const displayValue = field.message ?? field.field_value;

            return (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {field.field_label ||
                        fieldTypeLabels[field.field_type] ||
                        field.field_type}
                    </p>
                    <p
                      className={`text-xs text-gray-500 ${
                        isLocked ? "blur-sm select-none" : ""
                      }`}
                    >
                      {displayValue}
                    </p>
                  </div>
                </div>
                {isLocked ? (
                  <span className="text-xs font-semibold text-amber-500">🔒</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {canAccessCRM(viewerPlan) ? (
        <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Bell className="h-4 w-4 text-indigo-600" />
          {t("crm.title")}
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Tag className="h-4 w-4 text-indigo-600" />
              {t("crm.tags.title")}
            </div>
            <button
              onClick={() => setIsAddingTag((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("crm.tags.add")}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="text-xs text-gray-400">{t("crm.tags.empty")}</span>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleRemoveTag(tag)}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600"
                >
                  {tag}
                </button>
              ))
            )}
          </div>

          {isAddingTag ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder={t("crm.tags.placeholder")}
                className="flex-1 rounded-full border border-gray-100 px-3 py-2 text-xs text-gray-700"
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
              >
                {t("crm.tags.submit")}
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddTag(tag)}
                className="rounded-full border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-500"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Pencil className="h-4 w-4 text-indigo-600" />
              {t("crm.notes.title")}
            </div>
            <button
              onClick={() => setIsAddingNote((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("crm.notes.add")}
            </button>
          </div>

          {isAddingNote ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                placeholder={t("crm.notes.placeholder")}
                className="w-full rounded-2xl border border-gray-100 px-3 py-2 text-sm text-gray-700"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNote}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  {t("crm.notes.save")}
                </button>
                <button
                  onClick={() => setIsAddingNote(false)}
                  className="rounded-full border border-gray-100 px-4 py-2 text-xs font-semibold text-gray-600"
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {crmNotes.filter((note) => note.note_text).length === 0 ? (
              <p className="text-xs text-gray-400">{t("crm.notes.empty")}</p>
            ) : null}

            {crmNotes
              .filter((note) => note.note_text)
              .map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-700"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNote(note.id)}
                          className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          {t("actions.save")}
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-full border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                        >
                          {t("actions.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-700">
                          {note.note_text}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          {note.created_at
                            ? formatDateValue(note.created_at, locale)
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="text-xs font-semibold text-indigo-600"
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-xs font-semibold text-rose-500"
                        >
                          {t("actions.delete")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-indigo-600" />
              {t("crm.reminders.title")}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={reminderDate}
                onChange={(event) => setReminderDate(event.target.value)}
                className="rounded-full border border-gray-100 px-3 py-1 text-xs text-gray-600"
              />
              <button
                onClick={handleAddReminder}
                className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
              >
                {t("crm.reminders.set")}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {crmNotes.filter((note) => note.reminder_date).length === 0 ? (
              <p className="text-xs text-gray-400">{t("crm.reminders.empty")}</p>
            ) : null}
            {crmNotes
              .filter((note) => note.reminder_date)
              .map((note) => {
                const reminder = new Date(note.reminder_date as string);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = reminder < today;

                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl border px-4 py-2 text-xs font-semibold ${
                      isOverdue
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {t("crm.reminders.label", {
                      date: formatDateValue(reminder, locale),
                    })}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Bell className="h-4 w-4 text-indigo-600" />
            {t("crm.activity.title")}
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-500">
            {shareHistory.length === 0 ? (
              <p>{t("crm.activity.empty")}</p>
            ) : (
              shareHistory.map((share) => (
                <div key={share.id} className="flex items-center justify-between">
                  <span>
                    {t("crm.activity.method", {
                      method:
                        share.share_method ?? t("crm.activity.methodFallback"),
                    })}
                  </span>
                  <span>
                    {share.shared_at
                      ? formatDateValue(share.shared_at, locale)
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 text-sm text-indigo-700">
          {t("upgrade.cta")}
        </div>
      )}

      <button
        onClick={handleRemove}
        disabled={!connection || connection.status === "blocked"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShieldAlert className="h-4 w-4" />
        {t("actions.removeConnection")}
      </button>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      <button
        onClick={() => router.push("/dashboard/cards?tab=contacts")}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        {t("actions.backToContacts")}
      </button>
    </div>
  );
}
