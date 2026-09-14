// Spotify app settings.
//
// The client ID is NOT a secret in the PKCE flow — it is safe to commit.
// Leave it empty and the app will prompt for it and store it in localStorage,
// which is handy when several people share the repo with their own Spotify apps.
export const CLIENT_ID = "";

// Must match a Redirect URI registered on your app at
// https://developer.spotify.com/dashboard exactly, including the trailing slash.
// Spotify no longer accepts "localhost" — use the loopback IP.
export const REDIRECT_URI = "http://127.0.0.1:5173/";

export const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "playlist-read-private",
].join(" ");

export const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
export const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
export const API_BASE = "https://api.spotify.com/v1";
