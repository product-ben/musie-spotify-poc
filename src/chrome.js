// Shared page chrome.
//
// Every page on this origin already shares one session: the tokens live in
// localStorage, so signing in once carries across all of them. These helpers
// render that consistently, and keep the brand mark pointing home.

import { isLoggedIn, hasCurrentScopes } from "./auth.js";

const PROFILE_KEY = "musie.profile";

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
};

/**
 * The display name and avatar, cached so that pages which never touch the Web
 * API — the embed ones — can still show who is signed in.
 */
export function cacheProfile(profile) {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: profile.display_name || profile.id,
      image: profile.images?.[0]?.url ?? null,
    }),
  );
}

export function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

export const clearProfile = () => localStorage.removeItem(PROFILE_KEY);

/** A session that is usable: present, and granted the scopes we now ask for. */
export const signedIn = () => isLoggedIn() && hasCurrentScopes();

export function brandLink() {
  return el("a", { className: "brand", href: "index.html", title: "All versions" }, [
    document.createTextNode("musie "),
    el("span", { textContent: "music streaming poc" }),
  ]);
}

/** Read-only session indicator; signing in and out lives on v0.1. */
export function sessionBadge() {
  if (!signedIn()) {
    return el("a", {
      className: "signin",
      href: "player.html",
      textContent: "Not signed in",
    });
  }
  const profile = readProfile();
  return el("a", { className: "identity", href: "player.html" }, [
    profile?.image ? el("img", { src: profile.image, alt: "" }) : null,
    el("span", {
      className: "status ready",
      textContent: profile?.name ? `Signed in · ${profile.name}` : "Signed in",
    }),
  ]);
}

/**
 * Header badge saying whether this browser holds a Spotify Premium session.
 *
 * It cannot be known in advance: the Spotify session belongs to another origin
 * and is unreadable from here. The embed itself decides what to serve, and the
 * length of what comes back is the only available signal — 30 seconds means no
 * Premium session, anything longer means there is one. So the badge resolves
 * when the embed reports a duration, not before.
 */
export function premiumBadge(node) {
  node.textContent = "Premium session unknown";
  node.title = "Resolves once the player reports what it is allowed to play.";

  return (durationMs) => {
    if (!durationMs) return;
    const preview = durationMs <= 31000;
    node.textContent = preview
      ? "Not signed in to Premium"
      : "Signed in to Premium";
    node.title = preview
      ? "The embed served a 30-second preview, so this browser has no Spotify Premium session."
      : `The embed served the full ${Math.round(durationMs / 1000)}s track, so this browser has a Spotify Premium session.`;
    node.classList.toggle("ready", !preview);
  };
}

/** Fill a <header> with the brand mark, the session badge, and anything extra. */
export function mountHeader(header, extra = []) {
  header.replaceChildren(
    brandLink(),
    el("div", { className: "identity" }, [...[].concat(extra), sessionBadge()]),
  );
}
