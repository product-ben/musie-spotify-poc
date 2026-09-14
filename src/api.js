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

  // Read the body first: Spotify explains itself in error.message, and
  // throwing that away is what made a 403 here impossible to diagnose.
  const payload = res.status === 204 ? null : await res.json().catch(() => null);
  const detail = payload?.error?.message;
  const where = `${method} ${path}`;

  if (res.ok) return payload;

  if (res.status === 401) {
    logout();
    throw new Error("Session expired — sign in again.");
  }
  if (res.status === 403) {
    // Only the playback endpoints are about Premium; elsewhere a 403 means
    // the app itself lacks access to that endpoint.
    throw new Error(
      path.startsWith("/me/player")
        ? `Playback refused${detail ? `: ${detail}` : ""} — this normally means the account isn't Premium.`
        : `Spotify refused ${where} (403)${detail ? `: ${detail}` : " with no explanation."}`,
    );
  }
  if (res.status === 404 && path.startsWith("/me/player")) {
    throw new Error("The player isn't ready yet — give it a moment and retry.");
  }
  if (res.status === 429) {
    throw new Error(`Rate limited. Retry in ${res.headers.get("Retry-After") || "a few"}s.`);
  }
  throw new Error(detail || `${where} failed with ${res.status}.`);
}

export const getProfile = () => request("GET", "/me");

export const getTrack = (id) => request("GET", `/tracks/${id}`);

export const getAlbum = (id) => request("GET", `/albums/${id}`);

export const getArtists = (ids) =>
  request("GET", "/artists", { params: { ids: ids.join(",") } }).then(
    (d) => d.artists,
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
