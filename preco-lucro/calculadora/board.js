/*
 * board.js: dragging the cards of the calculator around, and remembering where
 * they were left.
 *
 * The rule of what goes where is not here: it lives in board-layout.js, pure
 * and under test. This file is the half that cannot be tested without a
 * browser, and it holds exactly three things: the pointer, the keyboard and
 * localStorage.
 *
 * Dragging is written by hand on Pointer Events rather than taken from a
 * library. One event family covers mouse, pen and touch with the same code,
 * which is the whole reason a library would be brought in, and for four cards
 * the rest of what a library adds would be weight the site has never carried.
 * The native HTML5 drag and drop was not an option either: it is the one input
 * API that ignores touch screens.
 *
 * Only the grip starts a drag, never the card. A card is full of sliders, text
 * fields and buttons, and a drag that starts anywhere would fight every one of
 * them. On a phone it would also fight the page itself, because the gesture
 * that moves a card and the gesture that scrolls are the same gesture until the
 * finger has already moved.
 *
 * The card being dragged leaves the flow (position: fixed) and a placeholder of
 * the same height holds its place. Nothing else on the page moves, so what the
 * person sees is the gap where the card will land.
 */

import { showToast } from './toast.js?v=1';
import { attachViewBar, renderViewBar } from './board-bar.js?v=1';
import {
  BOARD_COLUMN_COUNT,
  defaultLayout,
  findCard,
  moveCard,
  swapCards,
} from './board-layout.js?v=1';
import {
  DEFAULT_VIEW,
  PROFILE_VIEW,
  defaultViews,
  layoutOfView,
  normalizeViews,
  withPinned,
  withProfileLayout,
  withProfileName,
} from './board-views.js?v=1';

const $ = (id) => document.getElementById(id);

/** Where the views are kept: the profile's arrangements, its name and the pin. */
const STORAGE_KEY = 'boardViews';

/** How far the pointer travels before it counts as a drag and not as a click. */
const DRAG_THRESHOLD_PX = 4;

/** How close to the edge of the window the pointer starts scrolling the page. */
const EDGE_ZONE_PX = 90;

/** How fast it scrolls there, per frame. */
const EDGE_SPEED_PX = 14;

/* The widths where the CSS drops a column. They are written here as well
   because the layout has to collapse with the columns, and a media query says
   nothing to JavaScript. Change one, change the other. */
const TWO_COLUMN_QUERY = '(max-width: 1279px)';
const ONE_COLUMN_QUERY = '(max-width: 1023px)';

/** Which way each arrow key moves a card, as [column, position]. */
const KEY_MOVES = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/* The module owns these four, and nothing outside reads them: `views` is both
   views as they were left, `activeView` is the one open, `layout` is what it
   looks like on screen and `columnCount` says how many columns fit. */
let views = defaultViews();
let activeView = DEFAULT_VIEW;
let layout = defaultLayout();
let columnCount = BOARD_COLUMN_COUNT;

/** The drag in progress, or null. Built on pointerdown, dropped on pointerup. */
let drag = null;

/* The media queries, built once in attachBoard and held here. A MediaQueryList
   nobody keeps a reference to can be collected along with its listener, which
   is a silent way to lose the only thing that answers a window being resized. */
let columnQueries = [];

function readViews() {
  try {
    return normalizeViews(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    // Private browsing denies storage and a damaged value fails to parse. Both
    // mean the same thing here: this visit starts from the default view.
    return defaultViews();
  }
}

function saveViews() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Private browsing can deny storage; the arrangement still holds for this visit.
  }
}

function paintViewBar() {
  renderViewBar({
    activeView: activeView,
    pinnedView: views.pinned,
    profileName: views.profileName,
  });
}

/** How many columns the stylesheet is showing at this width. */
function visibleColumnCount() {
  if (window.matchMedia(ONE_COLUMN_QUERY).matches) return 1;
  if (window.matchMedia(TWO_COLUMN_QUERY).matches) return 2;

  return BOARD_COLUMN_COUNT;
}

function boardElement() {
  return $('calcGate');
}

function columnElements() {
  return [...boardElement().querySelectorAll('.board-col')];
}

/** The columns the stylesheet is actually showing, left to right. */
function visibleColumns() {
  const columns = columnElements().filter((column) => column.offsetParent !== null);

  return columns.length > 0 ? columns : columnElements();
}

function cardElement(cardId) {
  return boardElement().querySelector(`.glass-card[data-card="${cardId}"]`);
}

/** Puts every card where the layout says it goes. */
function applyLayout() {
  const columns = columnElements();
  layout.forEach((cardIds, index) => {
    const column = columns[Math.min(index, columns.length - 1)];
    for (const cardId of cardIds) {
      const card = cardElement(cardId);
      if (card) column.appendChild(card);
    }
  });
}

/**
 * Writes the arrangement on screen down as the person's own.
 *
 * A change made while the default view is open moves to the profile instead of
 * being refused or thrown away: the default is the way back and never changes,
 * and the card still ends up where it was dropped.
 */
function saveLayout() {
  const wasDefault = activeView !== PROFILE_VIEW;
  activeView = PROFILE_VIEW;
  views = withProfileLayout(views, columnCount, layout);
  saveViews();
  if (wasDefault) paintViewBar();
}

/** Opens a view: paints its arrangement and lights up its tab. */
function selectView(viewId) {
  activeView = viewId;
  layout = layoutOfView(views, viewId, columnCount);
  applyLayout();
  paintViewBar();
}

/** The visible column the pointer is over, or the nearest one to its side. */
function columnUnder(clientX) {
  const columns = visibleColumns();
  let nearest = columns[0];
  let shortest = Infinity;

  for (const column of columns) {
    const rect = column.getBoundingClientRect();
    const distance = Math.max(rect.left - clientX, clientX - rect.right, 0);
    if (distance < shortest) {
      shortest = distance;
      nearest = column;
    }
  }

  return nearest;
}

/**
 * The card the pointer is over, which is the one that will be swapped with.
 *
 * The whole card counts as the target, not the half it is past: a swap is
 * between two cards, so what matters is which one is under the pointer and not
 * which side of it the pointer is on.
 */
function cardUnderPointer() {
  const cards = visibleColumns().flatMap((column) => [...column.querySelectorAll('.glass-card')]);

  return (
    cards.find((card) => {
      if (card === drag.card) return false;
      const rect = card.getBoundingClientRect();
      return (
        drag.pointerX >= rect.left &&
        drag.pointerX <= rect.right &&
        drag.pointerY >= rect.top &&
        drag.pointerY <= rect.bottom
      );
    }) ?? null
  );
}

/** Lights up the card that would be swapped with, and puts out the last one. */
function updateSwapTarget() {
  const target = cardUnderPointer();
  if (target === drag.target) return;

  drag.target?.classList.remove('is-swap-target');
  target?.classList.add('is-swap-target');
  drag.target = target;
}

/** Scrolls the page while the pointer is held near the top or bottom edge. */
function scrollAtEdge() {
  const fromTop = drag.pointerY;
  const fromBottom = window.innerHeight - drag.pointerY;

  if (fromTop < EDGE_ZONE_PX) window.scrollBy(0, -EDGE_SPEED_PX);
  else if (fromBottom < EDGE_ZONE_PX) window.scrollBy(0, EDGE_SPEED_PX);
}

/* The frame loop is what makes the drag keep working while the pointer is held
   still: the page scrolls at the edge, and the card lit up keeps up with the
   content moving under a finger that never moved. */
function onFrame() {
  if (!drag?.started) return;
  scrollAtEdge();
  updateSwapTarget();
  drag.frame = requestAnimationFrame(onFrame);
}

function beginDrag() {
  const rect = drag.card.getBoundingClientRect();
  /* The hole the card left, held open at its exact size and never moved again.
     Without it the column would close up the moment the card leaves the flow
     and every other card on the board would jump. */
  const placeholder = document.createElement('div');
  placeholder.className = 'board-placeholder';
  placeholder.style.height = `${rect.height}px`;
  drag.card.after(placeholder);

  // Locked to the size it had: out of the flow the card would otherwise snap to
  // the width of the window.
  drag.card.style.width = `${rect.width}px`;
  drag.card.style.height = `${rect.height}px`;
  drag.card.style.left = `${rect.left}px`;
  drag.card.style.top = `${rect.top}px`;
  drag.card.classList.add('is-dragging');
  document.body.classList.add('board-dragging');

  drag.placeholder = placeholder;
  drag.started = true;
  drag.frame = requestAnimationFrame(onFrame);
}

/**
 * What the drop means, as a new layout.
 *
 * Dropped on a card, the two change places. Dropped on the empty part of
 * another column, where there is nobody to change places with, the card joins
 * the end of that column. Dropped on the empty part of its own column it stays
 * put: there the person let go of a card already at home, and moving it to the
 * bottom would be an answer to something they never asked.
 */
function layoutAfterDrop() {
  const cardId = drag.card.dataset.card;
  if (drag.target) return swapCards(layout, cardId, drag.target.dataset.card);

  const column = Number(columnUnder(drag.pointerX).dataset.column);
  if (column === findCard(layout, cardId)?.column) return layout;

  return moveCard(layout, cardId, column, Infinity);
}

function endDrag() {
  cancelAnimationFrame(drag.frame);
  drag.placeholder.remove();
  for (const property of ['width', 'height', 'left', 'top', 'transform']) {
    drag.card.style.removeProperty(property);
  }
  drag.card.classList.remove('is-dragging');
  drag.target?.classList.remove('is-swap-target');
  document.body.classList.remove('board-dragging');

  layout = layoutAfterDrop();
  applyLayout();
  saveLayout();
}

function onPointerDown(event) {
  const grip = event.target.closest('.card-grip');
  if (!grip || event.button > 0) return;

  const card = grip.closest('.glass-card');
  if (!card) return;

  // Keeps the browser from taking the gesture as a text selection or a scroll.
  event.preventDefault();
  grip.setPointerCapture(event.pointerId);
  drag = {
    card: card,
    grip: grip,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    pointerX: event.clientX,
    pointerY: event.clientY,
    started: false,
    placeholder: null,
    target: null,
    frame: 0,
  };
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;

  drag.pointerX = event.clientX;
  drag.pointerY = event.clientY;

  if (!drag.started) {
    const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (travelled < DRAG_THRESHOLD_PX) return;
    beginDrag();
  }

  drag.card.style.transform = `translate(${event.clientX - drag.startX}px, ${
    event.clientY - drag.startY
  }px)`;
  updateSwapTarget();
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;

  if (drag.started) endDrag();
  drag = null;
}

function onKeyDown(event) {
  const grip = event.target.closest?.('.card-grip');
  const move = KEY_MOVES[event.key];
  if (!grip || !move) return;

  const cardId = grip.closest('.glass-card').dataset.card;
  const at = findCard(layout, cardId);
  if (!at) return;

  const [columnStep, positionStep] = move;
  const column = at.column + columnStep;
  const index = at.index + positionStep;
  if (column < 0 || column >= columnCount || index < 0) return;

  // The same thing the pointer does: change places with whoever is there, and
  // where nobody is, join the end of that column.
  const neighbour = layout[column]?.[index];
  if (!neighbour && columnStep === 0) return;

  event.preventDefault();
  layout = neighbour
    ? swapCards(layout, cardId, neighbour)
    : moveCard(layout, cardId, column, Infinity);
  applyLayout();
  saveLayout();
  // Moving the card in the page takes the grip out and puts it back, which
  // drops the focus: without this the next arrow key would go nowhere.
  grip.focus();
}

function onWidthChange() {
  const count = visibleColumnCount();
  if (count === columnCount) return;

  columnCount = count;
  layout = layoutOfView(views, activeView, count);
  applyLayout();
}

function pinView(viewId) {
  views = withPinned(views, viewId);
  saveViews();
  paintViewBar();
  showToast(
    viewId === DEFAULT_VIEW
      ? 'O painel vai abrir no Padrão'
      : `O painel vai abrir em ${views.profileName}`,
  );
}

function renameProfile(name) {
  views = withProfileName(views, name);
  saveViews();
  paintViewBar();
}

/** Opens the pinned view of the last visit and binds the ways to change it. */
export function attachBoard() {
  views = readViews();
  columnCount = visibleColumnCount();
  attachViewBar({ onSelect: selectView, onPin: pinView, onRename: renameProfile });
  // The pin is what decides which view greets the person, not the tab that
  // happened to be open when they closed the page.
  selectView(views.pinned);

  const board = boardElement();
  board.addEventListener('pointerdown', onPointerDown);
  board.addEventListener('keydown', onKeyDown);
  // On the document, not on the grip: a drag that ends with the pointer off the
  // window still has to put the card down.
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  /* Both signals, on purpose. The resize event is the one that always arrives,
     and a card left in a column the stylesheet has hidden is a card nobody can
     reach: proven here on 09/11/2026, narrowing the window past the one column
     mark with only the media query listening left three cards off screen. The
     queries stay because they also answer a zoom, which resizes nothing. */
  columnQueries = [TWO_COLUMN_QUERY, ONE_COLUMN_QUERY].map((query) => window.matchMedia(query));
  for (const query of columnQueries) {
    query.addEventListener('change', onWidthChange);
  }
  window.addEventListener('resize', onWidthChange);
}
