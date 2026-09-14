// The card catalogue.
//
// To add a card: in Spotify, right-click a track → Share → Copy Song Link, and
// paste it into the list below. Codes are assigned by position, so *append*
// new links rather than reordering them — reordering would change the codes on
// cards you have already printed.

const TRACK_LINKS = [
  "https://open.spotify.com/intl-de/track/0riRZrZ047t64W8esri5a5?si=bb2f536d538143fb",
];

/** Pull the track id out of any form of Spotify link, or pass an id through. */
const idFromLink = (link) => link.match(/track[/:]([A-Za-z0-9]+)/)?.[1] ?? link;

export const CARDS = TRACK_LINKS.map((link, index) => ({
  code: String(index + 1).padStart(3, "0"),
  id: idFromLink(link),
}));

export const cardByCode = (code) => CARDS.find((card) => card.code === code);
