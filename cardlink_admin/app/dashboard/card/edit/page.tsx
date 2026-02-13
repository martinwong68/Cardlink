"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EyeOff, Globe, Users } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";

const fieldTypes = [
  "Phone",
  "Email",
  "WeChat",
  "WhatsApp",
  "LinkedIn",
  "Twitter/X",
  "XHS",
  "Website",
  "Other",
];

import { redirect } from "next/navigation";

export default function CardEditRedirect() {
  redirect("/dashboard/cards");
}

