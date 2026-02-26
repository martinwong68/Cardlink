import { redirect } from "next/navigation";

export default function CardEditRedirect() {
  redirect("/dashboard/cards");
}

