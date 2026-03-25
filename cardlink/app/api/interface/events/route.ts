import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

const ALLOWED_EVENT_NAMES = new Set([
  "interface.switch.requested",
  "interface.switch.completed",
  "interface.switch.denied",
  "route.guard.redirected",
] as const);

type InterfaceEventRequest = {
  event_name?: string;
  from_interface?: "client" | "business";
  to_interface?: "client" | "business";
  eligibility_result?: "eligible" | "denied";
  reason_code?: string | null;
  timestamp?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as InterfaceEventRequest;

  if (!body.event_name || !ALLOWED_EVENT_NAMES.has(body.event_name as never)) {
    return NextResponse.json(
      { error: "Unsupported event_name." },
      { status: 400 }
    );
  }

  if (!body.from_interface || !body.to_interface || !body.eligibility_result) {
    return NextResponse.json(
      { error: "from_interface, to_interface, and eligibility_result are required." },
      { status: 400 }
    );
  }

  console.info("interface.telemetry", {
    contract: "interface.switching.events.v1",
    event_name: body.event_name,
    from_interface: body.from_interface,
    to_interface: body.to_interface,
    eligibility_result: body.eligibility_result,
    reason_code: body.reason_code ?? null,
    timestamp: body.timestamp ?? new Date().toISOString(),
  });

  return NextResponse.json(
    {
      contract: "interface.switching.events.v1",
      status: "accepted",
    },
    { status: 202 }
  );
}