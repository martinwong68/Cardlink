import Link from "next/link";
import { LucideIcon } from "lucide-react";

type StatusLayoutProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
  tone?: "neutral" | "muted";
};

export default function StatusLayout({
  icon: Icon,
  title,
  body,
  linkLabel,
  linkHref,
  tone = "neutral",
}: StatusLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div
        className={`w-full max-w-sm rounded-3xl border px-6 py-10 text-center shadow-sm ${
          tone === "muted"
            ? "border-slate-200 bg-white text-slate-600"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Icon className="h-7 w-7 text-slate-500" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{body}</p>
        {linkLabel && linkHref ? (
          <Link
            href={linkHref}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
