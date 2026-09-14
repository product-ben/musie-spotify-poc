// Web Playback SDK: registers this browser tab as a Spotify Connect device.
//
// The SDK does not decide what to play — it only receives audio. Choosing a
// track is a Web API call against the device_id that `ready` hands us.
// Requires Spotify Premium.

import { getAccessToken } from "./auth.js";

let player = null;
let deviceId = null;
const stateListeners = new Set();

/** The SDK calls this global once spotify-player.js has finished loading. */
const sdkLoaded = new Promise((resolve) => {
  if (window.Spotify) resolve();
  else window.onSpotifyWebPlaybackSDKReady = resolve;
});

export const getDeviceId = () => deviceId;

/** Subscribe to playback state; returns an unsubscribe function. */
export function onPlayerState(listener) {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

const ERRORS = {
  initialization_error: "This browser can't run the Spotify player.",
  authentication_error: "Spotify rejected the session — sign out and in again.",
  account_error: "Full playback requires a Spotify Premium account.",
  playback_error: "Spotify couldn't play that track.",
};

/**
 * Create and connect the player. Resolves with the device_id, which is only
 * valid once the `ready` event has fired — nothing can play before that.
 */
export async function initPlayer({ onError = () => {} } = {}) {
  if (deviceId) return deviceId;
  await sdkLoaded;

  player = new window.Spotify.Player({
    name: "musie (browser)",
    volume: 0.6,
    // A callback, not a value: the SDK calls it again whenever the token goes
    // stale, so it has to ask auth.js each time rather than close over a
    // string that expires in an hour.
    getOAuthToken: (callback) => {
      getAccessToken()
        .then((token) => token && callback(token))
        .catch((err) => onError(err.message));
    },
  });

  for (const [event, message] of Object.entries(ERRORS)) {
    player.addListener(event, (detail) =>
      onError(detail?.message ? `${message} (${detail.message})` : message),
    );
  }

  player.addListener("player_state_changed", (state) => {
    for (const listener of stateListeners) listener(state);
  });

  player.addListener("not_ready", () => {
    deviceId = null;
    for (const listener of stateListeners) listener(null);
  });

  const ready = new Promise((resolve) => {
    player.addListener("ready", ({ device_id }) => {
      deviceId = device_id;
      resolve(device_id);
    });
  });

  if (!(await player.connect())) {
    throw new Error("The Spotify player failed to connect.");
  }
  return ready;
}

// Local controls. These act on the SDK directly, which responds immediately,
// rather than making a Web API round trip.
export const togglePlay = () => player?.togglePlay();
export const nextTrack = () => player?.nextTrack();
export const previousTrack = () => player?.previousTrack();
export const seek = (ms) => player?.seek(ms);
export const getState = () => player?.getCurrentState();

export function disconnect() {
  player?.disconnect();
  player = null;
  deviceId = null;
}
