// Spotify app settings.
//
// The client ID is NOT a secret in the PKCE flow — it is safe to commit.
// Clear it and the app will prompt for one instead and store it in localStorage,
// which is handy if someone wants to point this at their own Spotify app.
export const CLIENT_ID = "6796456706bf44168a52d61b46d7c11e";

// Must match a Redirect URI registered on your app at
// https://developer.spotify.com/dashboard exactly, including the trailing slash.
// Spotify no longer accepts "localhost" — use the loopback IP.
export const REDIRECT_URI = "http://127.0.0.1:5173/";

export const SCOPES = [
  // Required by the Web Playback SDK itself.
  "streaming",
  "user-read-private",
  "user-read-email",
  // Required to start/pause and to read what is currently playing.
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

// The one track this POC plays. It is the id in a Spotify share link:
// https://open.spotify.com/intl-de/track/<id>?si=...
export const TRACK_ID = "0riRZrZ047t64W8esri5a5";

export const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
export const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
export const API_BASE = "https://api.spotify.com/v1";
