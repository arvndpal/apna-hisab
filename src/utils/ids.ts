// Polyfill for crypto.getRandomValues is installed once at app entry (index.js);
// Node (and Jest) already provides it natively, so it isn't imported here.
import { v4 as uuidv4 } from 'uuid';

/** UUID v4, generated on device — rows created offline never collide. */
export function newId(): string {
  return uuidv4();
}
