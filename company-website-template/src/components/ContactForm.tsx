"use client";

import { useState } from "react";
import { submitForm } from "@/lib/cardlink-api";

export default function ContactForm({ primaryColor }: { primaryColor: string }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus("sending");
    const result = await submitForm(form, "contact");
    setStatus(result.status === "submitted" ? "sent" : "error");
  };

  if (status === "sent") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✉️</div>
        <h3 className="text-lg font-semibold text-gray-900">Message Sent!</h3>
        <p className="mt-2 text-sm text-gray-500">Thank you for reaching out. We&apos;ll get back to you soon.</p>
        <button
          onClick={() => { setStatus("idle"); setForm({ name: "", email: "", message: "" }); }}
          className="mt-4 text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
        />
      </div>
      {status === "error" && <p className="text-sm text-red-500">Failed to send. Please try again.</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
        style={{ backgroundColor: primaryColor }}
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
