"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  bindMyNfc,
  CardlinkApiError,
} from "@/src/lib/cardlink-api";
import { maskNfcUid } from "./utils";

type NfcBindPanelProps = {
  token: string | null;
  boundUids?: string[];
  onBound?: (uid: string) => void;
};

export default function NfcBindPanel({
  token,
  boundUids = [],
  onBound,
}: NfcBindPanelProps) {
  const t = useTranslations("cardEditor.nfc");
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMask, setSuccessMask] = useState<string | null>(
    boundUids[0] ? maskNfcUid(boundUids[0]) : null
  );

  const alreadyBound = Boolean(successMask || boundUids.length > 0);

  const handleBind = async () => {
    setError(null);
    const trimmed = uid.trim();
    if (!trimmed) {
      setError(t("emptyUid"));
      return;
    }
    if (!token) {
      setError(t("authError"));
      return;
    }

    setBusy(true);
    try {
      await bindMyNfc(token, { uid: trimmed });
      const mask = maskNfcUid(trimmed);
      setSuccessMask(mask);
      setUid("");
      onBound?.(trimmed);
    } catch (err) {
      if (err instanceof CardlinkApiError) {
        if (err.status === 409) {
          setError(t("conflict"));
        } else if (err.status === 401 || err.status === 403) {
          setError(t("authError"));
        } else {
          setError(t("error"));
        }
      } else {
        setError(t("error"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-[color:var(--line)] pt-6">
      <h2 className="text-base font-semibold text-[color:var(--ink)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
        {t("help")}
      </p>
      <p className="mt-2 text-xs text-[color:var(--ink-faint)]">
        {t("noEditUidNote")}
      </p>

      {alreadyBound ? (
        <div className="mt-4 rounded-[10px] bg-[color:var(--accent-soft)] px-3 py-3 text-sm text-[color:var(--accent-pressed)]">
          <p className="font-semibold">{t("bound")}</p>
          <p
            className="mt-1 font-mono text-xs"
            style={{ fontFamily: "var(--ink-font-mono)" }}
          >
            {t("masked", {
              mask: successMask || maskNfcUid(boundUids[0] || ""),
            })}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-[color:var(--ink)]">
            {t("uidLabel")}
            <input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder={t("uidPlaceholder")}
              disabled={busy}
              className="ink-signal-input mt-2 font-mono"
              style={{ fontFamily: "var(--ink-font-mono)" }}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleBind()}
            disabled={busy}
            className="ink-signal-btn-primary"
          >
            {busy ? t("binding") : t("bind")}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-[10px] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
