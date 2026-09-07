import { useAuthStore } from "@/lib/store/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

let refreshing: Promise<string | null> | null = null;

/** Try to mint a new access token from the httpOnly refresh cookie. */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as {
          accessToken: string;
          user?: { id: string };
        };

        // The refresh cookie is per-browser. If it now belongs to someone else,
        // adopting the token would silently continue this tab as that person —
        // so drop the session and make them sign in again instead.
        const current = useAuthStore.getState().user;
        if (data.user && current && data.user.id !== current.id) {
          useAuthStore.getState().clear("switched");
          return null;
        }

        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let token = useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  // On 401, try one silent refresh + retry.
  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    if (token) {
      res = await doFetch(token);
    } else {
      // The session could not be renewed — it expired, was revoked, or the
      // account was deactivated. Record why, so the sign-in screen can say so
      // rather than dumping them on a blank form mid-task.
      const wasSignedIn = useAuthStore.getState().status === "authenticated";
      useAuthStore.getState().clear(wasSignedIn ? "expired" : null);
    }
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Request failed", data?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  del: <T>(path: string, opts?: Options) => request<T>(path, { ...opts, method: "DELETE" }),
  refreshAccessToken,
};
