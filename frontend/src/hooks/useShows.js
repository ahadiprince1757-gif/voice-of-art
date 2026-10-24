import { useState, useEffect } from "react";
import api from "../api";

// Image map: match show titles to their public image files.
// Add entries here as new shows are created in the admin panel.
const SHOW_IMAGE_MAP = {
  "The Last Letter": "/hero-stage.jpg",
  "Behind the Mask": "/theatre-mask.jpg",
  "New Voices": "/theatre-curtains.jpg",
  "School Tour: Set Book Drama": "/theatre-cast.jpg",
  "Curtain Call Ensemble": "/theatre-cast.jpg",
};

const FALLBACK_IMAGES = [
  "/hero-stage.jpg",
  "/theatre-mask.jpg",
  "/theatre-curtains.jpg",
  "/theatre-cast.jpg",
];

/**
 * Returns the best image path for a given show title.
 * Falls back to a deterministic image picked from the pool if no explicit
 * mapping exists, so newly created shows always have a visual.
 */
export function getShowImage(title = "", index = 0) {
  if (SHOW_IMAGE_MAP[title]) return SHOW_IMAGE_MAP[title];
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

/**
 * Shared hook — fetches /api/shows once and caches the result.
 * All components that call useShows() share the same in-memory promise,
 * so only one network request is ever made per page load.
 *
 * Returns: { shows, loading, error }
 */
let _cachedShows = null;
let _inFlight = null;

export function useShows() {
  const [shows, setShows] = useState(_cachedShows || []);
  const [loading, setLoading] = useState(!_cachedShows);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cachedShows) {
      setShows(_cachedShows);
      setLoading(false);
      return;
    }

    if (!_inFlight) {
      _inFlight = api.getShows();
    }

    let active = true;
    setLoading(true);

    _inFlight
      .then((data) => {
        if (!active) return;
        const result = Array.isArray(data) ? data : [];
        _cachedShows = result;
        setShows(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load shows");
        setLoading(false);
        _inFlight = null; // allow retry
      });

    return () => {
      active = false;
    };
  }, []);

  return { shows, loading, error };
}
