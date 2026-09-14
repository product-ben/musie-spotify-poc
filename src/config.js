// Spotify app settings.
//
// The client ID is NOT a secret in the PKCE flow — it is safe to commit.
// Clear it and the app will prompt for one instead and store it in localStorage,
// which is handy if someone wants to point this at their own Spotify app.
export const CLIENT_ID = "6796456706bf44168a52d61b46d7c11e";

// Derived from wherever the page is being served, so the same build works on
// the laptop and on GitHub Pages. Both of the resulting URLs must be listed as
// Redirect URIs on the app at https://developer.spotify.com/dashboard, exactly,
// trailing slash included:
//
//   http://127.0.0.1:5173/
//   https://<user>.github.io/musie-spotify-poc/
//
// Spotify no longer accepts "localhost" — the local one must be the loopback IP.
export const REDIRECT_URI =
  window.location.origin + window.location.pathname.replace(/[^/]*$/, "");

export const SCOPES = [
  // Required by the Web Playback SDK itself.
  "streaming",
  "user-read-private",
  "user-read-email",
  // Required to start/pause and to read what is currently playing.
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
export const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
export const API_BASE = "https://api.spotify.com/v1";
