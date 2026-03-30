import type {
  Order,
  Driver,
  AnalyticsSummary,
  DriverPosition,
  HealthStatus,
  PaginatedResponse,
  CreateOrderInput,
  SimulationTick,
} from "./types";

// ─── Base URL ───
// In dev, Next.js rewrites /api/* to the gateway. In prod, set NEXT_PUBLIC_API_URL.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Generic Fetch ───

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error ${status}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Don't redirect for auth endpoints — the auth store handles those
    const isAuthEndpoint = path.startsWith("/api/auth/");
    if (!isAuthEndpoint && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, { error: "UNAUTHORIZED" });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}

// ─── Health ───

export const api = {
  health: {
    check: () => request<HealthStatus>("/api/health"),
  },

  // ─── Auth ───
  auth: {
    signUp: (name: string, email: string, password: string) =>
      request<{ user: import("./types").AuthUser; token: string }>(
        "/api/auth/sign-up/email",
        { method: "POST", body: JSON.stringify({ name, email, password }) },
      ),

    signIn: (email: string, password: string) =>
      request<{ user: import("./types").AuthUser; token: string }>(
        "/api/auth/sign-in/email",
        { method: "POST", body: JSON.stringify({ email, password }) },
      ),

    getSession: () =>
      request<{ session: { user: import("./types").AuthUser } | null }>(
        "/api/auth/get-session",
      ),

    signOut: () =>
      request<{}>("/api/auth/sign-out", { method: "POST" }),
  },

  // ─── Orders ───
  orders: {
    list: (params?: {
      status?: string;
      riskTier?: string;
      zoneId?: string;
      page?: number;
      limit?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.riskTier) qs.set("riskTier", params.riskTier);
      if (params?.zoneId) qs.set("zoneId", params.zoneId);
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      const query = qs.toString();
      return request<PaginatedResponse<Order>>(
        `/api/orders${query ? `?${query}` : ""}`,
      );
    },

    get: (id: string) => request<{ data: Order }>(`/api/orders/${id}`),

    create: (input: CreateOrderInput) =>
      request<{ data: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    updateStatus: (id: string, status: string) =>
      request<{ data: Order }>(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  // ─── Drivers ───
  drivers: {
    list: () => request<{ data: Driver[] }>("/api/drivers"),

    get: (id: string) => request<{ data: Driver }>(`/api/drivers/${id}`),

    create: (input: { name: string; currentLat?: number; currentLng?: number }) =>
      request<{ data: Driver }>("/api/drivers", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    updatePosition: (id: string, lat: number, lng: number) =>
      request<{ data: Driver }>(`/api/drivers/${id}/position`, {
        method: "PATCH",
        body: JSON.stringify({ lat, lng }),
      }),

    positions: () => request<{ data: DriverPosition[] }>("/api/track"),
  },

  // ─── Routes ───
  routes: {
    optimize: (input: import("./types").OptimizeRouteInput) =>
      request<{ data: import("./types").OptimizeRouteResponse }>("/api/route/optimize", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    reroute: (driverId: string, reason?: string) =>
      request<{ data: unknown }>("/api/route/reroute", {
        method: "POST",
        body: JSON.stringify({ driverId, reason }),
      }),

    list: (params?: { driverId?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.driverId) qs.set("driverId", params.driverId);
      if (params?.status) qs.set("status", params.status);
      const query = qs.toString();
      return request<{ data: import("./types").Route[] }>(
        `/api/routes${query ? `?${query}` : ""}`,
      );
    },
  },

  // ─── Analytics ───
  analytics: {
    summary: () => request<{ data: AnalyticsSummary }>("/api/analytics/summary"),
  },

  // ─── Simulation ───
  simulate: {
    tick: () => request<{ data: SimulationTick }>("/api/simulate/tick"),
  },

  // ─── Prediction ───
  predict: {
    failure: (orderId: string) =>
      request<{ data: unknown }>("/api/predict", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      }),
  },
};

export { ApiError };
export default api;
