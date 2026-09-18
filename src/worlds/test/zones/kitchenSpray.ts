import * as THREE from 'three';

/**
 * **Der Feuerlöscher pustet** — der Strahl als Rechnung, als Bild und als
 * Fortschritt am Feuer.
 *
 * Bis eben war Löschen ein einzelner Druck auf `A` am brennenden Herd
 * (`kitchenCarry.kitchenDeed`, `do: 'douse'`): Man stand davor, tippte, und das
 * Feuer war weg. Das ist kein Feuerlöscher, das ist ein Lichtschalter — bei
 * _Overcooked_ und bei _PlateUp_ **läuft** der Löscher, man hält ihn ins Feuer,
 * und was im Strahl liegt, geht aus. Genau das steht hier.
 *
 * **Drei Teile, und nur der mittlere kennt three.js.** Wo der Strahl hinreicht
 * (`inSpray`), ob der Löscher an ist (`sprayOn`) und wie weit ein Herd schon
 * gelöscht ist (`advanceDouse`) sind reine Zahlen — dieselbe Trennung wie
 * zwischen `kitchenClock.ts` und `kitchenGauge.ts`, und aus demselben Grund:
 * Ein Fall prüft ein Test in Millisekunden nach, derselbe Fall im Headset ist
 * eine Viertelstunde Hin- und Herlaufen.
 *
 * **Gerechnet wird auf dem Boden**, in x und z, und nicht im Raum — aus
 * demselben Grund wie bei `core/usable.pickUsable`: Die Figur zeigt auf eine
 * **Stelle**, nicht auf eine Höhe. Ein Kegel aus der Brust heraus verfehlte
 * einen brennenden Herd um genau die Höhe der Brust, sobald jemand ein wenig
 * nach oben sieht.
 *
 * **Nichts davon kennt die Zone.** Die Küche sagt je Bild „Löscher hier,
 * Richtung dorthin, Auslöser liegt" und bekommt einen Kegel und ein Bild
 * zurück; welche Herde darin liegen, weiß nur sie (`kitchen.ts`).
 *
 * **Und wo genau der Nebel austritt, rechnet der Strahl selbst** — die Küche
 * reicht ihm den **Ursprung des Netzes** (`kitchen.spray`:
 * `held.object.getWorldPosition`), und der liegt bei jedem Gerät dieser Küche
 * **unten in der Mitte** (`core/kitchenModel.takeUtensil`). Beim Löscher ist
 * das sein **Fuß**, und genau daher kam der Rauch bisher: unten aus dem
 * Standring statt oben aus dem Rohr. `sprayMuzzle` setzt ihn dorthin, wo das
 * Modell seine Düse hat.
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Wie weit der Strahl reicht**, in Metern.
 *
 * Eine Kachel ist 1 m breit (`worlds/nav/navTile.TILE`), und ein Herd steht auf
 * genau einer (`core/kitchenFit.KITCHEN_PIECES`). Wer davorsteht, ist gut einen
 * Meter von seiner Mitte entfernt; 2,5 m heißt also: Man löscht **von zwei
 * Kacheln Abstand**, ohne im Feuer zu stehen, und erwischt trotzdem nicht den
 * Herd am anderen Ende der Zeile.
 *
 * Deutlich weiter als der Griff (`core/usable.USE_REACH` = 1,5 m), und das ist
 * der Sinn der Sache: Der alte Handgriff verlangte, dass man den brennenden
 * Herd **anfasst**. Ein Löscher, den man aus sicherem Abstand hält, ist der
 * Grund, warum es ihn gibt.
 */
export const SPRAY_RANGE = 2.5;

/**
 * **Der halbe Öffnungswinkel des Kegels**, im Bogenmaß (25°).
 *
 * Nachgerechnet an den Kacheln, an denen die Küche gebaut ist: Auf einen Meter
 * ist der Kegel 2 · 1 · tan 25° = **0,93 m** breit, also knapp eine Kachel —
 * wer aus der Nähe löscht, trifft den Herd, vor dem er steht, und nicht dessen
 * Nachbarn. Auf die volle Reichweite wächst er auf 2,33 m, also gut zwei
 * Kacheln: Aus der Entfernung ist der Strahl grob, und zwei benachbarte
 * brennende Herde gehen zusammen aus. Genau diese Staffelung ist gemeint —
 * nah und genau, oder weit und ungefähr.
 *
 * Enger wäre ein Laserpointer, den man von oben mit dem rechten Stock nie
 * ruhig hält; weiter wäre ein Löscher, der die halbe Küche auf einmal
 * ausmacht, und dann braucht man nicht zu zielen.
 */
export const SPRAY_HALF_ANGLE = (25 * Math.PI) / 180;

/**
 * **Wie lange ein Herd im Strahl braucht, bis er aus ist**, in Sekunden.
 *
 * Anderthalb. Die Zahl steht zwischen zwei anderen: Das Feuer kündigt sich
 * fünf Sekunden lang mit einem Warndreieck an (`kitchenClock.FIRE_SECONDS`),
 * und solange es brennt, nimmt der Herd **nichts** mehr an
 * (`kitchenCarry.kitchenDeed`, `stove`) — eine Küche mit zwei brennenden Herden
 * steht. Löschen darf deshalb nicht lange dauern.
 *
 * Null wäre der alte Knopfdruck zurück. Anderthalb Sekunden sind lang genug,
 * dass man den Strahl **halten** und dabei zielen muss (das ist der ganze
 * Unterschied), und kurz genug, dass ein Brand eine Störung bleibt und keine
 * verlorene Runde.
 */
export const SPRAY_SECONDS = 1.5;

/**
 * **Wie schnell der Fortschritt zurückfällt**, wenn gerade nicht gepustet wird
 * — als Anteil der Rate, mit der er steigt.
 *
 * Schlagartig auf null wäre die Falle: Wer zwei brennende Herde nebeneinander
 * hat und den Strahl von einem zum anderen schwenkt, verlöre bei jedem Schwenk
 * alles und käme nie an. Gar kein Rückfall wäre die andere Falle — dann tippt
 * man zwölfmal kurz in Richtung Herd und es geht trotzdem aus, und aus dem
 * Halten wäre wieder ein Klopfen geworden.
 *
 * Die Hälfte trifft beides: Ein Wechsel im Sekundentakt (1 s pusten, 1 s
 * daneben) bringt je Runde netto eine halbe Sekunde Fortschritt — **zwei Herde
 * abwechselnd zu löschen geht, dauert aber dreimal so lang** wie einer nach dem
 * anderen. Und ein voller Fortschritt ist erst nach drei Sekunden ohne Strahl
 * ganz verfallen, also lange genug, dass ein kurzes Verreißen nichts kostet.
 */
export const DOUSE_COOL = 0.5;

/**
 * **Ob eine Stelle im Strahl liegt.** Gerechnet wird **auf dem Boden**, in x
 * und z — aus demselben Grund wie bei `core/usable.pickUsable`.
 *
 * Zwei Fragen und sonst nichts: Ist es nah genug, und liegt es im Winkel?
 * Genau auf der Reichweite und genau auf dem Rand des Kegels zählt als
 * **drinnen** — ein Kegel, dessen Rand nicht dazugehört, ist ein Kegel, an dem
 * ein Herd bei 2,4999 m ausgeht und bei 2,5000 m nicht, und diesen Unterschied
 * erklärt niemandem jemand.
 *
 * Eine Richtung **ohne Länge** trifft nichts. Das ist kein Sonderfall aus
 * Vorsicht, sondern der Fall, in dem jemand senkrecht nach unten sieht: Dann
 * gibt es keine waagerechte Richtung mehr, und ein Löscher, der in diesem
 * Augenblick rundum alles löscht, wäre schlimmer als einer, der nichts tut
 * (`core/usable.aimForward` fängt das für `A` schon vorher ab).
 *
 * @param from     wo die Düse steht (x/z zählen)
 * @param forward  wohin sie zeigt; die Länge ist egal
 * @param at       die Stelle, nach der gefragt wird — die Mitte des Herdes
 */
export function inSpray(
  from: { x: number; z: number },
  forward: { x: number; z: number },
  at: { x: number; z: number },
  range = SPRAY_RANGE,
  halfAngle = SPRAY_HALF_ANGLE,
): boolean {
  const length = Math.hypot(forward.x, forward.z);
  if (!(length > 0)) return false;

  const ox = at.x - from.x;
  const oz = at.z - from.z;
  const away = Math.hypot(ox, oz);
  if (!(away <= range)) return false;
  // Direkt an der Düse gibt es keinen Winkel mehr — was dort liegt, liegt im
  // Strahl, egal wohin er zeigt.
  if (away < 1e-6) return true;

  // Der Kosinus des Winkels zwischen Strahl und Ziel, ohne einen einzigen
  // Arkustangens: `cos` ist auf 0…π streng fallend, also ist „Winkel kleiner
  // als der halbe Öffnungswinkel" dasselbe wie „Kosinus größer als dessen
  // Kosinus" — und der Vergleich ist die Rechnung, die auch `pickUsable`
  // benutzt, nur ohne Wurzel.
  const along = (ox * forward.x + oz * forward.z) / (away * length);
  // Die Handbreit Luft ist für den Rand gedacht: Wer `Math.cos(halfAngle)`
  // gegen einen Punkt vergleicht, den er selbst aus Sinus und Kosinus desselben
  // Winkels gebaut hat, verliert sonst am letzten Bit.
  return along >= Math.cos(halfAngle) - 1e-9;
}

/**
 * **Wie das Halten je Ansicht gemeint ist.**
 *
 * `toggle` heißt: Ein Druck an, der nächste aus. `hold`: an, solange der
 * Auslöser liegt. Die Zone braucht das für den Hinweis über der Figur — _A ·
 * Feuerlöscher an_ ist ein anderer Satz als _Halten zum Löschen_ —, und sie
 * bekommt ihn aus derselben Quelle, aus der `sprayOn` gleich entscheidet.
 */
export type SprayHold = 'toggle' | 'hold';

export function sprayHold(topDown: boolean): SprayHold {
  return topDown ? 'toggle' : 'hold';
}

/**
 * **Ob der Benutzen-Knopf gerade dem Löscher gehört** — und damit nicht mehr
 * dem Sprung (`core/PlayerRig.useBusy`).
 *
 * Es ist der gemeldete Fehler, als Regel geschrieben: Von oben schaltet `A`
 * den Löscher an, und solange nichts in Reichweite stand, tat derselbe Druck
 * **beides** — der Löscher ging an, und die Figur hüpfte dazu.
 *
 * Zwei Zeilen, und beide stehen schon woanders:
 *
 * - **Ohne Löscher in der Hand** gehört der Knopf niemandem — wer ihn in die
 *   Halterung zurückstellt, springt im nächsten Bild wieder. Dieselbe Bedingung
 *   wie in `sprayOn`, und aus demselben Grund.
 * - **In der Brille** zieht ihn der Trigger der Hand, die ihn hält, und nicht
 *   `A`. Dort darf der Knopf daneben weiter springen; ihn auch hier zu
 *   vergeben, nähme dem Spieler den Sprung für etwas, das den Knopf gar nicht
 *   benutzt.
 *
 * Am Schirm aus den Augen gilt dagegen dasselbe wie von oben: Dort ist `A`
 * (beziehungsweise `E` und die Maustaste) der Auslöser, also ist er vergeben.
 *
 * @param carried ob der Löscher in der Hand ist
 * @param vr      ob gerade durch die Brille gespielt wird
 */
export function sprayClaimsUse(carried: boolean, vr: boolean): boolean {
  return carried && !vr;
}

/**
 * **Ob der Löscher in diesem Bild an ist** — die eine Stelle, an der die drei
 * Ansichten zusammenkommen.
 *
 * **Warum es je Ansicht verschieden ist.** In der Brille und am Schirm aus den
 * Augen gibt es eine **Hand**, die etwas hält: Man drückt den Trigger
 * (`PlayerRig.trigger`) beziehungsweise die linke Maustaste, und solange man
 * drückt, pustet es. Das ist, was ein Feuerlöscher tut, und man lernt es in
 * einer Sekunde.
 *
 * Von oben gibt es diese Hand nicht. Dort steuert man eine Figur, die irgendwo
 * steht und irgendwohin sieht (`core/usable.ts`, derselbe Absatz), und der
 * einzige Knopf, der in dieser Ansicht überhaupt etwas mit dem meint, was vor
 * der Figur steht, ist `A` (am Schreibtisch `E`). Der ist zugleich der Knopf
 * zum Nehmen, Ablegen und Zusammenlegen — **festhalten** kann man ihn also
 * nicht, ohne dass beim Loslassen irgendwo ein Brötchen abgelegt wird. Von oben
 * schaltet deshalb die **Flanke** um, und das ist genau der Wunsch: „Feuerlöscher
 * bleibt an und pustet Rauch, bis er ausgeschaltet wird."
 *
 * **Und warum es trotzdem eine Funktion bleibt.** Ein Knopf, den man zweimal
 * lernen muss, ist der Fehler; zwei Funktionen, die man zweimal ändern muss,
 * sind es auch. Hier steht die Regel einmal, und was zwischen den Ansichten
 * wirklich verschieden ist, sind drei Zeilen in ihrer Mitte. Gleich ist alles
 * andere: Ohne Löscher in der Hand ist er **immer** aus — wer ihn im Laufen
 * zurück in die Halterung stellt, steht danach nicht mit einem pustenden
 * Nichts da.
 *
 * @param on      ob er im vorigen Bild an war
 * @param pressed die **Flanke** des Benutzen-Knopfes in diesem Bild (von oben: `A`/`E`)
 * @param held    ob der Auslöser **liegt** (Maustaste am Schirm, Trigger in der Brille)
 * @param carried ob der Löscher überhaupt in der Hand ist
 * @param topDown ob gerade von oben gespielt wird (`WorldContext.topDown`)
 */
export function sprayOn(
  on: boolean,
  {
    pressed,
    held,
    carried,
    topDown,
  }: { pressed: boolean; held: boolean; carried: boolean; topDown: boolean },
): boolean {
  if (!carried) return false;
  if (!topDown) return held;
  return pressed ? !on : on;
}

// --- der Fortschritt am Feuer -------------------------------------------------

/** Wie weit ein Herd im Strahl schon gelöscht ist. */
export interface DouseState {
  /** Sekunden, die er schon im Nebel steht. */
  readonly time: number;
}

/** Ein Herd, auf den noch niemand gehalten hat. */
export const DRY: DouseState = { time: 0 };

/** Was ein Bild am brennenden Herd geändert hat. */
export interface DouseTick {
  readonly state: DouseState;
  /** Ob das Feuer in **diesem** Bild ausgegangen ist — genau einmal. */
  readonly out: boolean;
}

/**
 * **Ein Bild lang gepustet** — oder eben nicht, dann fällt der Fortschritt
 * zurück (`DOUSE_COOL`).
 *
 * Der Zustand gehört an den Herd und nicht an den Löscher: Zwei brennende Herde
 * haben zwei Fortschritte, und wer den Strahl schwenkt, lässt einen davon
 * abkühlen, während der andere steigt. Genau deshalb ist er unveränderlich und
 * wird zurückgegeben, wie bei jeder anderen Uhr der Küche (`kitchenClock.ts`).
 *
 * Bei `time >= SPRAY_SECONDS` ist es vorbei: `out` ist einmal `true`, und der
 * Zustand steht wieder auf `DRY`. Der **Rest verfällt** dabei, anders als beim
 * Braten (`kitchenClock.advanceStove`) — dort läuft eine Phase in die nächste,
 * hier kommt keine nächste: Ein gelöschtes Feuer ist gelöscht, und ein
 * Übertrag auf den nächsten Brand wäre ein Vorrat an Löschmittel, den niemand
 * sieht.
 */
export function advanceDouse(state: DouseState, dt: number, hit: boolean): DouseTick {
  // `NaN` käme aus einer Uhr, die noch nie gelaufen ist. Ein Fortschritt, der
  // einmal keine Zahl ist, ist es für immer — und der Herd brennt dann bis zum
  // Verlassen der Zone weiter, ohne dass irgendwo ein Fehler stünde.
  const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;

  if (!hit) {
    const time = Math.max(0, state.time - step * DOUSE_COOL);
    // Ein Herd, an dem sich nichts ändert, behält seinen Zustand — sonst baute
    // jedes Bild für jeden nicht getroffenen Herd ein neues Objekt.
    return { state: time === state.time ? state : { time }, out: false };
  }

  const time = state.time + step;
  if (time < SPRAY_SECONDS) return { state: { time }, out: false };
  return { state: DRY, out: true };
}

/** Der Anteil 0…1 für den Balken über dem brennenden Herd. */
export function douseProgress(state: DouseState): number {
  if (!Number.isFinite(state.time)) return 0;
  return Math.min(1, Math.max(0, state.time / SPRAY_SECONDS));
}

// --- wo der Nebel austritt ----------------------------------------------------

/**
 * **Die Hülle des Feuerlöschers**, in Metern — Breite (x), Höhe (y), Tiefe (z),
 * so wie er in der Hand hängt.
 *
 * Gemessen an `public/models/kitchen.glb`, Knoten `extinguisher`, und zwar nur
 * am Netz mit dem Material `Kitchen_Utensils` — das ist genau das, was
 * `core/kitchenModel.takeUtensil` abnimmt und in die Hand gibt; der Hocker
 * darunter gehört zu `Kitchen_Cabins` und zählt nicht mit. In Quellmaß sind es
 * 1,2325 × 1,4957 × 0,7717, und die Küche halbiert alles beim Laden
 * (`core/kitchenFit.KITCHEN_SCALE` = 0,5).
 *
 * **Warum die Zahlen hier abgeschrieben stehen.** Die Küche misst die Hülle je
 * Gerät im Bild (`kitchen.markHandles`, `kitchen.grabbedAt`) und reicht sie an
 * die Griffe weiter (`kitchenGrab.kitchenHandles`); dem Strahl reicht sie nur
 * den **Ursprung** des Netzes und sonst nichts. Bis `kitchen.spray` auch das
 * Maß mitgibt, steht es hier — mit derselben Ansage wie bei
 * `kitchenGrab.NOZZLE_RADIUS` und `PAN_STALK_RADIUS`, den beiden anderen
 * Zahlen dieser Küche in Zentimetern: **Wer das Modell tauscht, misst hier
 * nach.**
 */
export const EXTINGUISHER_HULL = { width: 0.616, height: 0.748, depth: 0.386 } as const;

/**
 * **Wo die Düse sitzt** — die Mitte ihrer Öffnung, in Anteilen der Hülle und in
 * derselben Form wie `kitchenGrab.NOZZLE_BAR`, an dem die Hand liegt.
 *
 * Gemessen und nicht geschätzt: Das Netz zerfällt in vier zusammenhängende
 * Teile, und man erkennt den Löscher an ihnen wieder — die **Flasche** (`lift`
 * 0,00…0,84), das **Ventil mit dem Tragebügel** (0,79…0,89, `across` bis −1,0:
 * dort liegt die Faust), der **Hebel** darüber (0,90…1,00) und das **Rohr**
 * (`across` 0,32…1,00). Das Rohr ist der vorderste Teil des ganzen Löschers —
 * es gibt der Hülle ihr +x, und genau deshalb zeigt `kitchenGrab.NOZZLE_AHEAD`
 * dorthin —, und sein Mund ist ein Ring aus 24 Punkten um (0,99 | 0,88 |
 * −0,06). Dessen Halbmesser ist knapp 5 cm, also auf den Zentimeter das
 * `PUFF_MIN` weiter unten: Das erste Bällchen ist so groß wie die Öffnung, aus
 * der es kommt.
 *
 * Der Mund liegt damit **knapp unter der Hand** (der Bügel sitzt auf 0,93, also
 * vier Zentimeter höher) und gut 30 cm **vor** ihr. Dass er unter dem Griff
 * liegt und nicht über ihm, ist der Löscher selbst: Man hält ihn oben am
 * Bügel, und das Rohr geht vom Ventil aus zur Seite weg.
 *
 * `shift` bleibt ungerechnet: 6 % der halben Tiefe sind gut ein Zentimeter
 * quer, und um mehr als das wackelt in der Brille jedes Handgelenk je Bild. Er
 * steht trotzdem hier, weil eine Messung ohne ihre dritte Zahl keine Messung
 * ist.
 */
export const NOZZLE_TIP = { across: 0.99, lift: 0.88, shift: -0.06 } as const;

/**
 * **Wie hoch über dem Fuß des Löschers die Düse sitzt** — 66 cm, also gut über
 * seiner Mitte.
 *
 * Das ist der gemeldete Fehler als eine Zahl: Der Nebel kam bisher genau diese
 * 66 cm zu tief heraus, nämlich am Ursprung des Netzes, und der liegt bei jedem
 * Gerät dieser Küche unten in der Mitte (`core/kitchenModel.takeUtensil`). Im
 * Headset sah man deshalb den Rauch **unten aus dem Standring** quellen, nicht
 * oben aus dem Rohr.
 */
export const MUZZLE_LIFT = NOZZLE_TIP.lift * EXTINGUISHER_HULL.height;

/** **Wie weit vor der Achse des Löschers** die Düse steht — gut 30 cm. */
export const MUZZLE_AHEAD = (NOZZLE_TIP.across * EXTINGUISHER_HULL.width) / 2;

/**
 * **Vom Löscher in der Hand zur Düse oben am Rohr.**
 *
 * Gerechnet wird in der Welt und in zwei Schritten: **hinauf** um
 * `MUZZLE_LIFT` und **nach vorn** um `MUZZLE_AHEAD`, entlang derselben
 * waagerechten Richtung, in die auch gezielt wird.
 *
 * **Warum die Welt-Senkrechte und nicht die Achse des Netzes.** Sauber wäre
 * der Versatz im Raum des Löschers, mit seiner Matrix verdreht; dazu müsste
 * der Strahl das Objekt kennen, und er bekommt nur einen Punkt und eine
 * Richtung (`SprayJet.update`). Das ist kein Verlust: Der Löscher **hängt**
 * unter der Faust (`kitchenGrab.extinguisherNeck` legt seine Senkrechte auf
 * die der Hand), und seine Düse zeigt dorthin, wohin die Hand zeigt
 * (`NOZZLE_AHEAD`). Damit sind die beiden Achsen bis auf die Neigung des
 * Handgelenks genau die, die hier stehen — und gerechnet wird ohnehin auf dem
 * Boden (`inSpray`), wo eine Neigung nichts ändert.
 *
 * Eine Richtung **ohne Länge** hebt nur an: Wer senkrecht nach unten sieht,
 * hat keine waagerechte Richtung mehr, und ein Versatz durch Null wäre ein
 * Strahl, der in diesem Bild ins Nichts springt.
 *
 * @param at      der Ursprung des Löschernetzes — unten in seiner Mitte
 * @param forward die waagerechte Richtung; die Länge ist egal
 * @param out     wohin das Ergebnis geschrieben wird (und was zurückkommt)
 */
export function sprayMuzzle(
  at: { x: number; y: number; z: number },
  forward: { x: number; z: number },
  out: THREE.Vector3,
): THREE.Vector3 {
  out.set(at.x, at.y + MUZZLE_LIFT, at.z);
  const length = Math.hypot(forward.x, forward.z);
  if (!(length > 1e-6)) return out;
  out.x += (forward.x / length) * MUZZLE_AHEAD;
  out.z += (forward.z / length) * MUZZLE_AHEAD;
  return out;
}

// --- der Strahl als Bild ------------------------------------------------------

/**
 * **Wie weit der Nebel von der Düse aus noch fliegt**, in Metern — 2,20 m.
 *
 * Die Reichweite gilt ab der **Hand**: `kitchen.spray` misst den Kegel vom
 * Ursprung des Löschers aus (`inSpray(_nozzle, …)`, derselbe Punkt, den auch
 * `sprayMuzzle` bekommt), und die Düse steht davon schon `MUZZLE_AHEAD` = 30 cm
 * entfernt nach vorn. Der Nebel bekommt deshalb nur den Rest — 2,5 − 0,30 m —,
 * und alles, was ihn ausmacht, hängt an dieser Zahl statt an `SPRAY_RANGE`.
 *
 * Ohne diesen Abzug stünde der Nebel am Ende um genau diese 30 cm **vor** dem
 * Kegel, in dem Feuer ausgeht, und die Zusage von `PUFF_FAN` — was man im Weiß
 * stehen sieht, geht auch aus — wäre an der Spitze des Strahls keine mehr.
 */
const PUFF_RANGE = SPRAY_RANGE - MUZZLE_AHEAD;

/**
 * **Wie viele Nebelbällchen der Strahl hat.**
 *
 * Sechsunddreißig, und das ist keine runde Zahl aus Bequemlichkeit: Sie
 * ergibt sich aus der Lebenszeit eines Bällchens (`PUFF_LIFE`, knapp eine halbe
 * Sekunde) und der Bildrate. Bei 60 Bildern je Sekunde startet damit in
 * **jedem Bild** eines vorn neu — dicht genug für einen
 * zusammenhängenden Nebel, dünn genug, dass die Küche davon nichts merkt.
 * Mehr Bällchen machen den Nebel nicht dichter, sondern nur teurer; dichter
 * wird er über die Deckkraft.
 */
const PUFFS = 36;

/**
 * **Wie schnell der Nebel fliegt**, in Metern je Sekunde, und wie lange ein
 * Bällchen deshalb lebt.
 *
 * 4,5 m/s ist knapp doppelte Laufgeschwindigkeit (`PlayerRig.moveSpeed` = 2,6):
 * Der Strahl steht sichtbar **vor** der Figur, statt mit ihr zu wandern, und
 * erreicht seine volle Länge in knapp einer halben Sekunde. Wer den Löscher
 * anmacht, sieht ihn also ausfahren und nicht erscheinen.
 */
const PUFF_SPEED = 4.5;
const PUFF_LIFE = PUFF_RANGE / PUFF_SPEED;

/**
 * **Wie groß ein Bällchen ist**, als Halbmesser in Metern — an der Düse und am
 * Ende seines Weges.
 *
 * 5 cm an der Düse ist die Öffnung des Löschers — nachgemessen, der Mund des
 * Rohrs hat 4,7 cm Halbmesser (`NOZZLE_TIP`) —, 28 cm am Ende sind eine
 * Nebelschwade. Dass es unterwegs wächst, ist der halbe Effekt: Ein Strahl aus
 * gleich großen Kugeln sieht aus wie eine Perlenkette.
 */
const PUFF_MIN = 0.05;
const PUFF_MAX = 0.28;

/**
 * **Wie viel vom gerechneten Kegel der Nebel wirklich ausfüllt.**
 *
 * Drei Fünftel, und die Richtung dieser Zahl ist die Entscheidung: Der Nebel
 * bleibt **innerhalb** dessen, was `inSpray` trifft, und nicht umgekehrt. Was
 * man mitten im Weiß stehen sieht, geht aus — das Versprechen hält nur, wenn
 * das Bild schmaler ist als die Rechnung. Ein Nebel, der über den Kegel
 * hinausquillt, wäre ein Löscher, der sichtbar auf einen Herd hält und ihn
 * nicht löscht.
 *
 * Gerechnet, und zwar an den **Mitten** der Bällchen und ab der **Hand**, weil
 * der Kegel dort seine Spitze hat: 0,6 · tan 25° · 2,20 m (`PUFF_RANGE`) =
 * 0,61 m seitlicher Versatz am Ende, gegen mindestens 0,30 + 1,58 = 1,88 m
 * Abstand (`MUZZLE_AHEAD` plus die kürzeste Wurfweite, 0,72 · `PUFF_RANGE`) —
 * das sind 18,0° und damit sieben Grad Luft im Kegel.
 * Die weiche **Hülle** eines einzelnen Bällchens steht stellenweise darüber
 * hinaus, und das ist richtig so: Nebel hat keine Kante. Sie liegt dort, wo
 * ohnehin nur noch ein einzelnes durchsichtiges Bällchen hängt und niemand
 * sagen würde, der Strahl gehe noch bis dorthin.
 */
const PUFF_FAN = 0.6;
const PUFF_REACH_FAN = PUFF_FAN * Math.tan(SPRAY_HALF_ANGLE) * PUFF_RANGE;

/**
 * **Wie weit ein einzelnes Bällchen kommt** — als Anteil der Reichweite, von
 * `PUFF_REACH_MIN` bis `PUFF_REACH_MIN + PUFF_REACH_SPAN`.
 *
 * Verschieden schnell und nicht alle gleich: Ein Strahl, in dem jedes Bällchen
 * genau gleich weit fliegt, endet auf einer sauberen Linie und sieht aus wie
 * abgeschnitten. Und nie ganz bis ans Ende seines Wegs — 0,88 · 2,20 m
 * (`PUFF_RANGE`) = 1,93 m, ab der Hand also 2,24 m —, damit auch die Hülle des
 * äußersten Bällchens noch innerhalb der 2,5 m liegt, auf die `inSpray` trifft.
 */
const PUFF_REACH_MIN = 0.72;
const PUFF_REACH_SPAN = 0.16;

/**
 * **Wie weit der Nebel am Ende durchhängt**, in Metern.
 *
 * Löschmittel ist schwerer als Luft — es fällt, sobald der Druck heraus ist.
 * 18 cm über die volle Reichweite sind wenig genug, dass der Strahl gerade
 * bleibt, und genug, dass er nicht wie ein Laserstrahl aussieht. Quadratisch
 * mit der Flugzeit, weil das der Fall ist, den man kennt.
 */
const PUFF_DROOP = 0.18;

/**
 * **Ab wann ein Bällchen wieder kleiner wird** — als Anteil seiner Lebenszeit.
 *
 * Siehe `SprayJet`: Das Schrumpfen **ist** hier das Ausblenden.
 */
const PUFF_HOLD = 0.72;

/**
 * **Wie deckend der Nebel ist.**
 *
 * 0,42 je Bällchen, und weil an der Düse ein Dutzend übereinanderliegt, ist
 * der Strahl dort dicht und am Ende, wo sie sich über den halben Kegel
 * verteilen, licht. Genau das ist der Grund, warum **eine** Deckkraft für alle
 * reicht — siehe `SprayJet`.
 */
const PUFF_ALPHA = 0.42;

/** Das Weiß des Löschmittels — kein reines, das wäre im Comic-Licht ein Loch. */
const PUFF_WHITE = 0xeef4fb;

/**
 * **Der weiße Nebel aus dem Löscher** — einer je Zone, ein `dispose`.
 *
 * Gebaut wie die Anzeigen nebenan (`kitchenGauge.KitchenGauges`) und mit
 * denselben drei Regeln:
 *
 * - **Geteilt wird alles.** Eine Kugelform, ein Material, sechsunddreißig
 *   Netze — nicht sechsunddreißig Materialien, die beim Verlassen der Zone
 *   einzeln freigegeben werden wollen.
 * - **Keine Allokation je Bild.** Alles, was ein Bällchen ausmacht, steht in
 *   Feldern fester Länge; `update` rechnet daraus Ort und Größe und legt
 *   nichts an. Ein Effekt, der je Bild sechsunddreißig Vektoren baut, ist ein
 *   Effekt, den man später wieder herausnimmt.
 * - **Wer nichts zeigt, kostet nichts.** Solange nichts läuft und nichts mehr
 *   zu sehen ist, kehrt `update` sofort um, und die Gruppe hängt gar nicht in
 *   der Szene. In einer Küche brennt es selten; den Rest der Zeit ist dieser
 *   Satz ein Vergleich je Bild.
 *
 * **Und wie ein einzelnes Bällchen ausblendet, obwohl alle sich ein Material
 * teilen.** Die Deckkraft steckt im Material, also gibt es genau **eine** für
 * alle — sechsunddreißig eigene Materialien wären sechsunddreißigmal derselbe
 * Shader, nur damit eine Zahl darin verschieden ist. Zwei Auswege standen zur
 * Wahl: eine Handvoll fester Deckkraftstufen als eigene Materialien (vier, fünf
 * Stück, jedes Bällchen springt zwischen ihnen), oder das Ausblenden über
 * `scale`.
 *
 * Es ist `scale` geworden, aus zwei Gründen. Erstens **stimmt** es hier: Ein
 * Bällchen, das auf null zusammenfällt, löst sich auf; eines, das bei halber
 * Deckkraft einfach verschwindet, blitzt. Zweitens entsteht die Dichte dieses
 * Nebels ohnehin nicht im einzelnen Bällchen, sondern aus der **Überlagerung**
 * — an der Düse liegen ein Dutzend übereinander und die Stelle ist fast weiß,
 * am Ende steht jedes für sich und man sieht hindurch. Feste Stufen hätten
 * daran nichts verbessert und vier Materialien mehr gekostet. Das Wachsen und
 * das Schrumpfen sind deshalb dieselbe Zahl: Bis `PUFF_HOLD` wird ein Bällchen
 * größer (der Strahl fächert auf), danach fällt es in sich zusammen.
 */
export class SprayJet {
  /** Woran der Nebel hängt — der Baum der Zone. */
  private readonly parent: THREE.Object3D;

  /**
   * Die Gruppe trägt Ort **und** Richtung der Düse: Darin fliegt jedes
   * Bällchen schlicht nach +z, und der Strahl dreht sich mit einer einzigen
   * Zahl (`rotation.y`) statt mit sechsunddreißig gedrehten Vektoren.
   */
  private readonly group = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];

  private readonly shape: THREE.SphereGeometry;
  private readonly skin: THREE.MeshBasicMaterial;

  /**
   * Was ein Bällchen von den anderen unterscheidet — je ein Feld fester Länge
   * und kein Objekt je Bällchen: Die Schleife in `update` liest Zahlen und
   * folgt keinen Zeigern.
   */
  private readonly ages = new Float32Array(PUFFS);
  private readonly fanX = new Float32Array(PUFFS);
  private readonly fanY = new Float32Array(PUFFS);
  private readonly reach = new Float32Array(PUFFS);

  /** Wie viele Bällchen gerade fliegen — die Zahl, an der `update` umkehrt. */
  private live = 0;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
    this.group.name = 'kitchen-spray';

    // Grob und mit Absicht: Ein Nebelbällchen ist eine weiche weiße Fläche,
    // und ob sie aus 35 oder aus 400 Dreiecken besteht, sieht man ihr bei
    // 0,28 m Halbmesser und halber Deckkraft nicht an.
    this.shape = new THREE.SphereGeometry(1, 7, 5);
    this.skin = new THREE.MeshBasicMaterial({
      color: PUFF_WHITE,
      transparent: true,
      opacity: PUFF_ALPHA,
      // Ohne Tiefenschreiben, weil sich sechsunddreißig durchsichtige Kugeln
      // sonst gegenseitig ausstanzen; ohne Tonwertkurve, damit der Nebel in
      // jedem Licht derselbe ist (`core/graphicsScene.ts` lässt unbeleuchtete
      // Materialien in Ruhe — derselbe Grund wie bei `kitchenGauge.skin`).
      depthWrite: false,
      toneMapped: false,
    });

    for (let i = 0; i < PUFFS; i++) {
      const puff = new THREE.Mesh(this.shape, this.skin);
      puff.name = `kitchen-spray-puff:${i}`;
      // Nebel wirft keinen Schatten und fängt keinen Strahl: Was den Herd
      // trifft, entscheidet `inSpray` und nicht ein Raycaster.
      puff.castShadow = false;
      puff.receiveShadow = false;
      puff.raycast = () => {};
      puff.visible = false;
      this.puffs.push(puff);
      this.group.add(puff);

      // Ein fester, aber ungleichmäßiger Fächer: Der Winkel im Kreis und die
      // Wurfweite stehen einmal fest, damit derselbe Löscher immer denselben
      // Strahl hat und `update` kein `Math.random` je Bild braucht.
      const around = scatter(i * 2) * Math.PI * 2;
      // Die Wurzel verteilt die Bällchen über die **Fläche** des Kreises statt
      // über seinen Halbmesser; ohne sie hockt der halbe Nebel in der Mitte.
      const out = Math.sqrt(scatter(i * 2 + 1));
      this.fanX[i] = Math.cos(around) * out;
      this.fanY[i] = Math.sin(around) * out;
      this.reach[i] = PUFF_RANGE * (PUFF_REACH_MIN + PUFF_REACH_SPAN * scatter(i + 97));
      this.ages[i] = PUFF_LIFE;
    }
  }

  /**
   * **Ein Bild weiter.**
   *
   * @param at      der **Löscher** in Weltkoordinaten — der Ursprung seines
   *                Netzes, unten in seiner Mitte; die Düse darüber rechnet der
   *                Strahl sich selbst aus (`sprayMuzzle`)
   * @param forward die **waagerechte** Richtung; die Länge ist egal
   * @param on      ob gepustet wird; `false` lässt den Rest ausklingen
   *
   * **Die Gruppe wandert nur, solange gepustet wird.** Wer den Löscher
   * ausmacht und weitergeht, zieht sonst die letzte Nebelschwade hinter sich
   * her wie einen Schal. Ausgelaufener Nebel bleibt, wo er ausgestoßen wurde —
   * das kostet nichts und ist der einzige Unterschied, den man sieht.
   */
  update(dt: number, on: boolean, at: THREE.Vector3, forward: THREE.Vector3): void {
    // Der Normalfall in einer Küche, in der es nicht brennt: ein Vergleich.
    if (!on && this.live === 0) return;
    if (on && this.live === 0) this.ignite();

    if (on) this.aim(at, forward);

    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    let live = 0;
    for (let i = 0; i < PUFFS; i++) {
      const puff = this.puffs[i]!;
      let age = this.ages[i]! + step;
      if (age >= PUFF_LIFE) {
        if (!on) {
          // Durchgeflogen und niemand pustet mehr: Es bleibt genau auf der
          // Lebenszeit stehen — und beim nächsten Anmachen fängt es damit
          // sauber wieder vorn an, statt einen Rest von zwölf Sekunden
          // mitzuschleppen.
          this.ages[i] = PUFF_LIFE;
          puff.visible = false;
          continue;
        }
        age -= PUFF_LIFE;
      }
      this.ages[i] = age;
      live++;

      // Noch nicht geboren: Beim Anmachen starten die Bällchen versetzt, damit
      // der Strahl ausfährt und nicht auf einen Schlag dasteht.
      if (age < 0) {
        puff.visible = false;
        continue;
      }

      const t = age / PUFF_LIFE;
      const fan = PUFF_REACH_FAN * t;
      puff.position.set(
        this.fanX[i]! * fan,
        this.fanY[i]! * fan - PUFF_DROOP * t * t,
        this.reach[i]! * t,
      );
      const grow = PUFF_MIN + (PUFF_MAX - PUFF_MIN) * t;
      const fade = t < PUFF_HOLD ? 1 : 1 - (t - PUFF_HOLD) / (1 - PUFF_HOLD);
      puff.scale.setScalar(grow * fade);
      puff.visible = fade > 0.02;
    }

    this.live = live;
    // Der letzte Rest ist durch: Die Gruppe hängt sich selbst ab, und das
    // nächste `update` kehrt wieder bei der ersten Zeile um.
    if (live === 0) this.group.removeFromParent();
  }

  /**
   * **Alles ab und alles weg** — beim Verlassen der Zone.
   *
   * Zweimal zu rufen ist kein Fehler: `dispose` auf einer Geometrie und einem
   * Material ist in three.js gutmütig, und ein `dispose`, nach dem ein zweiter
   * Aufruf abstürzt, ist eine Falle (dieselbe Zusage wie bei
   * `kitchenGauge.KitchenGauges`).
   */
  dispose(): void {
    this.group.removeFromParent();
    this.live = 0;
    for (let i = 0; i < PUFFS; i++) {
      this.ages[i] = PUFF_LIFE;
      this.puffs[i]!.visible = false;
    }
    this.shape.dispose();
    this.skin.dispose();
  }

  // --- gerechnet wird hier ----------------------------------------------------

  /** Angemacht: Die Gruppe kommt in die Szene, die Bällchen starten versetzt. */
  private ignite(): void {
    for (let i = 0; i < PUFFS; i++) {
      // Negativ heißt „kommt gleich": Über die Lebenszeit verteilt startet
      // eines nach dem anderen, und der Strahl wächst nach vorn heraus.
      this.ages[i] = -(i / PUFFS) * PUFF_LIFE;
    }
    this.live = PUFFS;
    this.parent.add(this.group);
  }

  /**
   * **Die Düse an ihren Platz und in ihre Richtung.**
   *
   * **Der Platz ist die Düse und nicht der Löscher** (`sprayMuzzle`): Was
   * hereinkommt, ist der Ursprung des Netzes und liegt damit an seinem Fuß —
   * daher kam der Nebel bis eben unten heraus. Gehoben wird deshalb **vor** dem
   * Umrechnen, solange die Zahlen noch in der Welt stehen; danach ist „oben"
   * das Oben der Zone und nicht mehr das der Welt.
   *
   * Beides im Raum des Elternteils, und die Richtung deshalb über zwei Punkte
   * und nicht über den Vektor selbst: Eine Zone kann gedreht stehen, und ein
   * Richtungsvektor, den man durch `worldToLocal` schiebt, bekommt deren
   * Verschiebung mit dazu. Die Differenz zweier verwandelter Punkte hat sie
   * nicht (derselbe Kniff wie in `kitchenGauge.update` für die Kamera, nur für
   * eine Richtung).
   */
  private aim(at: THREE.Vector3, forward: THREE.Vector3): void {
    sprayMuzzle(at, forward, _at);
    _tip.copy(_at).add(forward);
    this.parent.worldToLocal(_at);
    this.parent.worldToLocal(_tip);

    const dx = _tip.x - _at.x;
    const dz = _tip.z - _at.z;
    this.group.position.copy(_at);
    // Eine Drehung um die Hochachse bildet das eigene +z auf (sin, cos) ab —
    // also ist der Gierwinkel genau `atan2(dx, dz)`. Ohne waagerechte Richtung
    // bleibt der Strahl stehen, wie er stand; er rundum zu drehen wäre der
    // Löscher, der sich beim Blick auf die eigenen Füße selbst löscht.
    if (Math.hypot(dx, dz) > 1e-6) this.group.rotation.y = Math.atan2(dx, dz);
  }
}

/**
 * **Eine feste Streuung** zu einer Nummer — dasselbe Bällchen bekommt immer
 * dieselbe.
 *
 * Kein `Math.random`, und das ist kein Geschmack: Ein Strahl, der sich bei
 * jedem Anmachen anders auffächert, lässt sich nicht nachstellen, und ein Test,
 * der seine Form prüft, wäre eine Wette. Der Sinus-Trick ist der billigste
 * Weg zu Zahlen, die aussehen wie gewürfelt und es nicht sind.
 */
function scatter(i: number): number {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _at = new THREE.Vector3();
const _tip = new THREE.Vector3();
