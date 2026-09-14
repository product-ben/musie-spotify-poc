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
    href: "listen-nudge.html",
    title: "v0.3.2 embed, scrolldown & nudge",
    note: "recommended for testing & beta",
    blurb:
      "As v0.3, with a screen between the controls and the player asking whether you really want to see the track.",
    pros: [
      "Satisfies both sides at once: Spotify's terms, and the therapeutic intent of keeping the cover and title out of sight so listeners are not primed during the exercise",
      "No sign-in and no user cap — anyone can open it",
      "Keeps Spotify's widget unaltered, so it stays within the embed terms",
      "Seeing the track takes a deliberate second step, framed as part of the exercise",
      "Works without Premium",
    ],
    cons: [
      "Listeners without Premium hear 30 seconds, not the whole track",
      "One more screen for anyone who does want the track name",
      "The play button may not be used commercially",
    ],
  },
  {
    href: "listen.html",
    title: "v0.3.1 embed & scrolldown",
    blurb:
      "Play and pause above the fold, Spotify's widget unaltered on the screen below.",
    pros: [
      "No sign-in and no user cap — anyone can open it",
      "Keeps Spotify's widget unaltered, so it stays within the embed terms",
      "The track is out of the first view on any viewport, guaranteed by lvh",
      "The fewest steps between pressing play and reaching the player",
    ],
    cons: [
      "Listeners without Premium hear 30 seconds, not the whole track",
      "Nothing stands between one scroll and the track — hidden, not secret",
      "The play button may not be used commercially",
    ],
  },
  {
    href: "embed.html",
    title: "v0.2 embed & blur",
    blurb: "The same widget behind a blur that lifts when you pause.",
    pros: [
      "No sign-in and no user cap",
      "The track is genuinely hidden until the listener pauses",
    ],
    cons: [
      "Breaches the embed terms, which forbid obscuring the widget by any means",
      "Cannot ship — kept only to show the idea",
      "Still 30 seconds without Premium",
    ],
  },
  {
    href: "player.html",
    title: "v0.1 api integration",
    blurb:
      "Streams through the Web Playback SDK, so the page owns the interface completely.",
    pros: [
      "Total control of the interface — none of Spotify's UI appears",
      "Full-length tracks, with real playback state and a seek bar",
    ],
    cons: [
      "Every listener needs their own Premium subscription",
      "Capped at the accounts on the app's allowlist while in development mode",
      "Playing without showing cover art and metadata breaches the developer policy",
      "Least reliable on mobile Safari",
    ],
  },
];

const TOOLS = [
  {
    href: "cards.html",
    title: "Printable cards",
    blurb:
      "One QR card per track, ready to print and cut. Scanning a card opens v0.3.1.",
  },
];

const DOCS = [
  {
    href: "legal.html",
    title: "Legal & commercial investigation",
    blurb:
      "What Spotify's terms allow, what they forbid, and what each version costs as a result. Read this before building further.",
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
const docsEl = document.getElementById("docs");

const card = (version) =>
  el("a", { className: "version", href: version.href }, [
    el("div", { className: "version-head" }, [
      el("span", { className: "version-title", textContent: version.title }),
      version.note
        ? el("span", { className: "status ready", textContent: version.note })
        : null,
    ]),
    el("p", { textContent: version.blurb }),
    version.pros || version.cons
      ? el("ul", { className: "points" }, [
          ...(version.pros ?? []).map((text) =>
            el("li", { className: "pro", textContent: text }),
          ),
          ...(version.cons ?? []).map((text) =>
            el("li", { className: "con", textContent: text }),
          ),
        ])
      : null,
  ]);

function renderVersions() {
  listEl.replaceChildren(...VERSIONS.map(card));
  toolsEl.replaceChildren(...TOOLS.map(card));
  docsEl.replaceChildren(...DOCS.map(card));
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
