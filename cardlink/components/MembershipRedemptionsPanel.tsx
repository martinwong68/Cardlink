"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import RedemptionQRCodeModal from "@/components/RedemptionQRCodeModal";

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

type DisplayRedemption = RedemptionRow & {
  offerTitle: string;
  companyName: string;
};

export default function MembershipRedemptionsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("membershipOverview");

  const [rows, setRows] = useState<DisplayRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<DisplayRedemption | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRows([]);
      setMessage(t("redeemHistory.signInToView"));
      setIsLoading(false);
      return;
    }

    const { data: redemptionsRes, error: redemptionsError } = await supabase
      .from("offer_redemptions")
      .select("id, offer_id, status, points_spent, redeemed_at, confirmed_at, reject_reason")
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed", "rejected"])
      .order("redeemed_at", { ascending: false })
      .limit(100);

    if (redemptionsError) {
      setRows([]);
      setMessage(t("redeemHistory.errors.load", { message: redemptionsError.message }));
      setIsLoading(false);
      return;
    }

    const redemptionRows = (redemptionsRes ?? []) as RedemptionRow[];
    if (!redemptionRows.length) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    const offerIds = Array.from(new Set(redemptionRows.map((item) => item.offer_id)));
    const { data: offersRes } = await supabase
      .from("company_offers")
      .select("id, company_id, title")
      .in("id", offerIds);

    const offers = (offersRes ?? []) as OfferRow[];
    const offerMap = new Map(offers.map((item) => [item.id, item]));

    const companyIds = Array.from(new Set(offers.map((item) => item.company_id)));
    const { data: companiesRes } = companyIds.length
      ? await supabase.from("companies").select("id, name").in("id", companyIds)
      : { data: [] as CompanyRow[] };

    const companies = (companiesRes ?? []) as CompanyRow[];
    const companyMap = new Map(companies.map((item) => [item.id, item]));

    const displayRows: DisplayRedemption[] = redemptionRows.map((item) => {
      const offer = offerMap.get(item.offer_id);
      const company = offer ? companyMap.get(offer.company_id) : null;

      return {
        ...item,
        offerTitle: offer?.title ?? t("redeemHistory.labels.unknownOffer"),
        companyName: company?.name ?? t("labels.unknownCompany"),
      };
    });

    setRows(displayRows);
    setIsLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const statusClassName = (status: DisplayRedemption["status"]) => {
    if (status === "confirmed") {
      return "bg-emerald-50 text-emerald-700";
    }
    if (status === "rejected") {
      return "bg-rose-50 text-rose-700";
    }
    return "bg-amber-50 text-amber-700";
  };

  const statusLabel = (status: DisplayRedemption["status"]) => {
    if (status === "confirmed") {
      return t("redeemHistory.status.used");
    }
    if (status === "rejected") {
      return t("redeemHistory.status.rejected");
    }
    return t("redeemHistory.status.redeemed");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">{t("redeemHistory.title")}</h2>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-full border border-gray-100 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {t("redeemHistory.actions.refresh")}
        </button>
      </div>

      {message ? (
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700">
          {message}
        </article>
      ) : null}

      {isLoading ? (
        <article className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm">
          {t("redeemHistory.loading")}
        </article>
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.offerTitle}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.companyName}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}
                >
                  {statusLabel(item.status)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                <p>
                  {t("redeemHistory.labels.points")}: <span className="font-semibold">{item.points_spent} {t("labels.pointUnit")}</span>
                </p>
                <p>
                  {t("redeemHistory.labels.requestedAt")}: <span className="font-semibold">{new Date(item.redeemed_at).toLocaleString()}</span>
                </p>
                <p>
                  {t("redeemHistory.labels.processedAt")}: <span className="font-semibold">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleString() : "-"}</span>
                </p>
              </div>

              {item.reject_reason ? (
                <p className="mt-2 text-xs text-rose-700">
                  {t("redeemHistory.labels.reason")}: {item.reject_reason}
                </p>
              ) : null}

              <div className="mt-3">
                {item.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => setQrTarget(item)}
                    className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    {t("redeemHistory.actions.showQr")}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {item.status === "confirmed"
                      ? t("redeemHistory.actions.used")
                      : t("redeemHistory.actions.unavailable")}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm">
          {t("redeemHistory.empty")}
        </article>
      )}

      {qrTarget ? (
        <RedemptionQRCodeModal
          redemptionId={qrTarget.id}
          offerTitle={qrTarget.offerTitle}
          companyName={qrTarget.companyName}
          onClose={() => setQrTarget(null)}
        />
      ) : null}
    </section>
  );
}
