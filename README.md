# musie — Spotify POC

A proof of concept for browsing Spotify from the browser: sign in with your own
Spotify account, see your top tracks, search the catalogue and play 30-second
previews.

No build step, no backend, no dependencies — plain ES modules served as static
files. Authentication uses the **Authorization Code flow with PKCE**, which is
the flow Spotify recommends for public clients, so there is no client secret
anywhere in the repo.

## Setup

1. Create an app at <https://developer.spotify.com/dashboard>.
2. Under **Redirect URIs**, add exactly:

   ```
   http://127.0.0.1:5173/
   ```

   Spotify no longer accepts `http://localhost`, and the trailing slash matters.
3. Under **APIs used**, tick *Web API*.
4. Copy the **Client ID**.

## Run

```bash
./serve.sh
```

Then open <http://127.0.0.1:5173/>. A client ID is already committed in
[`src/config.js`](src/config.js) — that is safe, because the client ID is not a
secret under PKCE. Clear it to have the app prompt for a different one instead
and keep it in `localStorage`.

While the Spotify app is in *development mode*, only accounts you have added
under **User Management** in the dashboard can sign in.

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Shell — a header and a single view container |
| `src/config.js` | Client ID, redirect URI, scopes, endpoints |
| `src/auth.js` | PKCE login, token exchange, refresh, storage |
| `src/api.js` | Fetch wrapper for the Web API endpoints used here |
| `src/app.js` | Rendering and event handling |
| `serve.sh` | Static server on 127.0.0.1:5173 |

Scopes requested: `user-read-private`, `user-read-email`, `user-top-read`,
`playlist-read-private`.

## Known limits

- `preview_url` is `null` for much of the catalogue; those rows show only an
  "Open ↗" deep link into Spotify. Full in-page playback would need the Web
  Playback SDK and a Premium account.
- Tokens live in `localStorage`, which is fine for a local POC but is not how
  you would ship this — a production app would keep the refresh token on a
  server.
- `/me/top/tracks` is empty for brand-new accounts with no listening history.
