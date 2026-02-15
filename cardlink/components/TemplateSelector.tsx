"use client";

import { Lock } from "lucide-react";
import { CARD_TEMPLATES, type TemplateId } from "@/src/lib/templates";

type TemplateSelectoro = {
  currentTemplate: TemplateId | null;
  isPremiumUser: boolean;
  onChange: (template: TemplateId) => void;
};

export default function TemplateSelector({
  currentTemplate,
  isPremiumUser,
  onChange,
}: TemplateSelectoro) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Choose Template</h3>
        <p className="mt-1 text-xs text-slate-500">
          {isPremiumUser
            ? "Select any template to customize your card"
            : "Free users can choose from 3 basic templates. Upgrade to Premium for all templates."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_TEMPLATES.map((template) => {
          const isLocked = template.isPremium && !isPremiumUser;
          const isSelected = currentTemplate === template.id;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                if (!isLocked) {
                  onChange(template.id);
                }
              }}
              disabled={isLocked}
              className={`group relative rounded-2xl border-2 p-4 text-left transition ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50"
                  : isLocked
                  ? "border-slate-200 bg-slate-50 opacity-60"
                  : "border-slate-200 bg-white hover:border-indigo-200"
              }`}
            >
              {isLocked && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-300">
                  <Lock className="h-3 w-3 text-slate-600" />
                </div>
              )}
              
              <div
                className="h-20 w-full rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${template.defaultColor}, ${template.defaultColor}dd)`,
                }}
              />
              
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {template.name}
                </h4>
                <p className="mt-1 text-xs text-slate-500">{template.category}</p>
                {template.isPremium && (
                  <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Premium
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="absolute inset-0 rounded-2xl border-2 border-indigo-600 bg-indigo-600/5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
