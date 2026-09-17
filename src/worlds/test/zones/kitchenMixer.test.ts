import * as THREE from 'three';
import { kitchenDeck, kitchenPiece } from '../../../core/kitchenFit';
import { MIXER_DECK, MIXER_HEIGHT, MixerKit } from './kitchenMixer';
import {
  WORK_ALONE,
  WORK_SECONDS,
  advanceWork,
  onWork,
  workProgress,
  workStage,
} from './kitchenWork';
import { chopStage, dish } from './kitchenRecipes';
import { kitchenDeed, kitchenPrompt } from './kitchenCarry';

/**
 * **Was der Mixer verspricht** (`kitchenMixer.ts`, `kitchenWork.ts`).
 *
 * Er ist ein Schneidebrett mit Motor, und deshalb steht hier fast nichts über
 * das Hacken selbst — das prüft `kitchenWork.test.ts` für alle drei Arten auf
 * einmal. Hier stehen die drei Aussagen, die **nur** für ihn gelten:
 *
 * - **Er läuft ohne jemanden davor.** Das ist die eine Zeile, die ihn vom
 *   Brett unterscheidet (`WORK_ALONE`), und die einzige, ohne die eine
 *   Bandstraße nicht möglich wäre.
 * - **Eine Stufe je Auflegen**, also zwei Durchgänge für Tomatensuppe — und
 *   zwar aus derselben Tabelle, aus der auch das Brett liest.
 * - **Und seine Maße stimmen mit dem Katalog überein.** Das Möbel wird gebaut
 *   und nicht geladen, also gibt es keine Datei, die beides zusammenhält; ein
 *   Mixer, dessen Schüssel woanders anfängt, als der Katalog sagt, legt das
 *   Geschnittene in die Luft.
 */

describe('der Mixer arbeitet allein', () => {
  it('läuft weiter, wenn niemand danebensteht', () => {
    // Am Brett bricht das Weggehen ab; hier nicht. `near = false` ist genau
    // der Fall „die Figur ist drei Kacheln weiter".
    let state = onWork('blend', 'lettuce');
    expect(state.working).toBe(true);
    const tick = advanceWork(state, WORK_SECONDS.blend / 2, false);
    state = tick.state;
    expect(state.working).toBe(true);
    expect(workProgress(state)).toBeCloseTo(0.5, 6);

    const done = advanceWork(state, WORK_SECONDS.blend, false);
    expect(done.done).toBe('lettuce-cut');
    // Und das Fertige bleibt liegen, damit ein Zugband es abholen kann.
    expect(done.toHand).toBe(false);
    expect(done.state.item).toBe('lettuce-cut');
  });

  it('ist die einzige Arbeit, die das darf', () => {
    expect(WORK_ALONE).toEqual({ chop: false, wash: false, blend: true });
    // Die Gegenprobe: Am Brett fällt die Uhr beim Weggehen auf null zurück.
    const away = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop, false);
    expect(away.done).toBeNull();
    expect(away.state.working).toBe(false);
    expect(away.state.time).toBe(0);
  });

  it('nimmt einem Anwesenheit ab und keine Zeit', () => {
    // Der Preis dafür steht in `WORK_SECONDS`: Wäre der Mixer auch noch
    // schneller als das Brett, gäbe es keinen Grund mehr, jemals ein Brett zu
    // benutzen — und ein Möbel, das ein anderes wertlos macht, ist ein Ersatz
    // und kein zweites Möbel.
    expect(WORK_SECONDS.blend).toBeGreaterThan(WORK_SECONDS.chop);
  });
});

describe('zweimal durch den Mixer', () => {
  it('macht aus einer Tomate eine Scheibe und erst dann Suppe', () => {
    // Der Satz aus dem Auftrag, als Rechnung: „Tomaten werden nicht zu
    // Tomatensuppe, sondern müssen zweimal durch den Mixer."
    const first = advanceWork(onWork('blend', 'tomato'), WORK_SECONDS.blend, false);
    expect(first.done).toBe('tomato-cut');
    // **Eine Stufe je Auflegen**: Die Uhr steht danach, auch wenn das Bild
    // lang war. Weiter geht es erst, wenn es erneut hineinkommt.
    expect(first.state.working).toBe(false);
    const idle = advanceWork(first.state, WORK_SECONDS.blend * 5, false);
    expect(idle.done).toBeNull();

    const second = advanceWork(onWork('blend', 'tomato-cut'), WORK_SECONDS.blend, false);
    expect(second.done).toBe('tomato-soup');
    // Und danach ist Schluss — aus Suppe wird nichts mehr.
    expect(onWork('blend', 'tomato-soup').working).toBe(false);
  });

  it('liest dieselbe Stufenfolge wie das Schneidebrett', () => {
    // Es gibt sie einmal (`kitchenRecipes.CHOPS`) und nicht einmal für das
    // Messer und einmal für den Motor — sonst wird die Tomate eines Tages im
    // Mixer in einem Zug zu Suppe und am Brett nicht.
    for (const item of ['lettuce', 'tomato', 'tomato-cut', 'plate-dirty', 'bun'] as const) {
      expect({ item, stage: workStage('blend', item) }).toEqual({
        item,
        stage: chopStage(item),
      });
      expect(workStage('blend', item)).toBe(workStage('chop', item));
    }
  });
});

describe('was `A` am Mixer tut', () => {
  it('legt hinein und fängt sofort an — ohne zweiten Druck', () => {
    const deed = kitchenDeed(dish('tomato'), { kind: 'mixer' });
    expect(deed).toEqual({ do: 'work', kind: 'blend', dish: dish('tomato') });
    expect(kitchenPrompt(deed, 'Mixer')).toBe('Tomate mixen');
  });

  it('ist sonst eine Ablage wie jede andere', () => {
    // Nichts zu hacken: Der Teller liegt hier wie auf jeder Arbeitsplatte.
    expect(kitchenDeed(dish('plate'), { kind: 'mixer' })).toEqual({
      do: 'place',
      dish: dish('plate'),
    });
    // Und was fertig darin liegt, nimmt man heraus.
    expect(kitchenDeed(null, { kind: 'mixer', on: dish('lettuce-cut') })).toEqual({
      do: 'take',
      dish: dish('lettuce-cut'),
    });
    // Leere Hand vor leerem Mixer sagt nichts — und leuchtet deshalb auch
    // nicht (`kitchen.refreshStations`).
    expect(kitchenDeed(null, { kind: 'mixer' })).toEqual({ do: 'nothing' });
  });
});

describe('MixerKit — das Möbel', () => {
  it('baut ein Möbel ohne Leinwand und räumt es wieder weg', () => {
    const kit = new MixerKit();
    const piece = kit.piece();
    expect(piece.name).toBe('kitchen-mixer');
    kit.dispose();
    kit.dispose();
  });

  it('teilt Formen und Farben zwischen zwei Mixern', () => {
    const kit = new MixerKit();
    const seen = (piece: THREE.Object3D): unknown[] => {
      const out: unknown[] = [];
      piece.traverse((node) => {
        if (node instanceof THREE.Mesh) out.push(node.geometry, node.material);
      });
      return out;
    };
    const a = seen(kit.piece());
    const b = seen(kit.piece());
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
    kit.dispose();
  });

  it('hält sich an die Maße des Katalogs', () => {
    const piece = kitchenPiece('mixer')!;
    expect(MIXER_HEIGHT).toBe(piece.height);
    expect(MIXER_DECK).toBe(kitchenDeck(piece));
    // Die Schüssel steht auf der Tischplatte, und die liegt auf der Höhe des
    // Arbeitstisches — sonst stünde ein Mixer in einer Reihe aus Tischen als
    // Stufe darin.
    expect(MIXER_DECK).toBe(kitchenPiece('table')!.height);
    // Und der Motorblock steht darüber und nicht darunter.
    expect(MIXER_HEIGHT).toBeGreaterThan(MIXER_DECK);
  });

  it('lässt die Schüssel innerhalb der Kachel und unter Kopfhöhe', () => {
    const kit = new MixerKit();
    const box = new THREE.Box3().setFromObject(kit.piece());
    expect(box.max.x).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(box.min.x).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    expect(box.max.z).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    // Die Hülle endet an der Oberkante des Motorblocks — genau die Zahl, die
    // im Katalog steht und mit der die Küche Kopffreiheit rechnet.
    expect(box.max.y).toBeCloseTo(MIXER_HEIGHT, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
  });
});
