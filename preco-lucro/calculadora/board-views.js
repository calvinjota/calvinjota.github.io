/*
 * board-views.js: the two views of the board, "Padrão" and the person's own
 * profile, and which of them opens on its own.
 *
 * Pure like board-layout.js, which it sits on top of: that file knows where a
 * card goes inside one arrangement, this one knows which arrangement is being
 * looked at. Nothing here touches an element or storage.
 *
 * The default view is not an arrangement that happens to match the default: it
 * is read only on purpose, so that there is always one place to come back to.
 * Nothing ever writes into it, which is why a layout is kept for the profile
 * alone. Dragging a card while the default is open is not an error and does not
 * throw the move away: board.js moves to the profile first and saves there, so
 * the person keeps the card where they dropped it and the way back stays whole.
 *
 * The pin is the view that opens by itself. It is not the same as the view
 * being looked at: switching tabs to compare the two arrangements would be a
 * strange way of saying which one should greet you next time.
 */

import {
  BOARD_COLUMN_COUNT,
  defaultLayout,
  layoutFromStore,
  storeWithLayout,
} from './board-layout.js?v=1';

/** The view that is always the way back, and cannot be written into. */
export const DEFAULT_VIEW = 'default';

/** The view the person arranges and names. */
export const PROFILE_VIEW = 'profile';

export const VIEW_IDS = [DEFAULT_VIEW, PROFILE_VIEW];

/** What the profile is called until it is renamed. */
export const DEFAULT_PROFILE_NAME = 'Perfil 1';

/** How long a name of its own can be. The box in the dialog says the same. */
export const PROFILE_NAME_MAX = 24;

/** Every column count a layout can be kept for: 1, 2 and 3. */
const COLUMN_COUNTS = Array.from({ length: BOARD_COLUMN_COUNT }, (_, index) => index + 1);

/** What a browser that has never been here starts from. */
export function defaultViews() {
  return { profileName: DEFAULT_PROFILE_NAME, pinned: DEFAULT_VIEW, layouts: {} };
}

/**
 * A name that is safe to show: text, trimmed, cut to size and never empty.
 *
 * Only a string counts. Anything else out of storage would come back from
 * String() as something like "[object Object]", which is not a repair: it is a
 * damaged value made to look like a name the person chose.
 */
function cleanName(value) {
  if (typeof value !== 'string') return DEFAULT_PROFILE_NAME;

  const name = value.trim().slice(0, PROFILE_NAME_MAX);

  return name === '' ? DEFAULT_PROFILE_NAME : name;
}

/** The arrangements worth keeping, one per column count, anything else dropped. */
function cleanLayouts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const layouts = {};
  for (const count of COLUMN_COUNTS) {
    if (Array.isArray(value[count])) layouts[count] = value[count];
  }

  return layouts;
}

/**
 * What came out of storage, repaired into something that can be shown.
 *
 * Like the layout itself, this is text the person can edit and a newer build of
 * the site can outgrow, so nothing in it is taken on trust.
 *
 * @param {unknown} value
 * @returns {{profileName: string, pinned: string, layouts: Object}}
 */
export function normalizeViews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultViews();

  return {
    profileName: cleanName(value.profileName),
    pinned: VIEW_IDS.includes(value.pinned) ? value.pinned : DEFAULT_VIEW,
    layouts: cleanLayouts(value.layouts),
  };
}

/**
 * The arrangement to paint for one view.
 *
 * @param {Object} views
 * @param {string} viewId
 * @param {number} columnCount
 * @returns {Array<Array<string>>}
 */
export function layoutOfView(views, viewId, columnCount) {
  if (viewId !== PROFILE_VIEW) return defaultLayout(columnCount);

  return layoutFromStore(views.layouts, columnCount);
}

/**
 * The views with this arrangement written into the profile.
 *
 * @returns {Object} A new object, the one received is untouched
 */
export function withProfileLayout(views, columnCount, layout) {
  return { ...views, layouts: storeWithLayout(views.layouts, columnCount, layout) };
}

/**
 * The views with the profile under another name.
 *
 * @returns {Object} A new object, the one received is untouched
 */
export function withProfileName(views, name) {
  return { ...views, profileName: cleanName(name) };
}

/**
 * The views with another one pinned, which is the one that opens by itself.
 *
 * @returns {Object} A new object, the one received is untouched
 */
export function withPinned(views, viewId) {
  return { ...views, pinned: VIEW_IDS.includes(viewId) ? viewId : DEFAULT_VIEW };
}
