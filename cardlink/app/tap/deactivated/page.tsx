import { XCircle } from "lucide-react";

import StatusLayout from "../StatusLayout";

export default function TapDeactivatedPage() {
  return (
    <StatusLayout
      icon={XCircle}
      title="Card Deactivated"
      body="This card is no longer active."
    />
  );
}
