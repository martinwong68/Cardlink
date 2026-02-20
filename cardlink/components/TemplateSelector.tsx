"use client";

import { CARD_TEMPLATES, type TemplateId } from "@/src/lib/templates";

type TemplateSelectoro = {
  currentTemplate: TemplateId | null;
  isPremiumUser: boolean;
  onChange: (template: TemplateId) => void;
};

export default function TemplateSelector({
  currentTemplate,
  isPremiumUser: _isPremiumUser,
  onChange,
}: TemplateSelectoro) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Choose Template</h3>
        <p className="mt-1 text-xs text-slate-500">Choose from 3 core themes.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_TEMPLATES.map((template) => {
          const isSelected = currentTemplate === template.id;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id)}
              className={`group relative rounded-2xl border-2 p-4 text-left transition ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-indigo-200"
              }`}
            >
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
