// The index page: what versions exist, and the one place you sign in or out.

import {
  handleRedirect,
  login,
  logout,
  getClientId,
  setClientId,
} from "./auth.js";
import { getProfile } from "./api.js";
import {
  brandLink,
  cacheProfile,
  clearProfile,
  readProfile,
  signedIn,
} from "./chrome.js";

const VERSIONS = [
  {
    href: "listen.html",
    title: "v0.3 embed & scrolldown",
    note: "Recommended",
    blurb:
      "Play and pause above the fold, Spotify's widget unaltered on the screen below. No sign-in required — anyone can open it.",
  },
  {
    href: "embed.html",
    title: "v0.2 embed & blur",
    blurb:
      "The same widget behind a blur that lifts when you pause. An experiment: obscuring the widget is against Spotify's embed terms, so this one cannot ship.",
  },
  {
    href: "player.html",
    title: "v0.1 api integration",
    blurb:
      "Streams through the Web Playback SDK, so the page owns the interface completely. Needs a signed-in Premium account on the app's allowlist.",
  },
];

const TOOLS = [
  {
    href: "cards.html",
    title: "Printable cards",
    blurb:
      "One QR card per track, ready to print and cut. Scanning a card opens v0.3.",
  },
];

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
};

const headerEl = document.getElementById("header");
const authEl = document.getElementById("auth");
const listEl = document.getElementById("versions");
const toolsEl = document.getElementById("tools");

const card = (version) =>
  el("a", { className: "version", href: version.href }, [
    el("div", { className: "version-head" }, [
      el("span", { className: "version-title", textContent: version.title }),
      version.note
        ? el("span", { className: "status ready", textContent: version.note })
        : null,
    ]),
    el("p", { textContent: version.blurb }),
  ]);

function renderVersions() {
  listEl.replaceChildren(...VERSIONS.map(card));
  toolsEl.replaceChildren(...TOOLS.map(card));
}

function showError(message) {
  authEl.prepend(el("div", { className: "notice error", textContent: message }));
}

async function renderAuth() {
  headerEl.replaceChildren(brandLink());

  if (!getClientId()) {
    const input = el("input", { placeholder: "Spotify client ID", required: true });
    const form = el("form", {}, [input, el("button", { textContent: "Save" })]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      setClientId(input.value);
      renderAuth();
    });
    return authEl.replaceChildren(
      el("div", { className: "notice" }, [
        el("p", { textContent: "No Spotify client ID configured yet." }),
        form,
      ]),
    );
  }

  if (!signedIn()) {
    const button = el("button", { textContent: "Sign in with Spotify" });
    button.addEventListener("click", () => login().catch((e) => showError(e.message)));
    return authEl.replaceChildren(
      el("div", { className: "notice" }, [
        el("p", {
          textContent:
            "Signing in here carries across every page — the session is shared. Only the Full player needs it; the embed pages work signed out.",
        }),
        el("div", { className: "tabs" }, [button]),
      ]),
    );
  }

  // Refresh the cached profile so the other pages can name the account
  // without an API call of their own.
  let profile = readProfile();
  try {
    const fresh = await getProfile();
    cacheProfile(fresh);
    profile = readProfile();
  } catch (err) {
    showError(err.message);
  }

  const signOut = el("button", { className: "ghost", textContent: "Sign out" });
  signOut.addEventListener("click", () => {
    clearProfile();
    logout();
    renderAuth();
  });

  authEl.replaceChildren(
    el("div", { className: "notice" }, [
      el("div", { className: "identity" }, [
        profile?.image ? el("img", { src: profile.image, alt: "" }) : null,
        el("span", { textContent: `Signed in as ${profile?.name ?? "you"}` }),
        signOut,
      ]),
      el("p", { textContent: "This session is shared with every page below." }),
    ]),
  );
}

(async () => {
  renderVersions();
  try {
    await handleRedirect();
  } catch (err) {
    await renderAuth();
    return showError(err.message);
  }
  await renderAuth();
})();
