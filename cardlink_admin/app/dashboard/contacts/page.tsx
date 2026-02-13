import { redirect } from "next/navigation";

export default function ContactsRedirectPage() {
  redirect("/dashboard/cards?tab=contacts");
}
