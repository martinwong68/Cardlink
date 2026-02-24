"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";

type RedemptionQRCodeModalProps = {
  redemptionId: string;
  offerTitle: string;
  companyName: string;
  onClose: () => void;
};

export default function RedemptionQRCodeModal({
  redemptionId,
  offerTitle,
  companyName,
  onClose,
}: RedemptionQRCodeModalProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = useTranslations("membershipOverview.redeemQr");

  const qrValue = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (base) {
      return `${base.replace(/\/$/, "")}/dashboard/scan?rid=${redemptionId}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/dashboard/scan?rid=${redemptionId}`;
  }, [redemptionId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("cardlink-redeem-qr-code");
    if (!svg || !canvasRef.current) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const urlObject = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(urlObject);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `cardlink-redemption-${redemptionId}.png`;
      link.click();
    };

    image.src = urlObject;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-sm font-semibold text-slate-400 hover:text-slate-600"
        >
          {t("close")}
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <QRCodeSVG
              id="cardlink-redeem-qr-code"
              value={qrValue}
              size={220}
              bgColor="#ffffff"
              fgColor="#111827"
              level="M"
              includeMargin
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-slate-900">{offerTitle}</p>
            <p className="text-sm text-slate-500">{companyName}</p>
          </div>

          <p className="text-xs text-slate-500 break-all">{qrValue}</p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              {t("download")}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              {copyState === "copied" ? t("copied") : t("copy")}
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
