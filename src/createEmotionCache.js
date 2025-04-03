// src/createEmotionCache.js
import createCache from '@emotion/cache';

// Prepend MUI styles to the head for correct ordering.
export default function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
