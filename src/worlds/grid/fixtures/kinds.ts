import { BUTTON } from './button';
import { DOOR } from './door';
import { EMITTER } from './emitter';
import { GATE } from './gate';
import { fixtureKind, fixtureKinds, registerKind, type FixtureKind } from './index';
import { LAMP } from './lamp';
import { LEVER } from './lever';
import { PLATE } from './plate';
import { SIGN } from './sign';
import { WARDROBE } from './wardrobe';

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
registerKind(DOOR);
registerKind(BUTTON);
registerKind(LEVER);
registerKind(PLATE);
registerKind(LAMP);
registerKind(WARDROBE);

/** Die Art mit diesem Namen — `null`, wenn dieses Programm sie nicht kennt. */
export function knownKind(kind: string): FixtureKind<unknown> | null {
  return fixtureKind(kind);
}

/** Alles, was es zu setzen gibt — die Palettengruppe _Einbauten_. */
export function paletteKinds(): readonly FixtureKind<unknown>[] {
  return fixtureKinds();
}

export { BUTTON, DOOR, EMITTER, GATE, LAMP, LEVER, PLATE, SIGN, WARDROBE };
