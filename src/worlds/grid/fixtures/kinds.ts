import { GATE } from './gate';
import { fixtureKind, fixtureKinds, registerKind, type FixtureKind } from './index';
import { EMITTER } from './emitter';
import { SIGN } from './sign';

/**
 * **Die Anmeldung** — eine Zeile je Art, und sonst steht hier nichts.
 *
 * Wer eine neue Art anlegt (`fixtures/<art>.ts`), trägt sie hier ein, und
 * damit kennen sie der Grundriss, das Weltformat, der Editor und jede
 * Gitterwelt. Genau eine Stelle, und sie ist eine Liste: Eine Registry, die
 * sich ihre Kinder selbst sucht, ist eine, bei der nach dem nächsten Umbau am
 * Bündler die Hälfte fehlt.
 *
 * Getrennt vom Vertrag (`fixtures/index.ts`), weil eine Art three.js baut und
 * der Grundriss ohne auskommen muss — die lange Fassung steht dort.
 *
 * **Wer die Arten braucht, holt sie hier**, nicht drüben: Der Vertrag kennt
 * eine leere Registry, diese Datei füllt sie beim Laden. Deshalb geht der
 * Nachschlag (`knownKind`, `paletteKinds`) durch diese Datei — ein Import, der
 * nur wegen einer Nebenwirkung dastünde, wäre einer, den das nächste
 * Aufräumen entfernt.
 */
registerKind(SIGN);
registerKind(GATE);
registerKind(EMITTER);

/** Die Art mit diesem Namen — `null`, wenn dieses Programm sie nicht kennt. */
export function knownKind(kind: string): FixtureKind<unknown> | null {
  return fixtureKind(kind);
}

/** Alles, was es zu setzen gibt — die Palettengruppe _Einbauten_. */
export function paletteKinds(): readonly FixtureKind<unknown>[] {
  return fixtureKinds();
}

export { EMITTER, GATE, SIGN };
