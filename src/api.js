// Thin wrapper over the Spotify Web API endpoints this POC uses.

import { API_BASE } from "./config.js";
import { getAccessToken, logout } from "./auth.js";

async function get(path, params = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not signed in.");

  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired — sign in again.");
  }
  if (res.status === 429) {
    throw new Error(`Rate limited. Retry in ${res.headers.get("Retry-After") || "a few"}s.`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Spotify returned ${res.status}.`);
  }
  return res.json();
}

export const getProfile = () => get("/me");

export const getTopTracks = (time_range = "medium_term") =>
  get("/me/top/tracks", { limit: 20, time_range }).then((d) => d.items);

export const searchTracks = (q) =>
  get("/search", { q, type: "track", limit: 20 }).then((d) => d.tracks.items);
