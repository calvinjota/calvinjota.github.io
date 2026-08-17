/*
 * Tests that every element the site's code reaches for actually exists.
 *
 * The calculation tests cannot catch any of this: they never open index.html,
 * so an id that got renamed on one side only still keeps all 28 of them green.
 * The failure shows up in the browser, as a button that does nothing or a page
 * that dies on load because $('someId') came back null.
 *
 * This is the site's counterpart to the app's tests/handlers.test.js, written
 * before step 9 splits app.js into modules: moving a function to another file
 * is exactly the change that leaves a lookup pointing at nothing. The checks
 * read every module in the calculator folder rather than a fixed list, so a
 * file created by that split is covered the moment it exists.
 *
 * Two things differ from the app's version, on purpose:
 * - the site reaches elements through the local `$` helper, never through a
 *   literal getElementById call, so the id check has to know both spellings;
 * - the site has no data-action delegation, so what stands in for it here are
 *   the attribute selectors ([data-step-key], [data-legal]) and the ids built
 *   at runtime from PCT_KEYS.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CALCULATOR_DIR = 'preco-lucro/calculadora';

function projectPath(relativePath) {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

function readProjectFile(relativePath) {
  return readFileSync(projectPath(relativePath), 'utf8');
}

/** Every module of the calculator, concatenated: together they are its code. */
function readCalculatorScripts() {
  return scriptFileNames()
    .map((file) => readProjectFile(`${CALCULATOR_DIR}/${file}`))
    .join('\n');
}

function scriptFileNames() {
  return readdirSync(projectPath(CALCULATOR_DIR)).filter((file) => file.endsWith('.js'));
}

const html = readProjectFile(`${CALCULATOR_DIR}/index.html`);
const appJs = readCalculatorScripts();

function sorted(values) {
  return [...new Set(values)].sort();
}

/** Ids declared on elements in the HTML. */
function declaredIds() {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id));
}

/**
 * Ids the code looks up, through the local `$` helper or getElementById itself.
 * Every module defines its own one-line `$`, so both spellings have to count:
 * today the site uses only the helper, and a future module may not.
 */
function idsLookedUp() {
  const throughHelper = [...appJs.matchAll(/\$\(\s*'([\w-]+)'\s*\)/g)].map(([, id]) => id);
  const throughDom = [...appJs.matchAll(/getElementById\(\s*'([\w-]+)'\s*\)/g)].map(([, id]) => id);

  return [...throughHelper, ...throughDom];
}

/** The string argument of every querySelector/querySelectorAll call. */
function querySelectorArguments() {
  // The quote characters are matched as a pair so that a selector holding the
  // other quote, such as 'input[name="x"]', is read whole.
  return [...appJs.matchAll(/querySelector(?:All)?\(\s*(?:'([^']*)'|"([^"]*)")/g)].map(
    ([, singleQuoted, doubleQuoted]) => singleQuoted ?? doubleQuoted,
  );
}

/** Selectors handed to closest(), which reach for a class the same way. */
function closestArguments() {
  return [...appJs.matchAll(/closest\(\s*'([^']*)'/g)].map(([, selector]) => selector);
}

/** Class names a selector asks for, e.g. '.saved-item-del' gives saved-item-del. */
function classNamesLookedUp() {
  return [...querySelectorArguments(), ...closestArguments()].flatMap((selector) =>
    [...selector.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(([, className]) => className),
  );
}

/** Class names carried by elements written in a file, from every class="a b". */
function classNamesWritten(source) {
  return [...source.matchAll(/class="([^"]*)"/g)].flatMap(([, value]) => value.split(/\s+/));
}

/** Class names the code puts on elements it builds, via className or classList. */
function classNamesBuiltInCode() {
  const assigned = [...appJs.matchAll(/className\s*=\s*([^;\n]+)/g)].flatMap(([, expression]) =>
    [...expression.matchAll(/'([^']*)'/g)].flatMap(([, value]) => value.split(/\s+/)),
  );
  const toggled = [...appJs.matchAll(/classList\.(?:add|remove|toggle)\(\s*'([\w-]+)'/g)].map(
    ([, className]) => className,
  );

  // The saved list and the confirm dialogs are built as template strings, so
  // their class="..." attributes live in the code instead of the markup.
  return [...classNamesWritten(appJs), ...assigned, ...toggled];
}

/** Attribute names asked for as a bare selector, e.g. '[data-legal]'. */
function attributeSelectorsLookedUp() {
  return querySelectorArguments().flatMap((selector) =>
    [...selector.matchAll(/\[([\w-]+)\]/g)].map(([, attribute]) => attribute),
  );
}

/** The literal array assigned to a top-level const, e.g. PCT_KEYS. */
function stringArrayConstant(name) {
  const declaration = appJs.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  if (!declaration) return null;

  return [...declaration[1].matchAll(/'([^']*)'/g)].map(([, value]) => value);
}

describe('elements referenced by id', () => {
  it('every id the code looks up exists in the HTML', () => {
    const ids = declaredIds();
    const missing = sorted(idsLookedUp().filter((id) => !ids.has(id)));

    expect(missing).toEqual([]);
  });

  it('the ids built at runtime from PCT_KEYS exist in the HTML', () => {
    // $(key + 'Slider') and $(key + 'Num') cannot be read as literals, and they
    // cover the twelve fields that make the whole calculator work. The suffixes
    // are the ones app.js appends; the list itself is read from the code so the
    // test follows a key added there.
    const keys = stringArrayConstant('PCT_KEYS');
    const ids = declaredIds();

    expect(keys).not.toBeNull();
    const missing = sorted(
      keys.flatMap((key) => ['Slider', 'Num'].map((suffix) => key + suffix)),
    ).filter((id) => !ids.has(id));

    expect(missing).toEqual([]);
  });
});

describe('elements referenced by class or attribute', () => {
  it('every class a selector asks for exists in the HTML or is built in code', () => {
    const existing = new Set([...classNamesWritten(html), ...classNamesBuiltInCode()]);
    const missing = sorted(classNamesLookedUp().filter((name) => !existing.has(name)));

    expect(missing).toEqual([]);
  });

  it('every attribute a selector asks for is carried by an element in the HTML', () => {
    const missing = sorted(
      attributeSelectorsLookedUp().filter((attribute) => !html.includes(`${attribute}=`)),
    );

    expect(missing).toEqual([]);
  });
});

describe('the Enter order walks real fields', () => {
  it('every field in ENTER_NEXT exists in the HTML and ends on the copy button', () => {
    const copyButtonId = appJs.match(/const COPY_BUTTON_ID = '([\w-]+)'/)?.[1];
    const table = appJs.match(/const ENTER_NEXT = \{([^}]*)\}/)?.[1];

    expect(copyButtonId).toBeTruthy();
    expect(table).toBeTruthy();

    // The last hop is written as the constant, not as a string, so it resolves
    // here: it is the one target that is a button rather than an input.
    const ids = declaredIds();
    const referenced = [...table.matchAll(/(\w+):\s*(?:'([\w-]+)'|COPY_BUTTON_ID)/g)].flatMap(
      ([, field, target]) => [field, target ?? copyButtonId],
    );
    const missing = sorted(referenced.filter((id) => !ids.has(id)));

    expect(missing).toEqual([]);
    expect(referenced).toContain(copyButtonId);
  });
});

describe('cache-busting stays consistent', () => {
  it('every reference to a module carries the same ?v= number', () => {
    // The bug this catches happened for real on 15/08: index.html moved app.js
    // to ?v=11 while sync.js kept importing ?v=10, the browser loaded the module
    // twice and every click fired twice. Neither the lint nor the other tests
    // see it, because the resolver strips the query before looking on disk.
    const references = [...`${html}\n${appJs}`.matchAll(/([\w-]+\.(?:js|css))\?v=(\d+)/g)];
    const versionsByFile = new Map();
    for (const [, file, version] of references) {
      if (!versionsByFile.has(file)) versionsByFile.set(file, new Set());
      versionsByFile.get(file).add(version);
    }

    const disagreeing = [...versionsByFile]
      .filter(([, versions]) => versions.size > 1)
      .map(([file, versions]) => `${file}: ${sorted(versions).join(', ')}`);

    expect(disagreeing).toEqual([]);
  });

  it('every local module imported with ?v= is a file that exists', () => {
    const existing = new Set(scriptFileNames());
    const imported = [...appJs.matchAll(/from\s+'\.\/([\w-]+\.js)\?v=\d+'/g)].map(
      ([, file]) => file,
    );
    const missing = sorted(imported.filter((file) => !existing.has(file)));

    expect(missing).toEqual([]);
  });
});

describe('the old style does not come back', () => {
  it('no element in the HTML carries an inline handler attribute', () => {
    const inline = [...html.matchAll(/\s(on[a-z]+)="([^"]*)"/g)].map(
      ([, attribute, code]) => `${attribute}="${code}"`,
    );

    expect(inline).toEqual([]);
  });

  it('window carries nothing beyond the one bridge the modules agreed on', () => {
    // Unlike the app, the site does have a global: auth.js publishes the signed
    // in user on window.currentUser, and paywall.js and sync.js read it from
    // there. That one is architecture; any other is a module leaking state.
    const globals = sorted([...appJs.matchAll(/window\.(\w+)\s*=[^=]/g)].map(([, name]) => name));

    expect(globals).toEqual(['currentUser']);
  });
});
