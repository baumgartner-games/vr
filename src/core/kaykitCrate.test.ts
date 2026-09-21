import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CRATE_LID_PATH, CRATE_PACK, kaykitPlinth } from './kaykitCrate';

/**
 * **Der Sockel unter den Kisten des Regals** — die Regel, die entscheidet, ob
 * zu einer Adresse noch ein zweites Netz gehört.
 *
 * Sie ist an Paket und Dateinamen geknüpft und nicht an einer Liste, also ist
 * sie zugleich die Stelle, an der sich ein Tippfehler versteckt: Ein `crates`
 * statt `crate` fiele im Spiel nur dadurch auf, dass eine Kiste wieder eine
 * Handbreit zu tief steht.
 */
describe('der Deckel unter der Kiste', () => {
  it('kommt unter jede Kiste des Restaurant-Pakets', () => {
    expect(kaykitPlinth(`${CRATE_PACK}/crate.glb`)).toBe(CRATE_LID_PATH);
    expect(kaykitPlinth(`${CRATE_PACK}/crate_buns.glb`)).toBe(CRATE_LID_PATH);
    expect(kaykitPlinth(`${CRATE_PACK}/crate_tomatoes.glb`)).toBe(CRATE_LID_PATH);
  });

  it('kommt nicht unter den Deckel selbst', () => {
    expect(kaykitPlinth(CRATE_LID_PATH)).toBeNull();
  });

  it('lässt alles andere in Ruhe', () => {
    expect(kaykitPlinth(`${CRATE_PACK}/table_A.glb`)).toBeNull();
    // Eine Kiste **heißt** anderswo auch so — der Sockel gehört trotzdem nur
    // in dieses Paket, denn nur dort ist er nachgemessen.
    expect(kaykitPlinth('dungeon/crate.glb')).toBeNull();
    expect(kaykitPlinth('forest-nature/color1/Tree_1_A_Color1.glb')).toBeNull();
    expect(kaykitPlinth('crate.glb')).toBeNull();
  });

  /**
   * **Und den Deckel gibt es wirklich.** Ohne diese Zeile wäre ein
   * verschriebener Pfad ein Sockel, der still fehlt — der Lader gibt dann die
   * Kiste ohne ihn heraus und sagt nichts. Ohne die gekauften Pakete gibt es
   * nichts zu prüfen; das ist ein normaler Checkout und kein Fehler.
   */
  it('liegt an der Adresse, die hier steht', () => {
    const file = join(process.cwd(), 'public/models/kaykit', CRATE_LID_PATH);
    if (!existsSync(join(process.cwd(), 'public/models/kaykit', CRATE_PACK))) return;
    expect(existsSync(file)).toBe(true);
  });
});
