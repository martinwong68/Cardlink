import Link from "next/link";
import { LucideIcon } from "lucide-react";

type StatusLayoutProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
  tone?: "neutral" | "muted";
  resolving?: boolean;
};

export default function StatusLayout({
  icon: Icon,
  title,
  body,
  linkLabel,
  linkHref,
  resolving = false,
}: StatusLayoutProps) {
  return (
    <div className="ink-signal flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[420px] text-center">
        {resolving ? (
          <div className="mx-auto mb-6 ink-signal-progress" aria-hidden>
            <span />
          </div>
        ) : (
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px]"
            style={{ background: "var(--accent-soft)" }}
          >
            <Icon className="h-7 w-7" style={{ color: "var(--accent)" }} />
          </div>
        )}
        <h1 className="ink-signal-display mt-2 text-[24px]">{title}</h1>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: "var(--ink-muted)" }}
        >
          {body}
        </p>
        {linkLabel && linkHref ? (
          <Link href={linkHref} className="ink-signal-btn-secondary mt-8 inline-flex">
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
