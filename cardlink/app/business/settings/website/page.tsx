"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Globe, Plus, Edit2, Trash2, Eye, EyeOff, Save,
  FileText, Settings, Layout, Mail, Image, ChevronDown, ChevronUp,
  Link2, ExternalLink, CheckCircle, AlertCircle, Clock,
} from "lucide-react";

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

type Page = { id: string; slug: string; title: string; page_type: string; is_published: boolean; sort_order: number; content: unknown; show_in_nav: boolean; meta_title?: string; meta_description?: string };
type SiteSettings = { id?: string; site_title: string; tagline: string; logo_url: string; primary_color: string; secondary_color: string; contact_email: string; contact_phone: string; contact_address: string; social_facebook: string; social_instagram: string; footer_text: string; is_published: boolean; meta_title: string; meta_description: string; linked_website_url?: string; last_heartbeat_at?: string };
type Submission = { id: string; form_type: string; data: Record<string, unknown>; is_read: boolean; created_at: string };

const defaultSettings: SiteSettings = {
  site_title: "", tagline: "", logo_url: "", primary_color: "#4f46e5", secondary_color: "#06b6d4",
  contact_email: "", contact_phone: "", contact_address: "", social_facebook: "", social_instagram: "",
  footer_text: "", is_published: false, meta_title: "", meta_description: "",
};

const PAGE_TYPES = ["home", "about", "services", "contact", "blog", "custom", "faq", "gallery", "testimonials"];

export default function WebsiteCMSPage() {
  const [tab, setTab] = useState<"pages" | "settings" | "submissions">("pages");
  const [pages, setPages] = useState<Page[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Page form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pSlug, setPSlug] = useState("");
  const [pTitle, setPTitle] = useState("");
  const [pType, setPType] = useState("custom");
  const [pPublished, setPPublished] = useState(false);
  const [pOrder, setPOrder] = useState(0);
  const [pNav, setPNav] = useState(true);
  const [pContent, setPContent] = useState("{}");
  const [pMeta, setPMeta] = useState("");
  const [pMetaDesc, setPMetaDesc] = useState("");

  const loadPages = useCallback(async () => {
    const res = await fetch("/api/business/website/pages", { headers: HEADERS, cache: "no-store" });
    if (res.ok) { const j = await res.json(); setPages(j.pages ?? []); }
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/business/website/settings", { headers: HEADERS, cache: "no-store" });
    if (res.ok) { const j = await res.json(); if (j.settings) setSettings({ ...defaultSettings, ...j.settings }); }
  }, []);

  const loadSubmissions = useCallback(async () => {
    const res = await fetch("/api/business/website/submissions", { headers: HEADERS, cache: "no-store" });
    if (res.ok) { const j = await res.json(); setSubmissions(j.submissions ?? []); }
  }, []);

  useEffect(() => {
    Promise.all([loadPages(), loadSettings(), loadSubmissions()]).finally(() => setLoading(false));
  }, [loadPages, loadSettings, loadSubmissions]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const resetForm = () => {
    setShowForm(false); setEditId(null); setPSlug(""); setPTitle(""); setPType("custom");
    setPPublished(false); setPOrder(0); setPNav(true); setPContent("{}"); setPMeta(""); setPMetaDesc("");
  };

  const savePage = async () => {
    setSaving(true);
    let content: unknown;
    try { content = JSON.parse(pContent); } catch { flash("Invalid JSON in content."); setSaving(false); return; }

    const payload = { id: editId, slug: pSlug, title: pTitle, page_type: pType, is_published: pPublished, sort_order: pOrder, show_in_nav: pNav, content, meta_title: pMeta || undefined, meta_description: pMetaDesc || undefined };
    const method = editId ? "PATCH" : "POST";
    const res = await fetch("/api/business/website/pages", { method, headers: HEADERS, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { flash(editId ? "Page updated." : "Page created."); resetForm(); loadPages(); }
    else { const j = await res.json().catch(() => ({})); flash(j.error ?? "Failed."); }
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/business/website/pages?id=${id}`, { method: "DELETE", headers: HEADERS });
    loadPages();
  };

  const editPage = (p: Page) => {
    setEditId(p.id); setPSlug(p.slug); setPTitle(p.title); setPType(p.page_type);
    setPPublished(p.is_published); setPOrder(p.sort_order); setPNav(p.show_in_nav);
    setPContent(JSON.stringify(p.content, null, 2)); setPMeta(p.meta_title ?? ""); setPMetaDesc(p.meta_description ?? "");
    setShowForm(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch("/api/business/website/settings", { method: "POST", headers: HEADERS, body: JSON.stringify(settings) });
    setSaving(false);
    if (res.ok) flash("Settings saved."); else flash("Failed to save.");
  };

  const markRead = async (id: string) => {
    await fetch("/api/business/website/submissions", { method: "PATCH", headers: HEADERS, body: JSON.stringify({ id, is_read: true }) });
    loadSubmissions();
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold">Website Manager</h1>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${settings.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {settings.is_published ? "Published" : "Draft"}
        </span>
      </div>
      {msg && <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Connected Website Status */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-sm">Connected Website</h3>
        </div>
        {settings.linked_website_url ? (() => {
          const heartbeatAge = settings.last_heartbeat_at
            ? Date.now() - new Date(settings.last_heartbeat_at).getTime()
            : Infinity;
          const isRecent = heartbeatAge < 24 * 60 * 60 * 1000; // < 24 hours
          return (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isRecent
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <AlertCircle className="w-5 h-5 text-amber-500" />}
                <div>
                  <a href={settings.linked_website_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:underline flex items-center gap-1">
                    {settings.linked_website_url} <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      Last seen: {settings.last_heartbeat_at ? new Date(settings.last_heartbeat_at).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${isRecent ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {isRecent ? "Connected" : "Stale"}
              </span>
            </div>
          );
        })() : (
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            No website connected yet. Deploy the company-website-template with your Company ID to connect.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["pages", "settings", "submissions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "pages" && <FileText className="w-4 h-4 inline mr-1" />}
            {t === "settings" && <Settings className="w-4 h-4 inline mr-1" />}
            {t === "submissions" && <Mail className="w-4 h-4 inline mr-1" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* PAGES TAB */}
      {tab === "pages" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{pages.length} page(s)</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Add Page
            </button>
          </div>

          {showForm && (
            <div className="bg-white border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold">{editId ? "Edit Page" : "New Page"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Title" value={pTitle} onChange={e => setPTitle(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Slug (e.g. about-us)" value={pSlug} onChange={e => setPSlug(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={pType} onChange={e => setPType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  {PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Sort order" value={pOrder} onChange={e => setPOrder(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea placeholder='Content JSON (e.g. {"sections":[...]})' rows={5} value={pContent} onChange={e => setPContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Meta title" value={pMeta} onChange={e => setPMeta(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Meta description" value={pMetaDesc} onChange={e => setPMetaDesc(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={pPublished} onChange={e => setPPublished(e.target.checked)} /> Published</label>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={pNav} onChange={e => setPNav(e.target.checked)} /> Show in nav</label>
              </div>
              <div className="flex gap-2">
                <button onClick={savePage} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  <Save className="w-4 h-4 inline mr-1" />{saving ? "Saving…" : "Save"}
                </button>
                <button onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="divide-y border rounded-xl bg-white">
            {pages.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Layout className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-medium text-sm">{p.title}</span>
                    <span className="ml-2 text-xs text-gray-400">/{p.slug}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${p.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.page_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.is_published ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                  <button onClick={() => editPage(p)} className="text-indigo-600 hover:text-indigo-800"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deletePage(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {pages.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">No pages yet. Add your first page above.</p>}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="bg-white border rounded-xl p-6 space-y-5">
          <h3 className="font-semibold text-lg">Site Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-500 block mb-1">Site Title</label><input value={settings.site_title} onChange={e => setSettings({ ...settings, site_title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">Tagline</label><input value={settings.tagline} onChange={e => setSettings({ ...settings, tagline: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">Logo URL</label><input value={settings.logo_url} onChange={e => setSettings({ ...settings, logo_url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <div className="flex-1"><label className="text-xs text-gray-500 block mb-1">Primary Color</label><input type="color" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} className="w-full h-10 border rounded-lg" /></div>
              <div className="flex-1"><label className="text-xs text-gray-500 block mb-1">Secondary Color</label><input type="color" value={settings.secondary_color} onChange={e => setSettings({ ...settings, secondary_color: e.target.value })} className="w-full h-10 border rounded-lg" /></div>
            </div>
          </div>
          <h4 className="font-medium text-sm text-gray-600 mt-4">Contact</h4>
          <div className="grid grid-cols-3 gap-4">
            <input placeholder="Email" value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={settings.contact_phone} onChange={e => setSettings({ ...settings, contact_phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address" value={settings.contact_address} onChange={e => setSettings({ ...settings, contact_address: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <h4 className="font-medium text-sm text-gray-600">Social</h4>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Facebook URL" value={settings.social_facebook} onChange={e => setSettings({ ...settings, social_facebook: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Instagram URL" value={settings.social_instagram} onChange={e => setSettings({ ...settings, social_instagram: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Footer Text</label><input value={settings.footer_text} onChange={e => setSettings({ ...settings, footer_text: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <h4 className="font-medium text-sm text-gray-600">SEO</h4>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Meta title" value={settings.meta_title} onChange={e => setSettings({ ...settings, meta_title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Meta description" value={settings.meta_description} onChange={e => setSettings({ ...settings, meta_description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.is_published} onChange={e => setSettings({ ...settings, is_published: e.target.checked })} /> Publish website</label>
          <button onClick={saveSettings} disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4 inline mr-1" />{saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === "submissions" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{submissions.filter(s => !s.is_read).length} unread submission(s)</p>
          <div className="divide-y border rounded-xl bg-white">
            {submissions.map(s => (
              <div key={s.id} className={`px-4 py-3 ${s.is_read ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className={`w-4 h-4 ${s.is_read ? "text-gray-300" : "text-indigo-500"}`} />
                    <span className="text-sm font-medium">{s.form_type}</span>
                    <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  {!s.is_read && (
                    <button onClick={() => markRead(s.id)} className="text-xs text-indigo-600 hover:underline">Mark read</button>
                  )}
                </div>
                <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-auto max-h-32">{JSON.stringify(s.data, null, 2)}</pre>
              </div>
            ))}
            {submissions.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">No form submissions yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
