"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Search, User, Star, Crown, Camera, QrCode } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

type MemberAccount = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  tier_name: string | null;
  points_balance: number;
  total_spend_amount: number;
  lifetime_points: number;
  joined_at: string;
};

const HEADERS = { "x-cardlink-app-scope": "business" };

export default function PosMembershipPage() {
  const t = useTranslations("posMembership");
  const router = useRouter();
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setAccounts([]); return; }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pos/membership-lookup?q=${encodeURIComponent(q.trim())}`, {
        headers: HEADERS,
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.accounts ?? []);
        if ((json.accounts ?? []).length === 0) setMessage(t("noResults"));
      } else {
        setMessage(t("searchError"));
      }
    } catch {
      setMessage(t("searchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleScanResult = useCallback((text: string) => {
    // Extract search value from QR code:
    //  - Namecard URL: /c/{slug} → pass entire URL or slug to API (API handles both)
    //  - Redemption URL: /dashboard/scan?rid={uuid} → not used here, pass as-is
    //  - Direct UUID or email → pass as-is
    let searchValue = text;
    try {
      const url = new URL(text);
      const cardSlugMatch = url.pathname.match(/^\/c\/([^/]+)$/);
      if (cardSlugMatch?.[1]) {
        // Pass the full URL so the API can extract /c/{slug}
        searchValue = text;
      } else {
        searchValue = url.searchParams.get("uid") ?? url.pathname.split("/").pop() ?? text;
      }
    } catch {
      // Not a URL, use as-is
    }
    setSearch(searchValue);
    void doSearch(searchValue);
    stopCamera();
  }, [doSearch]);

  const startCamera = useCallback(async () => {
    setCameraStarted(true);
    try {
      const reader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              handleScanResult(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      }
    } catch {
      setMessage(t("cameraError"));
      setCameraStarted(false);
    }
  }, [handleScanResult, t]);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraStarted(false);
  };

  useEffect(() => {
    return () => { controlsRef.current?.stop(); };
  }, []);

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/business/pos")}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* QR Scanner toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => cameraStarted ? stopCamera() : startCamera()}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            cameraStarted ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {cameraStarted ? (
            <><Camera className="h-4 w-4" /> {t("stopScan")}</>
          ) : (
            <><QrCode className="h-4 w-4" /> {t("scanQr")}</>
          )}
        </button>
      </div>

      {/* Camera view */}
      {cameraStarted && (
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <video ref={videoRef} className="w-full aspect-video object-cover" />
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void doSearch(search); }}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-gray-100 pl-9 pr-3 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={() => void doSearch(search)}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search")}
        </button>
      </div>

      {message && (
        <p className="text-xs text-center text-gray-500">{message}</p>
      )}

      {/* Results */}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="app-card rounded-2xl px-4 py-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {a.full_name || a.email || t("unknownMember")}
                </p>
                {a.email && <p className="text-xs text-gray-500 truncate">{a.email}</p>}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
              }`}>
                {a.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                <p className="text-sm font-bold text-indigo-700">{a.points_balance}</p>
                <p className="text-[10px] text-indigo-500">{t("points")}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                <p className="text-sm font-bold text-emerald-700">${a.total_spend_amount.toFixed(0)}</p>
                <p className="text-[10px] text-emerald-500">{t("totalSpend")}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3 text-amber-600" />
                  <p className="text-sm font-bold text-amber-700">{a.tier_name || t("noTier")}</p>
                </div>
                <p className="text-[10px] text-amber-500">{t("tier")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
