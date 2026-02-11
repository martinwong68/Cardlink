import { redirect } from "next/navigation";

export default function DashboardNfcRedirectPage() {
  redirect("/dashboard/cards?tab=nfc");
}
