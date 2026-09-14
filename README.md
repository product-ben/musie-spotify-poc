# musie — Spotify POC

A proof of concept for browsing Spotify from the browser: sign in with your own
Spotify account, see your top tracks, search the catalogue, and play full tracks
in the page itself.

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
| `src/player.js` | Web Playback SDK — registers the tab as a device |
| `src/app.js` | Rendering and event handling |
| `serve.sh` | Static server on 127.0.0.1:5173 |

Scopes requested: `streaming`, `user-read-private`, `user-read-email`,
`user-modify-playback-state`, `user-read-playback-state`, `user-top-read`,
`playlist-read-private`.

## How playback works

Two separate pieces, which is the part that surprises people:

1. The **Web Playback SDK** (`src/player.js`) registers this browser tab as a
   Spotify Connect device — the same list your phone and desktop app appear in.
   It receives audio; it does not choose what to play.
2. The **Web API** (`PUT /me/player/play`) then tells Spotify what to play and
   which device to play it on.

So nothing can play until the SDK's `ready` event has handed over a
`device_id`. The header shows "Player ready" once that has happened.

## Known limits

- **Playback requires Spotify Premium.** There is no free-tier path to full
  playback; it is enforced server-side, and a free account gets an
  `account_error` from the SDK.
- **The tab must stay open.** Closing it removes the device and stops playback.
- **Serve from `127.0.0.1`.** Protected audio needs a secure context, which
  loopback satisfies even over plain `http://`. Serving from your machine's
  network IP to test on a phone will break playback unless it is over HTTPS.
- **Desktop browsers are the tested ground.** On iOS, audio will not start
  until the user taps a control inside the page.
- Tokens live in `localStorage`, which is fine for a local POC but is not how
  you would ship this — a production app would keep the refresh token on a
  server.
- `/me/top/tracks` is empty for brand-new accounts with no listening history.
