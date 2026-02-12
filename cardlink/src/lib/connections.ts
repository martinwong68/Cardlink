import { createClient } from "@/src/lib/supabase/client";

type ConnectionRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string | null;
  connected_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type CardRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  slug?: string | null;
};

export type ConnectionStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "declined";

export type FriendContact = {
  connectionId: string;
  userId: string;
  fullName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  cardSlug: string | null;
  connectedAt: string | null;
  createdAt: string | null;
};

export type PendingRequest = {
  connectionId: string;
  userId: string;
  fullName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
};

export async function sendConnectionRequest(
  requesterId: string,
  receiverId: string
) {
  const supabase = createClient();
  return supabase.from("connections").insert({
    requester_id: requesterId,
    receiver_id: receiverId,
    status: "pending",
  });
}

export async function acceptConnection(connectionId: string) {
  const supabase = createClient();
  return supabase
    .from("connections")
    .update({
      status: "accepted",
      connected_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
}

export async function rejectConnection(connectionId: string) {
  const supabase = createClient();
  return supabase
    .from("connections")
    .update({ status: "declined" })
    .eq("id", connectionId);
}

export async function removeConnection(connectionId: string) {
  const supabase = createClient();
  return supabase.from("connections").delete().eq("id", connectionId);
}

export async function getConnectionStatus(
  userId1: string,
  userId2: string
): Promise<ConnectionStatus> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("connections")
    .select("id, status, requester_id, receiver_id")
    .or(
      `and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`
    );

  if (error || !data || data.length === 0) {
    return "none";
  }

  const hasAccepted = data.some((row) => row.status === "accepted");
  if (hasAccepted) {
    return "accepted";
  }

  const hasDeclined = data.some((row) => row.status === "declined");
  if (hasDeclined) {
    return "declined";
  }

  const sentByUser1 = data.find(
    (row) => row.status === "pending" && row.requester_id === userId1
  );
  if (sentByUser1) {
    return "pending_sent";
  }

  const receivedByUser1 = data.find(
    (row) => row.status === "pending" && row.requester_id === userId2
  );
  if (receivedByUser1) {
    return "pending_received";
  }

  return "none";
}

export async function getFriends(userId: string): Promise<FriendContact[]> {
  const supabase = createClient();
  const { data: connections, error } = await supabase
    .from("connections")
    .select(
      "id, requester_id, receiver_id, status, created_at, connected_at"
    )
    .or(
      `and(requester_id.eq.${userId},status.eq.accepted),and(receiver_id.eq.${userId},status.eq.accepted)`
    );

  if (error || !connections || connections.length === 0) {
    return [];
  }

  const friendIds = connections.map((connection) =>
    connection.requester_id === userId
      ? connection.receiver_id
      : connection.requester_id
  );

  const { data: cards } = await supabase
    .from("business_cards")
    .select("id, user_id, full_name, title, company, slug")
    .eq("is_default", true)
    .in("user_id", friendIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", friendIds);

  const cardMap = new Map(
    (cards ?? []).map((card) => [card.user_id, card])
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return connections.map((connection) => {
    const friendId =
      connection.requester_id === userId
        ? connection.receiver_id
        : connection.requester_id;
    const card = cardMap.get(friendId) as CardRow | undefined;
    const profile = profileMap.get(friendId) as ProfileRow | undefined;

    return {
      connectionId: connection.id,
      userId: friendId,
      fullName: card?.full_name ?? profile?.full_name ?? "Unknown",
      title: card?.title ?? null,
      company: card?.company ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      cardSlug: card?.slug ?? null,
      connectedAt: connection.connected_at ?? null,
      createdAt: connection.created_at ?? null,
    };
  });
}

export async function getPendingRequests(
  userId: string
): Promise<PendingRequest[]> {
  const supabase = createClient();
  const { data: connections, error } = await supabase
    .from("connections")
    .select(
      "id, requester_id, receiver_id, status, created_at"
    )
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error || !connections || connections.length === 0) {
    return [];
  }

  const requesterIds = connections.map((connection) => connection.requester_id);

  const { data: cards } = await supabase
    .from("business_cards")
    .select("id, user_id, full_name, title, company")
    .eq("is_default", true)
    .in("user_id", requesterIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", requesterIds);

  const cardMap = new Map(
    (cards ?? []).map((card) => [card.user_id, card])
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return connections.map((connection) => {
    const card = cardMap.get(connection.requester_id) as CardRow | undefined;
    const profile = profileMap.get(
      connection.requester_id
    ) as ProfileRow | undefined;

    return {
      connectionId: connection.id,
      userId: connection.requester_id,
      fullName: card?.full_name ?? profile?.full_name ?? "Unknown",
      title: card?.title ?? null,
      company: card?.company ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      createdAt: connection.created_at,
    };
  });
}
