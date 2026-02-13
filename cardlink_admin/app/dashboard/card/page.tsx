import { redirect } from "next/navigation";

export default function CardPageRedirect() {
  redirect("/dashboard/cards");
}
