"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Camera, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type RedemptionRow = {
  id: string;
  offer_id: string;
  status: "pending" | "confirmed" | "rejected";
  points_spent: number;
  redeemed_at: string;
  confirmed_at: string | null;
  reject_reason: string | null;
};

type OfferRow = {
  id: string;
  company_id: string;
  title: string;
};

type CompanyRow = {
  id: string;
  name: string;
};

type ScanTarget = {
  redemption: RedemptionRow;
  offer: OfferRow;
  company: CompanyRow | null;
};

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructorLike = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

export default function ScanPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const t = useTranslations("scan");
  const ridFromQuery = searchParams.get("rid") ?? "";

  const [adminCompanyIds, setAdminCompanyIds] = useState<string[]>([]);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [rawInput, setRawInput] = useState(ridFromQuery);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<ScanTarget | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const autoStartRef = useRef(false);

  const barcodeDetectorCtor = useMemo<BarcodeDetectorConstructorLike | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return ((window as unknown as { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector ??
      null) as BarcodeDetectorConstructorLike | null;
  }, []);

  const hasCameraSupport =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  const zxingReader = useMemo(() => new BrowserMultiFormatReader(), []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    setCameraStarted(false);
  }, []);

  const extractRedemptionId = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuidPattern.test(trimmed)) {
      return trimmed;
    }

    try {
      const parsedUrl = new URL(trimmed);
      const rid = parsedUrl.searchParams.get("rid") ?? parsedUrl.searchParams.get("redemptionId");
      if (rid && uuidPattern.test(rid)) {
        return rid;
      }
    } catch {
      // no-op
    }

    try {
      const payload = JSON.parse(trimmed) as { rid?: string; redemptionId?: string; id?: string };
      const candidate = payload.rid ?? payload.redemptionId ?? payload.id ?? "";
      if (uuidPattern.test(candidate)) {
        return candidate;
      }
    } catch {
      // no-op
    }

    return null;
  };

  const loadAdminCompanies = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAdminCompanyIds([]);
      setMessage(t("messages.signInFirst"));
      return;
    }

    const [rpcRes, roleRes, createdRes] = await Promise.all([
      supabase.rpc("get_my_admin_company_ids"),
      supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.from("companies").select("id").eq("created_by", user.id),
    ]);

    const adminIdsFromRpc = ((rpcRes.data ?? []) as { company_id: string }[]).map(
      (item) => item.company_id
    );
    const adminIdsFromRole = ((roleRes.data ?? []) as { company_id: string; role: string }[])
      .filter((item) => /(owner|admin|manager|company_owner|company_admin)/i.test(item.role ?? ""))
      .map((item) => item.company_id);
    const adminIdsFromCreated = ((createdRes.data ?? []) as { id: string }[]).map((item) => item.id);

    setAdminCompanyIds(Array.from(new Set([...adminIdsFromRpc, ...adminIdsFromRole, ...adminIdsFromCreated])));
  }, [supabase, t]);

  const loadRedemption = useCallback(
    async (redemptionId: string) => {
      setBusy(true);
      setMessage(null);

      const { data: redemptionRes, error: redemptionError } = await supabase
        .from("offer_redemptions")
        .select("id, offer_id, status, points_spent, redeemed_at, confirmed_at, reject_reason")
        .eq("id", redemptionId)
        .maybeSingle();

      if (redemptionError || !redemptionRes) {
        setTarget(null);
        setMessage(t("messages.invalidCode"));
        setBusy(false);
        return;
      }

      const redemption = redemptionRes as RedemptionRow;

      const { data: offerRes, error: offerError } = await supabase
        .from("company_offers")
        .select("id, company_id, title")
        .eq("id", redemption.offer_id)
        .maybeSingle();

      if (offerError || !offerRes) {
        setTarget(null);
        setMessage(t("messages.offerNotFound"));
        setBusy(false);
        return;
      }

      const offer = offerRes as OfferRow;
      if (!adminCompanyIds.includes(offer.company_id)) {
        setTarget(null);
        setMessage(t("messages.noPermission"));
        setBusy(false);
        return;
      }

      const { data: companyRes } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", offer.company_id)
        .maybeSingle();

      setTarget({
        redemption,
        offer,
        company: (companyRes as CompanyRow | null) ?? null,
      });
      setBusy(false);
    },
    [adminCompanyIds, supabase, t]
  );

  const handleProcessInput = useCallback(async () => {
    const redemptionId = extractRedemptionId(rawInput);
    if (!redemptionId) {
      setMessage(t("messages.invalidCode"));
      return;
    }
    await loadRedemption(redemptionId);
  }, [loadRedemption, rawInput, t]);

  const processDetectedValue = useCallback(
    async (value: string) => {
      setRawInput(value);
      stopCamera();
      const redemptionId = extractRedemptionId(value);
      if (!redemptionId) {
        setMessage(t("messages.invalidCode"));
        return;
      }
      await loadRedemption(redemptionId);
    },
    [loadRedemption, stopCamera, t]
  );

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !hasCameraSupport) {
      setMessage(t("messages.cameraNotSupported"));
      return;
    }

    try {
      setMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraStarted(true);

      if (barcodeDetectorCtor) {
        const detector = new barcodeDetectorCtor({ formats: ["qr_code"] });
        let lastDetectAt = 0;

        const detectLoop = async (timestamp: number) => {
          if (!videoRef.current) {
            return;
          }

          if (timestamp - lastDetectAt > 350) {
            lastDetectAt = timestamp;
            try {
              const results = await detector.detect(videoRef.current);
              const value = results.find((item) => item.rawValue)?.rawValue?.trim();
              if (value) {
                await processDetectedValue(value);
                return;
              }
            } catch {
              // no-op
            }
          }

          rafRef.current = window.requestAnimationFrame(detectLoop);
        };

        rafRef.current = window.requestAnimationFrame(detectLoop);
        return;
      }

      controlsRef.current = await zxingReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          const value = result?.getText()?.trim();
          if (value) {
            void processDetectedValue(value);
          }
        }
      );
    } catch {
      setMessage(t("messages.cameraDenied"));
      stopCamera();
    }
  }, [barcodeDetectorCtor, hasCameraSupport, processDetectedValue, stopCamera, t, zxingReader]);

  const confirmRedemption = useCallback(async () => {
    if (!target) {
      return;
    }
    if (target.redemption.status !== "pending") {
      setMessage(t("messages.alreadyProcessed"));
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("company_confirm_redemption", {
      p_redemption_id: target.redemption.id,
      p_approve: true,
      p_reason: null,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setMessage(t("messages.markedUsed"));
    await loadRedemption(target.redemption.id);
    setBusy(false);
  }, [supabase, target, loadRedemption, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminCompanies();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAdminCompanies]);

  useEffect(() => {
    const rid = ridFromQuery;
    if (rid && adminCompanyIds.length > 0) {
      const timer = window.setTimeout(() => {
        void loadRedemption(rid);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [adminCompanyIds, loadRedemption, ridFromQuery]);

  useEffect(() => {
    if (autoStartRef.current) {
      return;
    }
    if (!hasCameraSupport || adminCompanyIds.length === 0) {
      return;
    }
    autoStartRef.current = true;

    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [adminCompanyIds.length, hasCameraSupport, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const canProcess = target?.redemption.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("subtitle")}
        </p>
      </div>

      {message ? (
        <article className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          {message}
        </article>
      ) : null}

      <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={!hasCameraSupport || cameraStarted}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {cameraStarted ? t("actions.scanning") : t("actions.startScan")}
          </button>
          <button
            type="button"
            onClick={stopCamera}
            disabled={!cameraStarted}
            className="rounded-full border border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            {t("actions.stopScan")}
          </button>
          <Link
            href="/dashboard/discount"
            className="rounded-full border border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {t("actions.backToDiscount")}
          </Link>
        </div>

        {!hasCameraSupport ? (
          <p className="mt-3 text-xs text-amber-700">{t("messages.cameraNotSupported")}</p>
        ) : null}

        <video
          ref={videoRef}
          className="mt-4 h-56 w-full rounded-2xl border border-neutral-100 bg-neutral-900 object-cover"
          muted
          playsInline
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder={t("placeholders.code")}
            className="w-full rounded-xl border border-neutral-100 px-3 py-2 text-sm text-neutral-700 outline-none ring-primary-100 focus:ring"
          />
          <button
            type="button"
            onClick={() => void handleProcessInput()}
            disabled={busy}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {t("actions.verify")}
          </button>
        </div>
      </section>

      {target ? (
        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{target.offer.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{target.company?.name ?? t("labels.unknownCompany")}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                target.redemption.status === "confirmed"
                  ? "bg-emerald-50 text-emerald-700"
                  : target.redemption.status === "rejected"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {target.redemption.status === "confirmed"
                ? t("status.used")
                : target.redemption.status === "rejected"
                ? t("status.rejected")
                : t("status.redeemed")}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-3">
            <p>{t("labels.points")}: <span className="font-semibold">{target.redemption.points_spent} {t("labels.pointUnit")}</span></p>
            <p>{t("labels.requestedAt")}: <span className="font-semibold">{new Date(target.redemption.redeemed_at).toLocaleString()}</span></p>
            <p>{t("labels.processedAt")}: <span className="font-semibold">{target.redemption.confirmed_at ? new Date(target.redemption.confirmed_at).toLocaleString() : "-"}</span></p>
          </div>

          {target.redemption.reject_reason ? (
            <p className="mt-2 text-xs text-rose-700">
              {t("labels.reason")}: {target.redemption.reject_reason}
            </p>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void confirmRedemption()}
              disabled={!canProcess || busy}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {canProcess ? t("actions.confirmUse") : t("actions.alreadyUsed")}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <QrCode className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm text-neutral-600">
            {t("empty.noCode")}
          </p>
        </section>
      )}

      {adminCompanyIds.length === 0 ? (
        <p className="text-xs text-amber-700">
          {t("messages.requireAdmin")}
        </p>
      ) : null}
    </div>
  );
}
