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
    document.createTextNode("musie"),
    el("span", { textContent: "." }),
  ]);
}

/** Read-only session indicator; signing in and out lives on the index page. */
export function sessionBadge() {
  if (!signedIn()) {
    return el("a", {
      className: "signin",
      href: "index.html",
      textContent: "Not signed in",
    });
  }
  const profile = readProfile();
  return el("a", { className: "identity", href: "index.html" }, [
    profile?.image ? el("img", { src: profile.image, alt: "" }) : null,
    el("span", {
      className: "status ready",
      textContent: profile?.name ? `Signed in · ${profile.name}` : "Signed in",
    }),
  ]);
}

/** Fill a <header> with the brand mark, the session badge, and anything extra. */
export function mountHeader(header, extra = []) {
  header.replaceChildren(
    brandLink(),
    el("div", { className: "identity" }, [...[].concat(extra), sessionBadge()]),
  );
}
