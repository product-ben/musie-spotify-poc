// View layer: renders the signed-out, setup and signed-in states, plus the
// now-playing bar driven by the Web Playback SDK.

import { REDIRECT_URI } from "./config.js";
import {
  getClientId,
  setClientId,
  login,
  logout,
  handleRedirect,
  isLoggedIn,
  hasCurrentScopes,
} from "./auth.js";
import { getProfile, getTopTracks, searchTracks, playTracks } from "./api.js";
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

  const button = el("button", { textContent: "Sign in with Spotify" });
  button.addEventListener("click", () => login().catch((e) => showError(e.message)));

  const reset = el("button", {
    className: "ghost",
    textContent: "Use a different client ID",
  });
  reset.addEventListener("click", () => {
    localStorage.removeItem("musie.client_id");
    render();
  });

  viewEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("p", {
        textContent:
          "Sign in to browse your top tracks and play them here. Playback needs Spotify Premium.",
      }),
      el("div", { className: "tabs" }, [button, reset]),
    ]),
  );
}

function trackItem(track) {
  const cover = track.album?.images?.at(-1)?.url;
  const play = el("button", { className: "ghost", textContent: "Play" });
  play.addEventListener("click", async () => {
    const deviceId = getDeviceId();
    if (!deviceId) return showError("The player is still starting — try again shortly.");
    try {
      await playTracks(deviceId, [track.uri]);
    } catch (err) {
      showError(err.message);
    }
  });

  return el("li", { className: "track" }, [
    cover ? el("img", { src: cover, alt: "", loading: "lazy" }) : null,
    el("div", { className: "meta" }, [
      el("div", { className: "title", textContent: track.name }),
      el("div", {
        className: "artist",
        textContent: track.artists.map((a) => a.name).join(", "),
      }),
    ]),
    play,
    el("a", {
      href: track.external_urls.spotify,
      target: "_blank",
      rel: "noopener",
      textContent: "Open ↗",
    }),
  ]);
}

function renderTracks(heading, tracks) {
  const list = tracks.length
    ? el("ol", {}, tracks.map(trackItem))
    : el("p", { textContent: "Nothing to show." });
  viewEl
    .querySelector("#results")
    ?.replaceChildren(el("h2", { textContent: heading }), list);
}

/**
 * Build the now-playing bar. player_state_changed only fires when something
 * actually changes, so a local ticker advances the progress bar in between.
 */
function mountNowPlaying() {
  const cover = el("img", { alt: "" });
  const title = el("div", { className: "title" });
  const artist = el("div", { className: "artist" });
  const toggle = el("button", { textContent: "▶", title: "Play/pause" });
  const prev = el("button", { className: "ghost", textContent: "⏮", title: "Previous" });
  const next = el("button", { className: "ghost", textContent: "⏭", title: "Next" });
  const fill = el("div", { className: "fill" });
  const track = el("div", { className: "progress" }, [fill]);
  const time = el("div", { className: "time", textContent: "0:00 / 0:00" });

  barEl.replaceChildren(
    cover,
    el("div", { className: "meta" }, [title, artist]),
    el("div", { className: "controls" }, [prev, toggle, next]),
    track,
    time,
  );
  barEl.hidden = true;

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
      barEl.hidden = true;
      return;
    }
    const current = state.track_window.current_track;
    cover.src = current.album.images.at(-1)?.url ?? "";
    title.textContent = current.name;
    artist.textContent = current.artists.map((a) => a.name).join(", ");
    ({ position, duration, paused } = state);
    toggle.textContent = paused ? "▶" : "⏸";
    lastTick = Date.now();
    barEl.hidden = false;
    paint();
  });

  setInterval(() => {
    if (paused || !duration) return;
    const now = Date.now();
    position = Math.min(duration, position + (now - lastTick));
    lastTick = now;
    paint();
  }, 500);
}

async function renderSignedIn() {
  const profile = await getProfile();

  const status = el("span", { className: "status", textContent: "Starting player…" });
  const signOut = el("button", { className: "ghost", textContent: "Sign out" });
  signOut.addEventListener("click", () => {
    disconnect();
    logout();
    render();
  });
  sessionEl.replaceChildren(
    el("div", { className: "identity" }, [
      status,
      profile.images?.[0]?.url ? el("img", { src: profile.images[0].url, alt: "" }) : null,
      el("span", { textContent: profile.display_name || profile.id }),
      signOut,
    ]),
  );

  const input = el("input", { placeholder: "Search tracks…", required: true });
  const form = el("form", {}, [input, el("button", { textContent: "Search" })]);
  const results = el("div", { id: "results" });
  viewEl.replaceChildren(form, results);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      renderTracks(`Results for “${input.value}”`, await searchTracks(input.value));
    } catch (err) {
      showError(err.message);
    }
  });

  renderTracks("Your top tracks", await getTopTracks());

  mountNowPlaying();
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
