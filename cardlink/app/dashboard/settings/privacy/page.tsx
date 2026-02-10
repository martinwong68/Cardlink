"use client";

import { useState } from "react";
import { Eye, EyeOff, Users } from "lucide-react";

const options = [
  { value: "public", label: "Public", icon: Eye },
  { value: "friends", label: "Friends Only", icon: Users },
  { value: "hidden", label: "Hidden", icon: EyeOff },
] as const;

type Visibility = (typeof options)[number]["value"];

export default function PrivacySettingsPage() {
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(
    "public"
  );
  const [showInSearch, setShowInSearch] = useState(true);
  const [allowRequests, setAllowRequests] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Privacy Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Control how your card is shared.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Default field visibility
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            This will be applied to new contact fields.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              const active = defaultVisibility === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setDefaultVisibility(option.value)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-violet-600 text-white"
                      : "border border-slate-200 text-slate-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Show my profile in search results
              </p>
              <p className="text-xs text-slate-500">
                Let others find your card when searching.
              </p>
            </div>
            <button
              onClick={() => setShowInSearch((prev) => !prev)}
              className={`h-6 w-11 rounded-full border transition ${
                showInSearch
                  ? "border-violet-600 bg-violet-600"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  showInSearch ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Allow connection requests from anyone
              </p>
              <p className="text-xs text-slate-500">
                Restrict if you only accept known contacts.
              </p>
            </div>
            <button
              onClick={() => setAllowRequests((prev) => !prev)}
              className={`h-6 w-11 rounded-full border transition ${
                allowRequests
                  ? "border-violet-600 bg-violet-600"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  allowRequests ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
