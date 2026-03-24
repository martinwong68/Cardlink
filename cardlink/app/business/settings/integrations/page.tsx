"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plug, ExternalLink, Check, X, RefreshCw } from "lucide-react";

type Integration = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  docsUrl: string;
  connected: boolean;
  config: Record<string, string>;
};

const INTEGRATIONS: Omit<Integration, "connected" | "config">[] = [
  {
    key: "wordpress",
    name: "WordPress",
    description: "Connect your WordPress site via REST API. Sync posts, pages, and WooCommerce data.",
    icon: "🌐",
    category: "CMS",
    docsUrl: "https://developer.wordpress.org/rest-api/",
  },
  {
    key: "woocommerce",
    name: "WooCommerce",
    description: "Sync products, orders, and customers with your WooCommerce store.",
    icon: "🛒",
    category: "E-Commerce",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  },
  {
    key: "shopify",
    name: "Shopify",
    description: "Connect your Shopify store to sync products, orders, and inventory.",
    icon: "🛍️",
    category: "E-Commerce",
    docsUrl: "https://shopify.dev/docs/api",
  },
  {
    key: "xero",
    name: "Xero",
    description: "Sync invoices, contacts, and bank transactions with Xero accounting.",
    icon: "📊",
    category: "Accounting",
    docsUrl: "https://developer.xero.com/",
  },
  {
    key: "stripe",
    name: "Stripe",
    description: "Process payments, manage subscriptions, and track revenue.",
    icon: "💳",
    category: "Payments",
    docsUrl: "https://stripe.com/docs/api",
  },
  {
    key: "mailchimp",
    name: "Mailchimp",
    description: "Sync customer lists and automate email marketing campaigns.",
    icon: "📧",
    category: "Marketing",
    docsUrl: "https://mailchimp.com/developer/",
  },
  {
    key: "google_analytics",
    name: "Google Analytics",
    description: "Track website traffic and e-commerce performance metrics.",
    icon: "📈",
    category: "Analytics",
    docsUrl: "https://developers.google.com/analytics",
  },
  {
    key: "zapier",
    name: "Zapier",
    description: "Automate workflows by connecting Cardlink with 5,000+ apps.",
    icon: "⚡",
    category: "Automation",
    docsUrl: "https://zapier.com/developer",
  },
];

const CONFIG_FIELDS: Record<string, { label: string; placeholder: string; type?: string }[]> = {
  wordpress: [
    { label: "Site URL", placeholder: "https://your-site.com" },
    { label: "Application Password (Username)", placeholder: "admin" },
    { label: "Application Password (Key)", placeholder: "xxxx xxxx xxxx xxxx", type: "password" },
  ],
  woocommerce: [
    { label: "Store URL", placeholder: "https://your-store.com" },
    { label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxxxxx" },
    { label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxxxxx", type: "password" },
  ],
  shopify: [
    { label: "Shop Domain", placeholder: "your-store.myshopify.com" },
    { label: "Admin API Access Token", placeholder: "shpat_xxxxxxxxxxxxxxxx", type: "password" },
  ],
  xero: [
    { label: "Client ID", placeholder: "Your Xero app Client ID" },
    { label: "Client Secret", placeholder: "Your Xero app Client Secret", type: "password" },
  ],
  stripe: [
    { label: "Publishable Key", placeholder: "pk_live_xxxxxxxx" },
    { label: "Secret Key", placeholder: "sk_live_xxxxxxxx", type: "password" },
  ],
  mailchimp: [
    { label: "API Key", placeholder: "xxxxxxxx-us1", type: "password" },
    { label: "Server Prefix", placeholder: "us1" },
  ],
  google_analytics: [
    { label: "Measurement ID", placeholder: "G-XXXXXXXXXX" },
  ],
  zapier: [
    { label: "Webhook URL", placeholder: "https://hooks.zapier.com/hooks/catch/..." },
  ],
};

export default function IntegrationsSettingsPage() {
  const t = useTranslations("businessSettingsOverview");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  /* Load saved integrations */
  const loadIntegrations = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/owner/integrations", {
        headers: { "x-cardlink-app-scope": "business" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const savedConfigs: Record<string, Record<string, string>> = {};
        const connected: Record<string, boolean> = {};
        for (const int of (data.integrations ?? []) as { integration_key: string; config: Record<string, string>; is_active: boolean }[]) {
          savedConfigs[int.integration_key] = int.config ?? {};
          connected[int.integration_key] = int.is_active;
        }
        setConfigs(savedConfigs);
        setConnectedMap(connected);
      }
    } catch {
      setLoadError("Failed to load integrations. Please refresh the page.");
    }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  /* Get config values for an integration */
  const getFieldValues = (key: string): string[] => {
    const fields = CONFIG_FIELDS[key] ?? [];
    return fields.map((_, i) => configs[key]?.[`field_${i}`] ?? "");
  };

  const setFieldValue = (integrationKey: string, fieldIndex: number, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [integrationKey]: {
        ...prev[integrationKey],
        [`field_${fieldIndex}`]: value,
      },
    }));
  };

  /* Save / Connect */
  const handleSave = async (key: string, connect: boolean) => {
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch("/api/owner/integrations", {
        method: "POST",
        headers: { "content-type": "application/json", "x-cardlink-app-scope": "business" },
        body: JSON.stringify({
          integration_key: key,
          config: configs[key] ?? {},
          is_active: connect,
        }),
      });
      if (res.ok) {
        setConnectedMap((prev) => ({ ...prev, [key]: connect }));
        setSaveError(null);
        if (!connect) setTestResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
      } else {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to save integration.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  /* Test connection */
  const handleTest = async (key: string) => {
    setTesting(key);
    try {
      const res = await fetch("/api/owner/integrations/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-cardlink-app-scope": "business" },
        body: JSON.stringify({ integration_key: key }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [key]: { ok: res.ok, message: data.message ?? (res.ok ? "Connection successful!" : "Connection failed.") } }));
    } catch {
      setTestResults((prev) => ({ ...prev, [key]: { ok: false, message: "Network error." } }));
    } finally {
      setTesting(null);
    }
  };

  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.integrations.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.integrations.desc")}</p>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{loadError}</div>
      )}

      {saveError && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{saveError}</div>
      )}

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{cat}</h2>
          <div className="space-y-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((integration) => {
              const isExpanded = expandedKey === integration.key;
              const isConnected = connectedMap[integration.key] ?? false;
              const fields = CONFIG_FIELDS[integration.key] ?? [];
              const fieldValues = getFieldValues(integration.key);
              const testResult = testResults[integration.key];

              return (
                <div key={integration.key} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedKey(isExpanded ? null : integration.key)}
                    className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                  >
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                        {isConnected && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Connected</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{integration.description}</p>
                    </div>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  </button>

                  {/* Expanded Config */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 p-4 space-y-3">
                      {fields.map((field, i) => (
                        <div key={i}>
                          <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                          <input
                            type={field.type ?? "text"}
                            value={fieldValues[i] ?? ""}
                            onChange={(e) => setFieldValue(integration.key, i, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                          />
                        </div>
                      ))}

                      {/* Test result */}
                      {testResult && (
                        <div className={`rounded-lg p-2 text-xs font-medium ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {testResult.ok ? <Check className="inline h-3 w-3 mr-1" /> : <X className="inline h-3 w-3 mr-1" />}
                          {testResult.message}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {!isConnected ? (
                          <button
                            onClick={() => handleSave(integration.key, true)}
                            disabled={saving === integration.key}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving === integration.key ? "Saving…" : "Connect"}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSave(integration.key, true)}
                              disabled={saving === integration.key}
                              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving === integration.key ? "Saving…" : "Update"}
                            </button>
                            <button
                              onClick={() => handleSave(integration.key, false)}
                              disabled={saving === integration.key}
                              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleTest(integration.key)}
                          disabled={testing === integration.key}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RefreshCw className={`inline h-3 w-3 mr-1 ${testing === integration.key ? "animate-spin" : ""}`} />
                          Test
                        </button>
                        <a
                          href={integration.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs text-indigo-500 hover:underline flex items-center gap-1"
                        >
                          Docs <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
