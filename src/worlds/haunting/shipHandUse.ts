import type { InteractionLike, InteractionSpec } from '../../core/interaction';
import type { Handedness } from '../../core/XRInput';

/**
 * **Schutzschrank und Frachtschrank in der Brille** — was die Hand damit tut.
 *
 * Beide hingen bis hierher am Zeiger (`core/Pointer.ts`): der Schutzschrank
 * nur an seinem Tastenfeld, eine Handbreit Schirm auf einem Kasten von 2,2 m,
 * der Frachtschrank an seinem Blatt. Wer mit dem Trigger auf die Schranktür
 * zielte, traf nichts; wer die Greif-Taste nahm, sowieso nicht. Und weil ein
 * Laser auf einem Zeigerziel als „zeigt aufs Menü" gilt, trat die Hand der
 * Welt (`PortalWorld.useByHand`) genau dort zurück — ohne gelben Saum und ohne
 * Greif-Taste. Jetzt meldet sich der **ganze** Schrank beim Kern an, mit
 * Trigger und Greif-Taste, und der Laser einer freien Hand geht hindurch
 * (`Pointer.rayPasses`). Reine Rechnung, damit ein Test sie nachhält.
 */

/**
 * **Trigger oder Greif-Taste**, beide als Druck (`press`, getippt). Kein
 * Berühren: Wer im Schrank steht, steckt mit beiden Händen in seiner
 * Greifbox, und wer an einem vorbeigeht, streift ihn — beides soll nicht ein-
 * oder aussteigen. Angetippt wird weiter das Tastenfeld (`Pointer`, `poke`).
 * Von oben und aus den Augen bleibt alles, wie die Ableitung es sagt.
 */
export const SHIP_HAND_USE: InteractionSpec = {
  kind: 'press',
  views: { vr: { inputs: ['aimTrigger', 'grip'] } },
};

/**
 * **Der Schutzschrank bietet von innen nichts an.** Der Saum ist eine
 * umgestülpte Hülle (`core/highlight.ts`); von innen gesehen wäre er ein
 * gelber Kasten um den Kopf. Hinaus geht es trotzdem mit Trigger oder
 * Greif-Taste — über `lockerExitPress`, nicht über den Saum.
 */
export function lockerInteraction(hidden: boolean): InteractionLike {
  return hidden ? 'none' : SHIP_HAND_USE;
}

/**
 * **Geht der Laser dieser Hand durch den Schrank?** Nur in der Brille (`hand`
 * gesetzt) und nur bei einer **freien** Hand: Die bedient ihn über den Kern.
 * Eine Hand mit Lampe oder Radar benutzt dort nichts (`useByHand` fragt sie
 * gar nicht), also behält sie den Zeiger — ihr Trigger ist dann, wie überall
 * sonst, für das Ziel und nicht für das Werkzeug. Der Schirm (`null`) trifft
 * weiter.
 */
export function shipRayPasses(
  hand: Handedness | null,
  free: (hand: Handedness) => boolean,
): boolean {
  return hand !== null && free(hand);
}

/** Was eine Hand in diesem Bild gedrückt hat — und ob sie frei ist. */
export interface HandPress {
  readonly trigger: boolean;
  readonly grip: boolean;
  /** Keine Lampe, kein Radar, kein Gegenstand (`PortalWorld.handUsesFreely`). */
  readonly free: boolean;
}

/**
 * **Aus dem Schutzschrank heraus, wie man hineinkam**: Trigger oder
 * Greif-Taste einer freien Hand. `ready` ist falsch im Bild des Einstiegs
 * (`interactionCooldown`) — derselbe Druck, der hineinbrachte, darf nicht
 * gleich wieder hinausführen. Der Trigger einer Hand mit Werkzeug bleibt dem
 * Werkzeug; für sie gibt es den Schirm vor den Augen (`status`) und `A`.
 */
export function lockerExitPress(hands: readonly HandPress[], ready: boolean): boolean {
  if (!ready) return false;
  return hands.some((hand) => hand.free && (hand.trigger || hand.grip));
}
