import { KITCHEN_CUES } from './kitchenSound';
import { RADIO_OFF, RADIO_STATIONS, radioPrompt, radioToggle } from './kitchenRadio';

/**
 * **Der Schalter des Küchenradios.**
 *
 * Er ist die kleinste Rechnung dieser Küche und trotzdem eine eigene Datei mit
 * eigenem Test, und der Grund steht in seiner einen Besonderheit: Ein Druck
 * macht an und aus, **und jedes Anmachen ist ein Sender weiter**. Das ist
 * bequem und genau deshalb leicht falsch gebaut — ein Zähler, der auch beim
 * Ausschalten weiterrückt, überspringt jeden zweiten Sender, und im Spiel
 * merkt man es erst nach dem vierten Druck.
 */
describe('das Küchenradio', () => {
  it('fängt aus an und spielt beim ersten Druck den ersten Sender', () => {
    expect(RADIO_OFF.on).toBe(false);
    const first = radioToggle(RADIO_OFF);
    expect(first.on).toBe(true);
    expect(first.station).toBe(0);
  });

  it('macht beim zweiten Druck wieder aus und behält dabei den Sender', () => {
    const on = radioToggle(RADIO_OFF);
    const off = radioToggle(on);
    expect(off.on).toBe(false);
    expect(off.station).toBe(on.station);
  });

  it('rückt nur beim Anmachen weiter und überspringt keinen Sender', () => {
    let state = RADIO_OFF;
    const heard: number[] = [];
    for (let i = 0; i < RADIO_STATIONS.length * 2; i++) {
      state = radioToggle(state); // an
      heard.push(state.station);
      state = radioToggle(state); // aus
    }
    expect(heard).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('nennt auf dem Schild, was der nächste Druck tut', () => {
    expect(radioPrompt(RADIO_OFF)).toBe(`Radio an — ${RADIO_STATIONS[0]}`);
    const on = radioToggle(RADIO_OFF);
    expect(radioPrompt(on)).toBe('Radio aus');
    const off = radioToggle(on);
    expect(radioPrompt(off)).toBe(`Radio an — ${RADIO_STATIONS[1]}`);
  });

  /**
   * **Sender und Aufnahmen sind dieselbe Liste**, und das muss so bleiben: Der
   * Spieler wählt die Aufnahme über die Nummer des Senders
   * (`kitchenAudio.KitchenAudio.loop`). Eine Liste mit einem Namen mehr als
   * Dateien ist ein Sender, der stumm bleibt.
   */
  it('hat zu jedem Sender eine Aufnahme', () => {
    expect(RADIO_STATIONS.length).toBe(KITCHEN_CUES.radio.files.length);
  });
});
