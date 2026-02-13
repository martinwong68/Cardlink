type Visibility = "public" | "friends" | "hidden";

type ViewerPlan = "free" | "premium" | "anonymous";

type ConnectionStatus = "none" | "accepted" | "pending" | "self";

type CardField = {
  visibility: Visibility;
};

type VisibleField<T> = T & {
  visible: boolean;
  message?: string;
};

export function getVisibleFields<T extends CardField>(
  fields: T[],
  viewerPlan: ViewerPlan,
  connectionStatus: ConnectionStatus
): VisibleField<T>[] {
  if (connectionStatus === "self") {
    return fields.map((field) => ({ ...field, visible: true }));
  }

  let publicCount = 0;

  return fields.map((field) => {
    if (field.visibility === "hidden") {
      return { ...field, visible: false };
    }

    if (field.visibility === "public") {
      if (viewerPlan === "anonymous") {
        if (publicCount >= 3) {
          return { ...field, visible: false };
        }
        publicCount += 1;
      }

      return { ...field, visible: true };
    }

    const isConnected = connectionStatus === "accepted";

    if (viewerPlan === "anonymous") {
      return { ...field, visible: true, message: "Sign up to connect" };
    }

    if (viewerPlan === "free") {
      if (!isConnected) {
        return { ...field, visible: true, message: "Connect to see" };
      }

      return { ...field, visible: true, message: "Upgrade to Premium" };
    }

    if (!isConnected) {
      return { ...field, visible: true, message: "Connect to see" };
    }

    return { ...field, visible: true };
  });
}

export function canAccessCRM(plan: ViewerPlan) {
  return plan === "premium";
}

export type { ConnectionStatus, ViewerPlan, VisibleField };
