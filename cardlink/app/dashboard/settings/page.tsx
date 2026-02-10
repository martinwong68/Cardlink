"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, LogOut } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import { canAccessCRM } from "@/src/lib/visibility";
import { getFriends } from "@/src/lib/connections";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const getViewerPlan = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .maybeSingle();
    return data?.plan === "premium" ? "premium" : "free";
  };

  const handleExport = async () => {
    setMessage(null);
    setIsExporting(true);

    const plan = await getViewerPlan();
    if (!canAccessCRM(plan)) {
      setMessage("Upgrade to Premium to export contacts.");
      setIsExporting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setMessage("Please sign in to export contacts.");
      setIsExporting(false);
      return;
    }

    const friends = await getFriends(userData.user.id);
    const rows = [
      ["Name", "Title", "Company", "Connected At"],
      ...friends.map((friend) => [
        friend.fullName,
        friend.title ?? "",
        friend.company ?? "",
        friend.connectedAt ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, "\"\"")}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cardlink-contacts.csv";
    link.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your account and preferences.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/dashboard/settings/profile"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200"
        >
          Edit Profile
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/settings/privacy"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200"
        >
          Privacy Settings
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/settings/upgrade"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200"
        >
          Subscription Plan
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/dashboard/settings/nfc"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200"
        >
          Order NFC Card
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex items-center gap-2">
            Export Contacts
            <Download className="h-4 w-4 text-violet-500" />
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        <Link
          href="/dashboard/settings/support"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200"
        >
          Help & Support
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300"
        >
          <span className="flex items-center gap-2">
            Log Out
            <LogOut className="h-4 w-4" />
          </span>
          <ChevronRight className="h-4 w-4 text-rose-300" />
        </button>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
