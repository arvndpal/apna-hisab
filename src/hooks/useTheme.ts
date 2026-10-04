import { palette } from '../theme/tokens';

/** Dark mode is architected in tokens.ts but ships after V1 — light only for now. */
export function useTheme() {
  return palette.light;
}
