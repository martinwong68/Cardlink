import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";

const DOCUMENT_BUCKET = process.env.ACCOUNTING_DOCUMENT_BUCKET ?? "accounting-documents";

async function tryOcr(file: File): Promise<string | null> {
  const endpoint = process.env.OCR_API_URL;
  if (!endpoint) {
    return null;
  }

  const payload = new FormData();
  payload.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: process.env.OCR_API_KEY
      ? { Authorization: `Bearer ${process.env.OCR_API_KEY}` }
      : undefined,
    body: payload,
  });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as { text?: string };
  return result.text?.trim() || null;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, org_id, related_type, related_id, file_url, ocr_text, uploaded_by, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contract: "accounting.documents.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    documents: data ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireAccountingContext({ request, write: true });
  if (!guard.ok) {
    return guard.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required in multipart form-data." }, { status: 400 });
  }

  const relatedType = String(formData.get("related_type") ?? "").trim() || null;
  const relatedIdRaw = String(formData.get("related_id") ?? "").trim();
  const relatedId = relatedIdRaw.length > 0 ? relatedIdRaw : null;

  const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${guard.context.organizationId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrlData } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(path);
  const ocrText = await tryOcr(file);

  const { data, error } = await supabase
    .from("documents")
    .insert({
      org_id: guard.context.organizationId,
      related_type: relatedType,
      related_id: relatedId,
      file_url: publicUrlData.publicUrl,
      ocr_text: ocrText,
      uploaded_by: guard.context.userId,
    })
    .select("id, file_url, ocr_text, created_at")
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      contract: "accounting.documents.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      document: data,
      storage_bucket: DOCUMENT_BUCKET,
      emitted_events: ["accounting.document.uploaded", "accounting.document.ocr.completed"],
    },
    { status: 201 }
  );
}
