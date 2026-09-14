// View layer. Signed in, the page shows two things: a play button for one
// fixed track, and a button that reveals everything Spotify knows about it.

import { REDIRECT_URI } from "./config.js";
import { CARDS, cardByCode } from "./tracks.js";
import {
  getClientId,
  setClientId,
  logout,
  handleRedirect,
  isLoggedIn,
  hasCurrentScopes,
} from "./auth.js";
import {
  getProfile,
  getTrack,
  getAlbum,
  getArtists,
  playTracks,
} from "./api.js";
import { sessionBadge, cacheProfile } from "./chrome.js";
import {
  initPlayer,
  disconnect,
  getDeviceId,
  onPlayerState,
  togglePlay,
  nextTrack,
  previousTrack,
  seek,
} from "./player.js";

// A scanned card arrives as ?c=001. It has to be captured before the OAuth
// redirect is handled, because coming back from Spotify strips the query
// string — the card would otherwise be lost across the login.
const CARD_KEY = "musie.card";

function captureCardCode() {
  const fromUrl = new URLSearchParams(window.location.search).get("c");
  if (fromUrl) sessionStorage.setItem(CARD_KEY, fromUrl);
  return fromUrl ?? sessionStorage.getItem(CARD_KEY);
}

const cardCode = captureCardCode();

const sessionEl = document.getElementById("session");
const viewEl = document.getElementById("view");
const barEl = document.getElementById("nowplaying");

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
};

function showError(message) {
  viewEl.prepend(el("div", { className: "notice error", textContent: message }));
}

const formatTime = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

function renderSetup() {
  const input = el("input", {
    placeholder: "Spotify client ID",
    value: getClientId(),
    required: true,
  });
  const form = el("form", {}, [input, el("button", { textContent: "Save" })]);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setClientId(input.value);
    render();
  });

  viewEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("p", {
        textContent:
          "Create an app at developer.spotify.com/dashboard, add this redirect URI, then paste the client ID below.",
      }),
      el("p", {}, [el("code", { textContent: REDIRECT_URI })]),
      form,
    ]),
  );
}

function renderSignedOut() {
  sessionEl.replaceChildren();
  barEl.hidden = true;

  viewEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("p", {
        textContent:
          "This version streams through the Web Playback SDK, which needs a signed-in Premium account.",
      }),
      el("p", {}, [
        el("a", { href: "index.html", textContent: "Sign in on the index page →" }),
      ]),
    ]),
  );
}

/** Flatten the track/album/artist objects into labelled rows for the card. */
function detailRows({ track, album, artists }) {
  const genres = [...new Set(artists.flatMap((a) => a.genres))];
  const followers = artists.reduce((sum, a) => sum + a.followers.total, 0);

  return [
    ["Title", track.name],
    ["Artists", track.artists.map((a) => a.name).join(", ")],
    ["Album", `${album.name} (${album.album_type})`],
    ["Released", album.release_date],
    ["Track", `${track.track_number} of ${album.total_tracks}`],
    ["Disc", album.total_tracks > 1 ? String(track.disc_number) : null],
    ["Duration", formatTime(track.duration_ms)],
    ["Popularity", `${track.popularity} / 100`],
    ["Explicit", track.explicit ? "Yes" : "No"],
    ["Genres", genres.join(", ")],
    ["Artist followers", artists.length ? followers.toLocaleString() : null],
    ["Label", album.label],
    ["Copyright", album.copyrights?.map((c) => c.text).join(" · ")],
    ["ISRC", track.external_ids?.isrc],
    ["Markets", track.available_markets?.length ? `${track.available_markets.length} countries` : null],
    ["URI", track.uri],
  ].filter(([, value]) => value);
}

function detailCard(data) {
  const { track, album } = data;
  const cover = album.images?.[0]?.url;

  const list = el("dl", {});
  for (const [label, value] of detailRows(data)) {
    list.append(
      el("dt", { textContent: label }),
      el("dd", { textContent: value }),
    );
  }

  // Everything above is curated; this is genuinely everything the API returned.
  const raw = el("details", {}, [
    el("summary", { textContent: "Raw API response" }),
    el("pre", { textContent: JSON.stringify(data, null, 2) }),
  ]);

  return el("div", { className: "card" }, [
    cover ? el("img", { src: cover, alt: `${album.name} cover art` }) : null,
    el("div", { className: "card-body" }, [
      el("a", {
        className: "card-title",
        href: track.external_urls.spotify,
        target: "_blank",
        rel: "noopener",
        textContent: `${track.name} ↗`,
      }),
      list,
      raw,
    ]),
  ]);
}

/**
 * The whole signed-in UI: a play button and a reveal button.
 * Metadata is fetched on the first reveal and reused after that.
 */
function renderCardIndex() {
  viewEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("p", {
        textContent:
          "Scan a card to play its track. This link carries no card code — pick one to try:",
      }),
      el(
        "ul",
        { className: "cardlist" },
        CARDS.map((card) =>
          el("li", {}, [
            el("a", { href: `?c=${card.code}`, textContent: `Card ${card.code}` }),
          ]),
        ),
      ),
      el("p", {}, [
        el("a", { href: "cards.html", textContent: "Printable cards →" }),
      ]),
      el("p", {}, [
        el("a", {
          href: "embed.html",
          textContent: "Embedded player — no sign-in needed →",
        }),
      ]),
    ]),
  );
}

function renderControls(card) {
  const play = el("button", { className: "big", textContent: "▶ Play" });
  const reveal = el("button", { className: "big ghost", textContent: "Reveal song details" });
  const controls = el("button", { className: "big ghost", textContent: "Show controls" });
  const panel = el("div", { hidden: true });
  viewEl.replaceChildren(
    el("h2", { textContent: `Card ${card.code}` }),
    el("div", { className: "actions" }, [play, reveal, controls]),
    panel,
  );

  // The bar stays out of the way until asked for, and the button label
  // follows it however it was closed — this button or its own ✕.
  const bar = mountNowPlaying({
    onVisibilityChange: (visible) => {
      controls.textContent = visible ? "Hide controls" : "Show controls";
    },
  });
  controls.addEventListener("click", () => bar.toggle());

  let started = false;
  play.addEventListener("click", async () => {
    const deviceId = getDeviceId();
    if (!deviceId) return showError("The player is still starting — wait for “Player ready”.");
    try {
      // Once the track is loaded on the device, toggling is instant; starting
      // it again would restart from the beginning.
      if (started) return void togglePlay();
      await playTracks(deviceId, [`spotify:track:${card.id}`]);
      started = true;
    } catch (err) {
      showError(err.message);
    }
  });

  onPlayerState((state) => {
    if (!state) return;
    play.textContent = state.paused ? "▶ Play" : "⏸ Pause";
  });

  let details = null;
  reveal.addEventListener("click", async () => {
    if (details) {
      panel.hidden = !panel.hidden;
      reveal.textContent = panel.hidden ? "Reveal song details" : "Hide song details";
      return;
    }
    reveal.disabled = true;
    reveal.textContent = "Loading…";
    try {
      const track = await getTrack(card.id);
      // The album and artist lookups only enrich the card, so a failure in
      // either should narrow what is shown rather than lose all of it.
      const [albumResult, artistsResult] = await Promise.allSettled([
        getAlbum(track.album.id),
        getArtists(track.artists.map((a) => a.id)),
      ]);
      for (const result of [albumResult, artistsResult]) {
        if (result.status === "rejected") showError(result.reason.message);
      }
      details = {
        track,
        album: albumResult.status === "fulfilled" ? albumResult.value : track.album,
        artists: artistsResult.status === "fulfilled" ? artistsResult.value : [],
      };
      panel.replaceChildren(detailCard(details));
      panel.hidden = false;
      reveal.textContent = "Hide song details";
    } catch (err) {
      reveal.textContent = "Reveal song details";
      showError(err.message);
    } finally {
      reveal.disabled = false;
    }
  });
}

/**
 * The now-playing bar. player_state_changed only fires when something actually
 * changes, so a local ticker advances the progress bar in between.
 */
function mountNowPlaying({ onVisibilityChange = () => {} } = {}) {
  const cover = el("img", { alt: "" });
  const title = el("div", { className: "title", textContent: "Nothing playing yet" });
  const artist = el("div", { className: "artist" });
  const toggle = el("button", { textContent: "▶", title: "Play/pause" });
  const prev = el("button", { className: "ghost", textContent: "⏮", title: "Restart" });
  const next = el("button", { className: "ghost", textContent: "⏭", title: "Next" });
  const fill = el("div", { className: "fill" });
  const track = el("div", { className: "progress" }, [fill]);
  const time = el("div", { className: "time", textContent: "0:00 / 0:00" });
  const close = el("button", {
    className: "close",
    textContent: "✕",
    title: "Hide controls",
    ariaLabel: "Hide controls",
  });

  barEl.replaceChildren(
    cover,
    el("div", { className: "meta" }, [title, artist]),
    el("div", { className: "controls" }, [prev, toggle, next]),
    track,
    time,
    close,
  );
  barEl.hidden = true;

  const setVisible = (visible) => {
    barEl.hidden = !visible;
    onVisibilityChange(visible);
  };
  close.addEventListener("click", () => setVisible(false));

  let position = 0;
  let duration = 0;
  let paused = true;
  let lastTick = Date.now();

  const paint = () => {
    fill.style.width = duration ? `${Math.min(100, (position / duration) * 100)}%` : "0%";
    time.textContent = `${formatTime(position)} / ${formatTime(duration)}`;
  };

  toggle.addEventListener("click", () => togglePlay());
  prev.addEventListener("click", () => previousTrack());
  next.addEventListener("click", () => nextTrack());

  track.addEventListener("click", (event) => {
    if (!duration) return;
    const box = track.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    position = Math.round(Math.min(1, Math.max(0, ratio)) * duration);
    lastTick = Date.now();
    seek(position);
    paint();
  });

  onPlayerState((state) => {
    if (!state) {
      setVisible(false);
      return;
    }
    const current = state.track_window.current_track;
    cover.src = current.album.images.at(-1)?.url ?? "";
    title.textContent = current.name;
    artist.textContent = current.artists.map((a) => a.name).join(", ");
    ({ position, duration, paused } = state);
    toggle.textContent = paused ? "▶" : "⏸";
    lastTick = Date.now();
    paint();
  });

  setInterval(() => {
    if (paused || !duration) return;
    const now = Date.now();
    position = Math.min(duration, position + (now - lastTick));
    lastTick = now;
    paint();
  }, 500);

  return { toggle: () => setVisible(barEl.hidden) };
}

async function renderSignedIn() {
  const profile = await getProfile();

  // Cached so the pages that never call the Web API can still name the account.
  cacheProfile(profile);

  const status = el("span", { className: "status", textContent: "Starting player…" });
  sessionEl.replaceChildren(
    el("div", { className: "identity" }, [status, sessionBadge()]),
  );

  const card = cardByCode(cardCode);
  if (card) renderControls(card);
  else renderCardIndex();

  try {
    await initPlayer({ onError: showError });
    status.textContent = "Player ready";
    status.classList.add("ready");
  } catch (err) {
    status.textContent = "Player unavailable";
    showError(err.message);
  }
}

async function render() {
  try {
    if (!getClientId()) return renderSetup();
    // A grant made before the playback scopes existed has to be redone.
    if (isLoggedIn() && !hasCurrentScopes()) {
      logout();
      renderSignedOut();
      return showError("Playback needs new permissions — please sign in again.");
    }
    if (!isLoggedIn()) return renderSignedOut();
    await renderSignedIn();
  } catch (err) {
    renderSignedOut();
    showError(err.message);
  }
}

(async () => {
  try {
    await handleRedirect();
  } catch (err) {
    await render();
    showError(err.message);
    return;
  }
  await render();
})();
