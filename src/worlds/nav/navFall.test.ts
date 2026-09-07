import { FALL_FREE, fallDamage, fallHeight, safeFall, survivesFall } from './navFall';
import { CRITTER_PROFILE, ZOMBIE_PROFILE } from './navProfile';

describe('Der Fallschaden', () => {
  it('lässt einen Absatz umsonst', () => {
    expect(fallDamage(0)).toBe(0);
    expect(fallDamage(1)).toBe(0);
    expect(fallDamage(FALL_FREE)).toBe(0);
    // Auch ein Sturz nach oben ist keiner.
    expect(fallDamage(-3)).toBe(0);
  });

  it('kostet erst darüber, und dann gleichmäßig', () => {
    const one = fallDamage(FALL_FREE + 1);
    const two = fallDamage(FALL_FREE + 2);
    expect(one).toBeGreaterThan(0);
    expect(two).toBeCloseTo(one * 2);
  });

  it('rechnet aus, wie tief einer noch springen darf', () => {
    // Die Umkehrung, und sie muss zur Rechnung passen: Genau auf der Höhe
    // bleibt er stehen, einen Zentimeter darunter nicht mehr.
    for (const health of [20, 100, 160]) {
      const limit = safeFall(health);
      expect(fallDamage(limit)).toBeCloseTo(health);
      expect(survivesFall(health, limit - 0.01)).toBe(true);
      expect(survivesFall(health, limit + 0.01)).toBe(false);
    }
  });

  it('lässt genau so viel Schaden wie Leben nicht durchgehen', () => {
    // Wer eine Kante nur überlebt, um unten liegen zu bleiben, ist nicht
    // heruntergekommen, sondern abgestürzt.
    expect(survivesFall(0, 0)).toBe(false);
    expect(survivesFall(40, safeFall(40))).toBe(false);
  });

  it('trennt den Zombie vom Hamster an der Dachkante', () => {
    // **Die Zahl, wegen der es diese Datei gibt.** Dasselbe Dach (2,4 m),
    // dieselbe Karte, zwei Antworten — und keine davon steht irgendwo als
    // Sonderfall, sie folgen beide aus dem Leben der Sorte.
    expect(safeFall(ZOMBIE_PROFILE.health)).toBeGreaterThan(2.4);
    expect(safeFall(CRITTER_PROFILE.health)).toBeLessThan(2.4);
  });

  it('macht aus einem Aufprall die Höhe, aus der er käme', () => {
    // Vier Meter freier Fall sind knapp neun Meter je Sekunde.
    const speed = Math.sqrt(2 * 9.81 * 4);
    expect(fallHeight(speed)).toBeCloseTo(4);
    // Die Richtung ist egal — ein Aufprall ist ein Betrag.
    expect(fallHeight(-speed)).toBeCloseTo(4);
    // Und auf dem Mond fällt man langsamer, also tut derselbe Sturz weniger
    // weh: Dieselbe Geschwindigkeit käme dort aus sechsfacher Höhe.
    expect(fallHeight(speed, 9.81 / 6)).toBeCloseTo(24);
    expect(fallHeight(speed, 0)).toBe(0);
  });
});
