"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";

type QRCodeModalProps = {
  slug: string;
  fullName: string;
  title?: string | null;
  onClose: () => void;
};

export default function QRCodeModal({
  slug,
  fullName,
  title,
  onClose,
}: QRCodeModalProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = useTranslations("qr");

  const url = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (base) {
      return `${base.replace(/\/$/, "")}/c/${slug}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/c/${slug}`;
  }, [slug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("cardlink-qr-code");
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
      link.download = `cardlink-${slug}.png`;
      link.click();
    };

    image.src = urlObject;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 px-4 py-10">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-sm font-semibold text-neutral-400 hover:text-neutral-600"
        >
          {t("close")}
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
            <QRCodeSVG
              id="cardlink-qr-code"
              value={url}
              size={220}
              bgColor="#ffffff"
              fgColor="#111827"
              level="M"
              includeMargin
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-neutral-900">{fullName}</p>
            {title ? (
              <p className="text-sm text-neutral-500">{title}</p>
            ) : null}
          </div>

          <p className="text-xs text-neutral-500 break-all">{url}</p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl border border-neutral-100 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-primary-200 hover:text-primary-600"
            >
              {t("download")}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
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
