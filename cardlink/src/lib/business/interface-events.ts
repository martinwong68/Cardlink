export type InterfaceEventName =
  | "interface.switch.requested"
  | "interface.switch.completed"
  | "interface.switch.denied"
  | "route.guard.redirected";

type InterfaceEventPayload = {
  event_name: InterfaceEventName;
  from_interface: "client" | "business";
  to_interface: "client" | "business";
  eligibility_result: "eligible" | "denied";
  reason_code?: string | null;
};

export function trackInterfaceEvent(payload: InterfaceEventPayload) {
  const requestBody = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  void fetch("/api/interface/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
    keepalive: true,
  }).catch(() => {
    // Telemetry must never block UX actions.
  });
}