"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EyeOff, Globe, Users } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";

const fieldTypes = [
  "Phone",
  "Email",
  "WeChat",
  "WhatsApp",
  "LinkedIn",
  "Twitter/X",
  "XHS",
  "Website",
  "Other",
];

const visibilityOptions = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Friends Only", icon: Users },
  { value: "hidden", label: "Hidden", icon: EyeOff },
] as const;

type Visibility = (typeof visibilityOptions)[number]["value"];

type FieldState = {
  id?: string;
  field_type: string;
  field_value: string;
  visibility: Visibility;
};

type CardState = {
  id: string | null;
  full_name: string;
  title: string;
  company: string;
  bio: string;
};

export default function CardEditPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [card, setCard] = useState<CardState>({
    id: null,
    full_name: "",
    title: "",
    company: "",
    bio: "",
  });
  const [fields, setFields] = useState<FieldState[]>([]);
  const [removedFieldIds, setRemovedFieldIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("Please sign in to edit your card.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("business_cards")
      .select(
        "id, full_name, title, company, bio, card_fields(id, field_type, field_value, visibility, sort_order)"
      )
      .eq("user_id", userData.user.id)
      .eq("is_default", true)
      .order("sort_order", { foreignTable: "card_fields", ascending: true })
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (!data) {
      const { data: newCard, error: insertError } = await supabase
        .from("business_cards")
        .insert({
          user_id: userData.user.id,
          card_name: "Default Card",
          is_default: true,
          full_name:
            typeof userData.user.user_metadata?.full_name === "string"
              ? userData.user.user_metadata.full_name
              : userData.user.email ?? "",
        })
        .select(
          "id, full_name, title, company, bio, card_fields(id, field_type, field_value, visibility, sort_order)"
        )
        .single();

      if (insertError || !newCard) {
        setMessage(insertError?.message ?? "Unable to create card.");
        setIsLoading(false);
        return;
      }

      setCard({
        id: newCard.id,
        full_name: newCard.full_name ?? "",
        title: newCard.title ?? "",
        company: newCard.company ?? "",
        bio: newCard.bio ?? "",
      });
      setFields(
        (newCard.card_fields ?? []).map((field) => ({
          id: field.id,
          field_type: field.field_type,
          field_value: field.field_value,
          visibility: field.visibility,
        }))
      );
      setIsLoading(false);
      return;
    }

    setCard({
      id: data.id,
      full_name: data.full_name ?? "",
      title: data.title ?? "",
      company: data.company ?? "",
      bio: data.bio ?? "",
    });
    setFields(
      (data.card_fields ?? []).map((field) => ({
        id: field.id,
        field_type: field.field_type,
        field_value: field.field_value,
        visibility: field.visibility,
      }))
    );
    setIsLoading(false);
  };

  useEffect(() => {
    void loadCard();
  }, []);

  const updateField = (index: number, updates: Partial<FieldState>) => {
    setFields((prev) =>
      prev.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field
      )
    );
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { field_type: "Phone", field_value: "", visibility: "public" },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => {
      const field = prev[index];
      if (field?.id) {
        setRemovedFieldIds((ids) => [...ids, field.id!]);
      }
      return prev.filter((_, fieldIndex) => fieldIndex !== index);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("Please sign in to save your card.");
      setIsSaving(false);
      return;
    }

    let cardId = card.id;

    if (cardId) {
      const { error } = await supabase.from("business_cards").upsert({
        id: cardId,
        user_id: userData.user.id,
        card_name: "Default Card",
        is_default: true,
        full_name: card.full_name,
        title: card.title,
        company: card.company,
        bio: card.bio,
      });

      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("business_cards")
        .insert({
          user_id: userData.user.id,
          card_name: "Default Card",
          is_default: true,
          full_name: card.full_name,
          title: card.title,
          company: card.company,
          bio: card.bio,
        })
        .select("id")
        .single();

      if (error || !data) {
        setMessage(error?.message ?? "Unable to save card.");
        setIsSaving(false);
        return;
      }

      cardId = data.id;
      setCard((prev) => ({ ...prev, id: cardId }));
    }

    const cleanedFields = fields
      .map((field, index) => ({
        id: field.id,
        card_id: cardId,
        field_type: field.field_type,
        field_label: field.field_type,
        field_value: field.field_value,
        visibility: field.visibility,
        sort_order: index,
      }))
      .filter((field) => field.field_value.trim() !== "");

    const existingFields = cleanedFields.filter((field) => !!field.id);
    const newFields = cleanedFields.filter((field) => !field.id);

    if (existingFields.length > 0) {
      const { error } = await supabase.from("card_fields").upsert(existingFields, {
        onConflict: "id",
      });

      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (newFields.length > 0) {
      const insertPayload = newFields.map(({ id: _id, ...rest }) => rest);
      const { error } = await supabase.from("card_fields").insert(insertPayload);

      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (removedFieldIds.length > 0) {
      const { error } = await supabase
        .from("card_fields")
        .delete()
        .in("id", removedFieldIds);

      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }

      setRemovedFieldIds([]);
    }

    setMessage("Card saved successfully.");
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            CardLink
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Card</h1>
        </div>
        <Link
          href="/dashboard/card"
          className="text-sm font-semibold text-violet-600 hover:text-violet-700"
        >
          Back to card
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              value={card.full_name}
              onChange={(event) =>
                setCard((prev) => ({ ...prev, full_name: event.target.value }))
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              value={card.title}
              onChange={(event) =>
                setCard((prev) => ({ ...prev, title: event.target.value }))
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              value={card.company}
              onChange={(event) =>
                setCard((prev) => ({ ...prev, company: event.target.value }))
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              value={card.bio}
              onChange={(event) =>
                setCard((prev) => ({ ...prev, bio: event.target.value }))
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Contact fields
          </h2>
          <button
            onClick={addField}
            className="rounded-lg border border-violet-200 px-3 py-1 text-sm font-semibold text-violet-600 transition hover:border-violet-300"
          >
            Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add your first contact field to start sharing.
          </p>
        ) : null}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id ?? `${field.field_type}-${index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Type
                  </label>
                  <select
                    value={field.field_type}
                    onChange={(event) =>
                      updateField(index, { field_type: event.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Value
                  </label>
                  <input
                    value={field.field_value}
                    onChange={(event) =>
                      updateField(index, { field_value: event.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Enter contact details"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = field.visibility === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => updateField(index, { visibility: option.value })}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "border-violet-200 bg-violet-50 text-violet-600"
                          : "border-slate-200 text-slate-500"
                      }`}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}

                <button
                  onClick={() => removeField(index)}
                  type="button"
                  className="ml-auto text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={() => router.push("/dashboard/card")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
