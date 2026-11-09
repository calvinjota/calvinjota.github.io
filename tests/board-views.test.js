/*
 * Tests the two views of the board and the pin that says which one opens.
 *
 * What matters most here is that the default view can never be written into: it
 * is the one way back from an arrangement that went wrong, and a build that
 * quietly let a drag land in it would take that away without anyone noticing,
 * because on screen the card would move either way.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE_NAME,
  DEFAULT_VIEW,
  PROFILE_NAME_MAX,
  PROFILE_VIEW,
  defaultViews,
  layoutOfView,
  normalizeViews,
  withPinned,
  withProfileLayout,
  withProfileName,
} from '../preco-lucro/calculadora/board-views.js';
import { defaultLayout } from '../preco-lucro/calculadora/board-layout.js';

/** An arrangement that is nothing like the default, to tell the two apart. */
const REARRANGED = [['saved'], ['sale'], ['price', 'breakdown']];

describe('what a browser starts from', () => {
  it('opens on the default view, with the profile unnamed and empty', () => {
    const views = defaultViews();

    expect(views.pinned).toBe(DEFAULT_VIEW);
    expect(views.profileName).toBe(DEFAULT_PROFILE_NAME);
    expect(layoutOfView(views, PROFILE_VIEW, 3)).toEqual(defaultLayout());
  });
});

describe('the default view is read only', () => {
  it('shows the default arrangement even after the profile was rearranged', () => {
    const views = withProfileLayout(defaultViews(), 3, REARRANGED);

    expect(layoutOfView(views, DEFAULT_VIEW, 3)).toEqual(defaultLayout());
    expect(layoutOfView(views, PROFILE_VIEW, 3)).toEqual(REARRANGED);
  });

  it('gives the default arrangement for a view id that does not exist', () => {
    expect(layoutOfView(defaultViews(), 'whatever', 3)).toEqual(defaultLayout());
  });
});

describe('the profile keeps one arrangement per column count', () => {
  it('writes each count down without touching the others', () => {
    const wide = withProfileLayout(defaultViews(), 3, REARRANGED);
    const both = withProfileLayout(wide, 1, [['saved', 'sale', 'price', 'breakdown']]);

    expect(layoutOfView(both, PROFILE_VIEW, 3)).toEqual(REARRANGED);
    expect(layoutOfView(both, PROFILE_VIEW, 1)).toEqual([['saved', 'sale', 'price', 'breakdown']]);
  });

  it('leaves the views it received untouched', () => {
    const views = defaultViews();
    withProfileLayout(views, 3, REARRANGED);

    expect(views.layouts).toEqual({});
  });
});

describe('naming the profile', () => {
  it('takes the name as it was typed, without the spaces around it', () => {
    expect(withProfileName(defaultViews(), '  Loja do Centro ').profileName).toBe('Loja do Centro');
  });

  it('falls back to the default name when nothing was typed', () => {
    for (const empty of ['', '   ', null, undefined]) {
      expect(withProfileName(defaultViews(), empty).profileName).toBe(DEFAULT_PROFILE_NAME);
    }
  });

  it('cuts a name that is longer than the box allows', () => {
    const name = withProfileName(defaultViews(), 'x'.repeat(PROFILE_NAME_MAX + 20)).profileName;

    expect(name).toHaveLength(PROFILE_NAME_MAX);
  });
});

describe('the pin that says which view opens', () => {
  it('moves to the view it is given', () => {
    expect(withPinned(defaultViews(), PROFILE_VIEW).pinned).toBe(PROFILE_VIEW);
  });

  it('refuses a view that does not exist and stays on the default', () => {
    expect(withPinned(defaultViews(), 'whatever').pinned).toBe(DEFAULT_VIEW);
  });

  it('does not touch the arrangement it was pinned over', () => {
    const views = withPinned(withProfileLayout(defaultViews(), 3, REARRANGED), PROFILE_VIEW);

    expect(layoutOfView(views, PROFILE_VIEW, 3)).toEqual(REARRANGED);
  });
});

describe('repairing what came out of storage', () => {
  it('falls back to the default for anything that is not a set of views', () => {
    for (const broken of [null, undefined, 'views', 7, []]) {
      expect(normalizeViews(broken)).toEqual(defaultViews());
    }
  });

  it('refuses a pin pointing at a view the site no longer has', () => {
    expect(normalizeViews({ pinned: 'dashboard' }).pinned).toBe(DEFAULT_VIEW);
  });

  it('keeps the arrangements it recognizes and drops the rest', () => {
    const views = normalizeViews({ layouts: { 3: REARRANGED, 9: REARRANGED, junk: 'x' } });

    expect(Object.keys(views.layouts)).toEqual(['3']);
    expect(layoutOfView(views, PROFILE_VIEW, 3)).toEqual(REARRANGED);
  });

  it('survives a name that is not text', () => {
    expect(normalizeViews({ profileName: { nope: true } }).profileName).toBe(DEFAULT_PROFILE_NAME);
  });
});
