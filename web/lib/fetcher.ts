// lib/fetcher.ts  -  browser helper for the admin pages (the login cookie is sent automatically)
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
  return data as T;
}

export const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
