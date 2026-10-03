// lib/api.ts
// Set EXPO_PUBLIC_API_URL in .env, e.g. http://192.168.1.10:3000
const BASE = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: "GET" | "POST" | "DELETE" | "PATCH";
  body?: unknown;
  token?: string | null;
};

export async function api<T>(path: string, { method = "GET", body, token }: Options = {}) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Something went wrong", res.status, data);
  }
  return data as T;
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
