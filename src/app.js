// View layer: renders the signed-out, setup and signed-in states.

import { REDIRECT_URI } from "./config.js";
import {
  getClientId,
  setClientId,
  login,
  logout,
  handleRedirect,
  isLoggedIn,
} from "./auth.js";
import { getProfile, getTopTracks, searchTracks } from "./api.js";

const sessionEl = document.getElementById("session");
const viewEl = document.getElementById("view");

const audio = new Audio();
let playingId = null;

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
};

function showError(message) {
  viewEl.prepend(
    el("div", { className: "notice error", textContent: message }),
  );
}

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
  const button = el("button", { textContent: "Sign in with Spotify" });
  button.addEventListener("click", () => login().catch((e) => showError(e.message)));

  const reset = el("button", { className: "ghost", textContent: "Use a different client ID" });
  reset.addEventListener("click", () => {
    localStorage.removeItem("musie.client_id");
    render();
  });

  viewEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("p", { textContent: "Sign in to browse your top tracks and search the catalogue." }),
      el("div", { className: "tabs" }, [button, reset]),
    ]),
  );
}

function trackItem(track) {
  const cover = track.album?.images?.at(-1)?.url;
  const row = el("li", { className: "track" }, [
    cover ? el("img", { src: cover, alt: "", loading: "lazy" }) : null,
    el("div", { className: "meta" }, [
      el("div", { className: "title", textContent: track.name }),
      el("div", {
        className: "artist",
        textContent: track.artists.map((a) => a.name).join(", "),
      }),
    ]),
  ]);

  // preview_url is null for a lot of the catalogue, so fall back to a deep link.
  if (track.preview_url) {
    const button = el("button", {
      className: "ghost",
      textContent: playingId === track.id ? "Stop" : "Preview",
    });
    button.addEventListener("click", () => {
      if (playingId === track.id) {
        audio.pause();
        playingId = null;
      } else {
        audio.src = track.preview_url;
        audio.play();
        playingId = track.id;
      }
      button.textContent = playingId === track.id ? "Stop" : "Preview";
    });
    row.append(button);
  }

  row.append(
    el("a", {
      href: track.external_urls.spotify,
      target: "_blank",
      rel: "noopener",
      textContent: "Open ↗",
    }),
  );
  return row;
}

function renderTracks(heading, tracks) {
  const list = tracks.length
    ? el("ol", {}, tracks.map(trackItem))
    : el("p", { textContent: "Nothing to show." });
  viewEl.querySelector("#results")?.replaceChildren(
    el("h2", { textContent: heading }),
    list,
  );
}

async function renderSignedIn() {
  const profile = await getProfile();

  const signOut = el("button", { className: "ghost", textContent: "Sign out" });
  signOut.addEventListener("click", () => {
    audio.pause();
    logout();
    render();
  });
  sessionEl.replaceChildren(
    el("div", { className: "identity" }, [
      profile.images?.[0]?.url
        ? el("img", { src: profile.images[0].url, alt: "" })
        : null,
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
}

async function render() {
  try {
    if (!getClientId()) return renderSetup();
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
