import { spawnAt } from './spawnAt';

/**
 * **Die Adresse einer Kachel** (`spawnAt.ts`, `?at=`).
 *
 * Sie ist das Werkzeug dessen, der die Welt prüft: Wer eine Kachel ansehen
 * will, tippt sie in die Anschrift, statt eine Minute über die Fläche zu
 * laufen. Was hier geprüft wird, ist deshalb vor allem das Gegenteil davon —
 * dass eine **halbe** oder **falsche** Angabe `null` gibt und nicht eine
 * geratene Kachel. Wer sich vertippt, soll am Startplatz stehen und es merken.
 */
describe('spawnAt — wo man ankommt, wenn die Adresse es sagt', () => {
  it('liest eine Kachel der Welt', () => {
    expect(spawnAt('?at=21,-24')).toEqual({ x: 21, z: -24, level: 0 });
    // Eine negative Kachel ist eine Kachel.
    expect(spawnAt('?at=-20,22')).toEqual({ x: -20, z: 22, level: 0 });
    // Mit Ebene.
    expect(spawnAt('?at=18,-16,1')).toEqual({ x: 18, z: -16, level: 1 });
  });

  it('schneidet Nachkommastellen ab, wie jede Kachelrechnung hier', () => {
    expect(spawnAt('?at=2.9,-0.1')).toEqual({ x: 2, z: -1, level: 0 });
  });

  it('nimmt Leerzeichen hin, auch die aus einer kopierten Fehlermeldung', () => {
    expect(spawnAt('?at= 13 , -24 ')).toEqual({ x: 13, z: -24, level: 0 });
  });

  it('steht neben anderen Angaben in derselben Adresse', () => {
    expect(spawnAt('?world=test&at=13,-24&room=ABCD')).toEqual({ x: 13, z: -24, level: 0 });
  });

  it('gibt bei allem, was nicht eindeutig ist, den Startplatz zurück', () => {
    // Nichts gesagt.
    expect(spawnAt('')).toBeNull();
    expect(spawnAt('?world=test')).toBeNull();
    expect(spawnAt('?at=')).toBeNull();
    expect(spawnAt('?at=%20%20')).toBeNull();
    // Ein Wort ist keine Kachel.
    expect(spawnAt('?at=kueche')).toBeNull();
    // Eine halbe Koordinate, ein Wort, ein Feld zu viel.
    expect(spawnAt('?at=13')).toBeNull();
    expect(spawnAt('?at=,3')).toBeNull();
    expect(spawnAt('?at=13,')).toBeNull();
    expect(spawnAt('?at=13,acht')).toBeNull();
    expect(spawnAt('?at=1,2,3,4')).toBeNull();
    // Und keine Zahl, die keine ist.
    expect(spawnAt('?at=13,NaN')).toBeNull();
    expect(spawnAt('?at=13,Infinity')).toBeNull();
  });

  it('kennt keine Ebene unter dem Boden', () => {
    // Eine negative Ebene gibt es nicht; der Graph klemmt sie ohnehin, und eine
    // geratene Tiefe wäre ein Spieler im Boden.
    expect(spawnAt('?at=0,0,-2')?.level).toBe(0);
  });
});
