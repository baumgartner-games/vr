#!/usr/bin/env node
/**
 * **Erhöht dieser Pull Request die Version?**
 *
 * `0.<Build>.<Patch>` steht in `package.json` und auf der Startseite
 * (`src/core/appVersion.ts`). Die Regel dazu steht in `AGENTS.md`: **Jeder
 * Pull Request erhöht den Patch.** Eine Regel, an die sich nur erinnert wird,
 * ist keine — deshalb dieses Skript, und deshalb läuft es in der CI
 * (`.github/workflows/deploy.yml`) bei jedem Pull Request.
 *
 * Verglichen wird mit dem Zielbranch, nicht mit der letzten Version
 * überhaupt: Zwei Pull Requests nebeneinander gehen beide von `main` aus, und
 * wer zuletzt mergt, merkt beim Rebase selbst, dass seine Zahl schon vergeben
 * ist.
 *
 *     node tools/version-check.mjs <basis-ref>
 *
 * Ohne Basis-Ref (lokaler Aufruf) wird `origin/main` genommen. Gibt es den
 * Ref nicht, wird **nichts** beanstandet: Ein Prüfer, der ohne Daten rot
 * wird, wird abgeschaltet.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'origin/main';

/** Die drei Zahlen aus `0.1.2`, oder `null`, wenn das keine Version ist. */
function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version ?? '').trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Ob `a` echt größer ist als `b` — Zahl für Zahl, von links. */
function isAbove(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function versionOf(json, where) {
  const value = JSON.parse(json).version;
  const parts = parse(value);
  if (!parts) {
    console.error(`Keine Version der Form 0.<Build>.<Patch> in ${where}: ${String(value)}`);
    process.exit(1);
  }
  return parts;
}

const mine = versionOf(readFileSync('package.json', 'utf8'), 'package.json');

let theirs;
try {
  theirs = versionOf(
    execFileSync('git', ['show', `${base}:package.json`], { encoding: 'utf8' }),
    `${base}:package.json`,
  );
} catch {
  console.log(`Keine Version in ${base} zu vergleichen — nichts zu prüfen.`);
  process.exit(0);
}

if (isAbove(mine, theirs)) {
  console.log(`Version ${mine.join('.')} liegt über ${theirs.join('.')} — in Ordnung.`);
  process.exit(0);
}

console.error(
  [
    `Die Version ist nicht gestiegen: ${mine.join('.')} gegenüber ${theirs.join('.')} in ${base}.`,
    'Jeder Pull Request erhöht den Patch (AGENTS.md):',
    '',
    '    npm version patch --no-git-tag-version',
    '',
  ].join('\n'),
);
process.exit(1);
