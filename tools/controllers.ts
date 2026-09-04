/**
 * Holt die Controller-Modelle **einmal** ins Repository.
 *
 * three liefert mit `XRControllerModelFactory` eine fertige Lösung für „zeig
 * den Controller, den der Spieler wirklich in der Hand hält" — und lädt die
 * Modelle dafür zur Laufzeit von einem CDN
 * (`cdn.jsdelivr.net/npm/@webxr-input-profiles/assets`). Das ist genau die
 * Sorte Abhängigkeit, die man erst bemerkt, wenn sie fehlt: ohne Netz, hinter
 * einem Filter oder wenn jsdelivr mal wieder hakt, ist der Controller einfach
 * weg, und niemand weiß warum.
 *
 * Also liegen die Modelle bei uns. Dieses Skript ist der Weg dorthin und
 * zugleich die Dokumentation, woher sie kommen — es wird **nicht** beim Bauen
 * ausgeführt, sondern von Hand, wenn eine neue Controller-Generation
 * dazukommt:
 *
 * ```
 * node --experimental-strip-types tools/controllers.ts
 * ```
 *
 * Kopiert werden nur die **Meta-Profile**: das ganze Paket ist knapp 100 MB
 * groß, und ein Repository, das für einen Vive-Controller 12 MB mitschleppt,
 * den hier nie jemand anschließt, ist kein gut gepflegtes. Was nicht dabei
 * ist, fällt auf die selbst gebaute Hand aus `InputModel.ts` zurück — die gab
 * es vorher, sie sieht ordentlich aus, und sie braucht keine Datei.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Die Fassung, die im Repository liegt. Steht auch in der PROVENANCE. */
const VERSION = '1.0.20';

/**
 * Welche Profile mitkommen — jedes ein Quest-Controller.
 *
 * `meta-quest-touch-plus` ist Quest 3 und 3S, `-v2` deren neuere Ausführung,
 * `meta-quest-touch-pro` die Quest Pro, `oculus-touch-v3` die Quest 2 und
 * `oculus-touch-v2` die Quest 1. Die generischen Profile fehlen mit Absicht:
 * sie sind zusammen fast 30 MB groß und wären nur ein schlechterer Ersatz für
 * den Ersatz, den wir schon haben.
 */
const PROFILES = [
  'meta-quest-touch-plus',
  'meta-quest-touch-plus-v2',
  'meta-quest-touch-pro',
  'oculus-touch-v3',
  'oculus-touch-v2',
];

const OUT = 'public/controllers';

function main(): void {
  const work = mkdtempSync(join(tmpdir(), 'webxr-profiles-'));
  try {
    console.log(`@webxr-input-profiles/assets@${VERSION} wird geholt …`);
    const packed = execFileSync('npm', ['pack', `@webxr-input-profiles/assets@${VERSION}`], {
      cwd: work,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    })
      .trim()
      .split('\n')
      .pop()!;
    execFileSync('tar', ['xzf', packed], { cwd: work, stdio: 'inherit' });

    const dist = join(work, 'package', 'dist', 'profiles');
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });

    // Die Liste wird auf das gestutzt, was wirklich danebenliegt. Steht darin
    // ein Profil, dessen Ordner fehlt, sucht `fetchProfile` es trotzdem und
    // bekommt einen 404 — und der Controller bleibt aus, statt auf die gebaute
    // Hand zurückzufallen.
    const full = JSON.parse(readFileSync(join(dist, 'profilesList.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const list: Record<string, unknown> = {};
    for (const id of PROFILES) {
      if (!full[id]) throw new Error(`Profil "${id}" gibt es in dieser Fassung nicht mehr`);
      list[id] = full[id];
      cpSync(join(dist, id), join(OUT, id), { recursive: true });
      console.log(`  ${id}`);
    }
    writeFileSync(join(OUT, 'profilesList.json'), `${JSON.stringify(list, null, 2)}\n`);

    cpSync(join(work, 'package', 'LICENSE.md'), join(OUT, 'LICENSE.md'));
    writeFileSync(join(OUT, 'PROVENANCE.md'), provenance());
    console.log(`Fertig: ${OUT}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function provenance(): string {
  return `# Woher diese Dateien kommen

Kopiert von \`@webxr-input-profiles/assets@${VERSION}\` (npm), Verzeichnis
\`dist/profiles\`, von der [Immersive Web Community
Group](https://github.com/immersive-web/webxr-input-profiles). Lizenz: MIT,
siehe \`LICENSE.md\` daneben.

Enthalten sind nur die Profile, die an einer Quest tatsächlich vorkommen:

${PROFILES.map((id) => `- \`${id}\``).join('\n')}

\`profilesList.json\` ist entsprechend gestutzt — es darf nichts darin stehen,
was hier nicht danebenliegt. Alles andere fällt im Spiel auf den selbst
gebauten Controller aus \`src/worlds/tune/InputModel.ts\` zurück.

**Nicht von Hand ändern.** Erneuern mit:

\`\`\`
node --experimental-strip-types tools/controllers.ts
\`\`\`
`;
}

main();
