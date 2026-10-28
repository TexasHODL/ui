/**
 * Desktop/tablet action row geometry, shared by MainActionButtons and the desktop
 * pre-action slots so a pre-action sits exactly where (and as big as) the action it
 * turns into. A fixed minimum height keeps one-line (CHECK) and two-line
 * (CALL + amount) rows the same height, so the row never jumps between turns. Important (!) beats Table.css's
 * `.poker-action-dock button[data-action] { min-height: 44px }`.
 */
export const DESKTOP_ACTION_HEIGHT = "!min-h-[3.25rem] lg:!min-h-[3.875rem]";
/** Size class for every desktop action button. */
export const DESKTOP_ACTION_SIZE = `px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm ${DESKTOP_ACTION_HEIGHT}`;
/** Four equal columns, same gap as the action row: FOLD, CHECK, CALL, RAISE. */
export const DESKTOP_SLOT_ROW = "grid grid-cols-4 gap-1 lg:gap-2";
