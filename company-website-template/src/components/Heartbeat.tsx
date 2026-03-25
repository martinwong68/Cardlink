"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_CARDLINK_API_URL ?? "";
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID ?? "";
const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Sends a heartbeat to the Cardlink app so the dashboard knows
 * this website is connected and what URL it's running on.
 * Throttled to at most once per hour via localStorage.
 * Renders nothing — include once in the root layout.
 */
export default function Heartbeat() {
  useEffect(() => {
    if (!API_BASE || !COMPANY_ID) return;

    const websiteUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    if (!websiteUrl) return;

    // Throttle: only send once per hour
    const storageKey = "cardlink_heartbeat_ts";
    const lastSent = Number(localStorage.getItem(storageKey) || "0");
    if (Date.now() - lastSent < HEARTBEAT_INTERVAL_MS) return;

    localStorage.setItem(storageKey, String(Date.now()));

    // Fire-and-forget — don't block rendering
    fetch(`${API_BASE}/api/public/website/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        website_url: websiteUrl,
      }),
    }).catch(() => {
      // Silently ignore — heartbeat is best-effort
    });
  }, []);

  return null;
}
