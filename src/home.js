// The index page: what versions exist, and the one place you sign in or out.

import { handleRedirect } from "./auth.js";
import { brandLink } from "./chrome.js";

const VERSIONS = [
  {
    href: "listen-designsystem.html",
    title: "v0.4.1 self-hosted, design system",
    note: "recommended for testing & beta",
    blurb:
      "v0.4 rebuilt on the Musy design system — its tokens, its components, its themes. Nothing about the flow changed; only what it is made of.",
    pros: [
      "Built from released components rather than one-off CSS: Track Button, Music Player, CTA Button, Badge, Message, Logo",
      "Every colour, space, radius and motion value resolves to a Layer 1 token — the page adds no design values of its own",
      "Light and dark come from the system's own manual theme switch, and reduced-motion and high-contrast are honoured at token level",
      "A real scrubber with arrow keys, Home/End and a 44px grab area, which the hand-rolled versions never had",
    ],
    cons: [
      "Still the placeholder drone, not licensed music",
      "The stacked arrow-above-label button does not exist in the system yet, so the scroll cues use the inline-icon ghost button",
    ],
  },
  {
    href: "listen-selfhosted.html",
    title: "v0.4 self-hosted player",
    blurb:
      "The same three screens as v0.3.2, but the audio is served from this site instead of Spotify. Feed.fm's API looks promising and may be integrated later if user testing shows that emotionally familiar music — tracks people already know — is what the exercise needs.",
    pros: [
      "Full-length playback everywhere, mobile browsers included — the one thing every streaming embed fails at",
      "No accounts, no user cap, no allowlist, no third party who can withdraw access",
      "No metadata duty and no commercial restriction: the track can be hidden, and the product can be sold",
      "Nothing to satisfy but your own licence",
    ],
    cons: [
      "You have to license the audio yourself",
      "Currently a placeholder drone, not real music",
      "No catalogue of songs people already recognise, which may turn out to matter",
    ],
  },
  {
    href: "listen-nudge.html",
    title: "v0.3.2 embed, scrolldown & nudge",
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
      "Only serves 30 seconds on mobile browsers — where the cards are actually scanned",
      "Listeners without Premium hear 30 seconds on desktop too",
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
      "One QR card per track, ready to print and cut. Scanning a card opens v0.3.2.",
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
  authEl.replaceChildren(el("div", { className: "notice error", textContent: message }));
}

(async () => {
  headerEl.replaceChildren(brandLink());
  renderVersions();

  // Spotify sends the OAuth redirect back to the directory root, which is this
  // page, wherever the sign-in was started. Hand the visitor back to v0.1,
  // which is the only version that needs an account at all.
  try {
    if (await handleRedirect()) {
      window.location.replace("player.html");
    }
  } catch (err) {
    showError(err.message);
  }
})();
