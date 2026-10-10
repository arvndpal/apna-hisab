/** Diary cards: optional user-picked background colour (hex, e.g. "#FDE68A"). Null = default card surface. */
const STATEMENTS = [`ALTER TABLE notes ADD COLUMN color TEXT`];

export const migration004NoteColor = {
  version: 4,
  statements: STATEMENTS,
};
