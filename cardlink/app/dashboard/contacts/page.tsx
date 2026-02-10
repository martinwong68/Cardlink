import { redirect } from "next/navigation";

export default function ContactsRedirectPage() {
  redirect("/dashboard/card?tab=contacts");
}
