import { PLAN_WALL_H, PLAN_WALL_T } from '../../editor/levelPlan';
import { SIGN_BACK_DEPTH, SIGN_CANVAS_W, SIGN_PAD } from '../../signs/SignBoard';
import { layoutSign } from '../../signs/signLayout';
import { parseSign } from '../../signs/signMarkup';
import { DEFAULT_SIGN, clampSign, fontPixels } from '../../signs/signSettings';
import { KITCHEN } from '../layout';
import {
  NOTICE_FONT_CM,
  NOTICE_HEIGHT,
  NOTICE_TEXT,
  NOTICE_TILE,
  NOTICE_WIDTH,
  noticePose,
} from './kitchenNotice';

/**
 * **Der Aushang an der Küchenwand** (`kitchenNotice.ts`) — die eine Tafel
 * dieser Welt, auf der Markdown wirklich gesetzt wird.
 *
 * Geprüft wird, was man ihr nicht ansieht, bevor man davorsteht: **wo** sie
 * hängt (an der Wand und nicht in ihr) und **ob der Text daraufpasst**. Das
 * zweite ist der eigentliche Grund für diese Datei: Die Tafel rollt nicht —
 * sie hat keinen Daumenstick, sie hängt an einer Wand —, und ein Aushang, der
 * nicht rollt und nicht passt, ist ein abgeschnittener Aushang. Am Schirm
 * fällt das niemandem auf, weil die letzte Zeile einfach fehlt.
 */

const settings = clampSign({
  ...DEFAULT_SIGN,
  fontCm: NOTICE_FONT_CM,
  width: NOTICE_WIDTH,
  height: NOTICE_HEIGHT,
});

describe('Der Aushang an der Küchenwand', () => {
  it('hängt vor der Nordwand und nicht in ihr', () => {
    const at = noticePose();
    // Die Wand steht mittig auf der Nordkante der Zone; ihre Innenseite liegt
    // eine halbe Wanddicke weiter südlich (+z).
    const innerFace = KITCHEN.z + PLAN_WALL_T / 2;
    expect(at.z - SIGN_BACK_DEPTH).toBeGreaterThan(innerFace);
    // Und nicht mitten in den Raum hinein: eine Handbreit reicht.
    expect(at.z - SIGN_BACK_DEPTH - innerFace).toBeLessThan(0.1);
  });

  it('bleibt unter der Wandkrone und über der Arbeitszeile', () => {
    const { y } = noticePose();
    expect(y + NOTICE_HEIGHT / 2).toBeLessThan(PLAN_WALL_H);
    // Die Zeile an der Nordwand ist gut 0,9 m hoch (`core/kitchenFit.ts`);
    // darunter zu hängen hieße, die halbe Tafel hinter einen Schrank zu
    // hängen.
    expect(y - NOTICE_HEIGHT / 2).toBeGreaterThan(0.9);
  });

  it('hängt über der Küche und nicht über dem Schauraum daneben', () => {
    const { x } = noticePose();
    // Ganz in der Breite der Zone, mit beiden Kanten.
    expect(x - NOTICE_WIDTH / 2).toBeGreaterThan(KITCHEN.x);
    expect(x + NOTICE_WIDTH / 2).toBeLessThan(KITCHEN.x + KITCHEN.w);
    // Und im westlichen Teil, wo gekocht wird: Der Schauraum beginnt bei
    // Kachel 12 der Zone (`zones/kitchenPlan.ts`).
    expect(NOTICE_TILE).toBeLessThan(12);
  });

  /**
   * Die Probe auf den Satz: Jedes dieser Zeichen geht einen anderen Weg durch
   * `signMarkup.ts`. Fällt einer davon aus, steht hier künftig ein Absatz mit
   * Sternchen darin statt einer Aufzählung — und niemand merkt es, weil beides
   * nach Text aussieht.
   */
  it('nutzt das, was ein Schild an Markdown kann', () => {
    const kinds = new Set(parseSign(NOTICE_TEXT, { markdown: true }).map((block) => block.kind));
    expect(kinds).toEqual(new Set(['heading', 'text', 'list', 'rule', 'quote', 'gap']));
  });

  it('passt auf die Tafel, ohne dass jemand rollen muss', () => {
    const pad = SIGN_CANVAS_W * SIGN_PAD;
    const layout = layoutSign(parseSign(NOTICE_TEXT, { markdown: true }), {
      width: SIGN_CANVAS_W - pad * 2,
      fontSize: fontPixels(settings, SIGN_CANVAS_W),
      align: settings.align,
      // Ohne Leinwand keine echte Messung, also großzügig gerechnet: 0,6 em je
      // Zeichen ist breiter als system-ui im Mittel wirklich baut. Was mit
      // dieser Schätzung passt, passt auch gezeichnet.
      measure: (text, style) => text.length * style.size * 0.6,
      imageAspect: () => null,
    });
    const canvasHeight = Math.round((SIGN_CANVAS_W * settings.height) / settings.width);
    expect(layout.height).toBeLessThanOrEqual(canvasHeight - pad * 2);
  });
});
