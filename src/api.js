// Thin wrapper over the Spotify Web API endpoints this POC uses.

import { API_BASE } from "./config.js";
import { getAccessToken, logout } from "./auth.js";

async function request(method, path, { params = {}, body } = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not signed in.");

  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    logout();
    throw new Error("Session expired — sign in again.");
  }
  // The playback endpoints answer 403 when the account isn't Premium and 404
  // when the target device hasn't registered yet. Both are otherwise opaque.
  if (res.status === 403) {
    throw new Error("Spotify refused that — full playback requires Premium.");
  }
  if (res.status === 404 && path.startsWith("/me/player")) {
    throw new Error("The player isn't ready yet — give it a moment and retry.");
  }
  if (res.status === 429) {
    throw new Error(`Rate limited. Retry in ${res.headers.get("Retry-After") || "a few"}s.`);
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error?.message || `Spotify returned ${res.status}.`);
  }

  // Playback calls succeed with 204 and an empty body — nothing to parse.
  if (res.status === 204) return null;
  return res.json();
}

export const getProfile = () => request("GET", "/me");

export const getTopTracks = (time_range = "medium_term") =>
  request("GET", "/me/top/tracks", { params: { limit: 20, time_range } }).then(
    (d) => d.items,
  );

export const searchTracks = (q) =>
  request("GET", "/search", { params: { q, type: "track", limit: 20 } }).then(
    (d) => d.tracks.items,
  );

/** Start playing the given track URIs on our own SDK device. */
export const playTracks = (deviceId, uris) =>
  request("PUT", "/me/player/play", {
    params: { device_id: deviceId },
    body: { uris },
  });

/** Move the user's active playback onto this tab without starting it. */
export const transferPlayback = (deviceId) =>
  request("PUT", "/me/player", {
    body: { device_ids: [deviceId], play: false },
  });
