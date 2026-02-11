import { CreditCard } from "lucide-react";

import StatusLayout from "../StatusLayout";

export default function TapNoCardPage() {
  return (
    <StatusLayout
      icon={CreditCard}
      title="No Card Linked"
      body="This NFC card hasn't been linked to a digital business card yet."
      linkLabel="Set up your card"
      linkHref="/dashboard"
    />
  );
}
