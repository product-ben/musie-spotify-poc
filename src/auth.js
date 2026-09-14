// Authorization Code flow with PKCE.
// No client secret, no backend — everything runs in the browser.

import {
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  AUTH_ENDPOINT,
  TOKEN_ENDPOINT,
} from "./config.js";

const STORE = {
  verifier: "musie.pkce_verifier",
  state: "musie.oauth_state",
  tokens: "musie.tokens",
  clientId: "musie.client_id",
};

export function getClientId() {
  return CLIENT_ID || localStorage.getItem(STORE.clientId) || "";
}

export function setClientId(id) {
  localStorage.setItem(STORE.clientId, id.trim());
}

function randomString(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(digest);
}

/** Send the browser to Spotify's consent screen. */
export async function login() {
  const clientId = getClientId();
  if (!clientId) throw new Error("No client ID configured.");

  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(STORE.verifier, verifier);
  sessionStorage.setItem(STORE.state, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: await challengeFor(verifier),
    state,
  });
  window.location.assign(`${AUTH_ENDPOINT}?${params}`);
}

/**
 * If we've just come back from Spotify, swap the ?code for tokens.
 * Returns true when a redirect was handled, so the caller can re-render.
 */
export async function handleRedirect() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  if (!code && !error) return false;

  // Clear the query string either way so a refresh doesn't replay the code.
  window.history.replaceState({}, "", REDIRECT_URI);

  if (error) throw new Error(`Spotify denied the request: ${error}`);
  if (state !== sessionStorage.getItem(STORE.state)) {
    throw new Error("State mismatch — ignoring this redirect.");
  }

  const verifier = sessionStorage.getItem(STORE.verifier);
  if (!verifier) throw new Error("Missing PKCE verifier — start the login again.");

  await requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  sessionStorage.removeItem(STORE.verifier);
  sessionStorage.removeItem(STORE.state);
  return true;
}

async function requestTokens(fields) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: getClientId(), ...fields }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Token request failed.");
  }

  const previous = readTokens();
  saveTokens({
    access_token: data.access_token,
    // A refresh response may omit refresh_token; keep the one we already have.
    refresh_token: data.refresh_token || previous?.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return data;
}

function readTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORE.tokens) || "null");
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  localStorage.setItem(STORE.tokens, JSON.stringify(tokens));
}

export function isLoggedIn() {
  return Boolean(readTokens()?.refresh_token || readTokens()?.access_token);
}

export function logout() {
  localStorage.removeItem(STORE.tokens);
}

/** Current access token, refreshed if it is within a minute of expiring. */
export async function getAccessToken() {
  const tokens = readTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token;

  if (!tokens.refresh_token) {
    logout();
    return null;
  }
  try {
    const data = await requestTokens({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    });
    return data.access_token;
  } catch (err) {
    logout();
    throw err;
  }
}
