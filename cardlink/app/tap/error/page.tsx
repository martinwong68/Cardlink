import { AlertTriangle } from "lucide-react";

import StatusLayout from "../StatusLayout";

export default function TapErrorPage() {
  return (
    <StatusLayout
      icon={AlertTriangle}
      title="Card Not Found"
      body="This NFC card is not recognized."
    />
  );
}
