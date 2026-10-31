import type {
  CollegeDetail,
  CollegePage,
  CollegeQuery,
  Coverage,
  Facets,
  FinderRequest,
  FinderResponse,
} from "./types";

// Empty by default: in development Vite proxies /api to the backend.
// In production set VITE_API_BASE_URL to the deployed API origin.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit = { signal, headers };
  if (body !== undefined) {
    init.method = "POST";
    init.body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError("Could not reach the Admission PS server. Check your connection and try again.", 0);
  }
  if (!response.ok) {
    const message =
      response.status === 404
        ? "We could not find that record."
        : response.status === 422
          ? "Some of the values were not accepted. Check the numbers and try again."
          : "The server had a problem handling this request. Try again in a moment.";
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

function toQueryString(query: CollegeQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const api = {
  colleges: (query: CollegeQuery, signal?: AbortSignal) =>
    request<CollegePage>(`/api/colleges${toQueryString(query)}`, signal),
  college: (slug: string, signal?: AbortSignal) =>
    request<CollegeDetail>(`/api/colleges/${encodeURIComponent(slug)}`, signal),
  facets: (signal?: AbortSignal) => request<Facets>("/api/colleges/facets", signal),
  coverage: (signal?: AbortSignal) => request<Coverage>("/api/coverage", signal),
  recommend: (body: FinderRequest, signal?: AbortSignal) =>
    request<FinderResponse>("/api/finder/recommend", signal, body),
};
