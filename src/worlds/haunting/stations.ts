import { pickHost, type HostCandidate } from '../../net/host';

/**
 * **Die Einsatzzentrale: drei Stühle, ein Fernseher, ein Monster.**
 *
 * Das ist keine Sparmaßnahme, sondern die Spannungsquelle des ganzen
 * Web-Teils. Es gibt mehr Geräte als Leute davor; die
 * eigentliche Entscheidung des Abends ist deshalb nie „was tue ich", sondern
 * **„was lassen wir gerade unbeobachtet"**. Eine unbesetzte Station läuft
 * weiter — die Peilung des Spähers kommt weiter alle dreieinhalb Sekunden,
 * nur sieht niemand hin.
 *
 * **Wem ein Gerät gehört, entscheidet die Sitzdauer** — dieselbe Regel, mit
 * der die Welt ihren Gastgeber wählt (`net/host.ts`), und aus demselben Grund:
 * Sie kommt ohne Absprache und ohne Server aus, weil jeder seine eigene Dauer
 * kennt und ansagt, und Dauern wachsen auf allen Uhren gleich schnell. Wer
 * sich auf ein besetztes Gerät setzt, wird **weggeschubst** — er verliert
 * Zeit, aber nichts, was er schon weiß.
 *
 * **Ein Wechsel dauert, und man sieht ihn kommen.** Ohne die Laufzeit wäre der
 * Griff nach demselben Gerät ein Rennen, das der mit dem schnelleren Handy
 * gewinnt — unsichtbar und ärgerlich. Mit ihr wird daraus eine Verhandlung:
 * Zwei sehen sich auf dasselbe Terminal zulaufen, und einer ruft „geh du, ich
 * nehm die Schalttafel". Genau dieses Zurufen ist das Spiel.
 *
 * **Und dann ist da noch der Fernseher** (`watch`). Er ist kein weiteres Gerät,
 * sondern ein Fenster: das ganze Haus von schräg oben, bei Tag, mit allem
 * darin. Er gehört nicht ins Spiel, sondern in den Raum — für die, die
 * zusehen, während die anderen sich anschreien. Deshalb ist er der einzige
 * Platz, an dem **mehrere gleichzeitig** sitzen dürfen (`shared`): Wer nichts
 * bedient, nimmt niemandem etwas weg.
 *
 * **Und die letzte Station ist die Gegenseite** (`monster`). Wer hier sitzt,
 * spielt nicht mit der Crew, sondern gegen sie: Stock und zwei Knöpfe, die
 * Karte nur aus dem, was das Monster sieht und hört (`monster/`). Die
 * Eingaben gehen über die Leitung zum Gastgeber, der das Monster weiter
 * rechnet (`net.ts`, `monster/netMonsterControl.ts`). Ein Gerät, nicht
 * `shared` — ein Monster, nicht mehrere.
 */
export type StationId = 'red' | 'yellow' | 'blue' | 'watch' | 'monster';

/**
 * **Die Geräte heißen wie die Stühle** — Rot, Gelb, Blau — und nicht mehr
 * wie die Fähigkeiten. Bis hierher *war* jede Fähigkeit ein Gerät
 * (`archive`, `scout`, `hack`), und wer zwei hielt, saß auf zwei Geräten. Jetzt
 * ist der Stuhl das Gerät, und welche Karten darauf liegen, sagt die Tafel
 * (`rules/roundSetup.Seat.powers`). Das Wegschubsen bleibt als Regel bestehen
 * — es ist eine Metapher für „einer je Stuhl", nicht mehr.
 */
export const COLOUR_STATIONS: readonly StationId[] = ['red', 'yellow', 'blue'];

/**
 * **Was die Sitzordnung von einem Gerät wissen muss** — und mehr steht hier
 * nicht.
 *
 * Wie eine Rolle heißt, was sie tut und was sie ausdrücklich *nicht* sieht,
 * steht bei der Rolle selbst (`registry/roles.ts`, angemeldet aus
 * `views/*.register.ts` und `monster/monster.register.ts`). Diese Datei kennt
 * nur die Stühle: welche es gibt, wem einer gehört und wie lange der Weg zum
 * nächsten dauert. Zwei Listen mit denselben Beschriftungen wären zwei Listen,
 * von denen eine irgendwann falsch ist.
 */
export interface StationFacts {
  id: StationId;
  /**
   * **Ob mehrere gleichzeitig daran dürfen.**
   *
   * Die Geräte sind mit Absicht einzeln: Der Streit darum ist das Spiel.
   * Der Fernseher ist kein Gerät, sondern ein Fenster — wer davorsteht,
   * nimmt niemandem etwas weg, und ein Schubser zwischen zwei Zuschauern wäre
   * eine Regel ohne Sache dahinter.
   */
  shared?: boolean;
}

export const STATIONS: readonly StationFacts[] = [
  { id: 'red' },
  { id: 'yellow' },
  { id: 'blue' },
  { id: 'watch', shared: true },
  { id: 'monster' },
];

export function stationFacts(id: StationId): StationFacts {
  return STATIONS.find((one) => one.id === id) ?? STATIONS[0]!;
}

export function isStation(value: unknown): value is StationId {
  return STATIONS.some((one) => one.id === value);
}

/** Wie lange man von einem Gerät zum nächsten braucht, in Sekunden. */
export const MOVE_TIME = 2.5;
/** Und wie lange man am Boden liegt, wenn jemand schneller war. */
export const SHOVE_TIME = 5;

/** Was ein Spieler über seinen Platz ansagt. */
export interface Claim extends HostCandidate {
  station: StationId;
}

/**
 * Wem dieses Gerät gehört: wer am längsten davorsitzt.
 *
 * @returns die Peer-Id, oder `''`, wenn niemand daran sitzt.
 */
export function ownerOf(claims: readonly Claim[], station: StationId): string {
  return pickHost(claims.filter((claim) => claim.station === station));
}

/** Woran dieser Spieler wirklich sitzt — `null`, wenn er weggeschubst wurde. */
export function seatOf(claims: readonly Claim[], peer: string): StationId | null {
  const mine = claims.find((claim) => claim.id === peer);
  if (!mine) return null;
  // Vor dem Fernseher wird niemand weggeschubst: Da ist Platz.
  if (stationFacts(mine.station).shared) return mine.station;
  return ownerOf(claims, mine.station) === peer ? mine.station : null;
}

/**
 * Ob dieser Spieler gerade nach einem Platz greift, der einem anderen gehört.
 *
 * Getrennt von `seatOf`, weil beides gleich aussieht und Verschiedenes
 * bedeutet: „nirgends angemeldet" ist der Anfang einer Runde, „angemeldet und
 * verloren" ist der Schubser. Nur das zweite kostet Zeit.
 */
export function shoved(claims: readonly Claim[], peer: string): boolean {
  const mine = claims.find((claim) => claim.id === peer);
  if (!mine) return false;
  if (stationFacts(mine.station).shared) return false;
  return ownerOf(claims, mine.station) !== peer;
}

/**
 * Wie viele gerade an einem Gerät sitzen.
 *
 * Für die Kachel in der Einsatzzentrale: Bei den einzelnen Geräten ist die
 * Zahl immer null oder eins und die Kachel sagt einen Namen; vor dem
 * Fernseher sagt sie „zu dritt".
 */
export function crowdAt(claims: readonly Claim[], station: StationId): number {
  return claims.filter((claim) => claim.station === station).length;
}

/** Wer wo sitzt — für die Kachelübersicht in der Einsatzzentrale. */
export function seating(claims: readonly Claim[]): Map<StationId, string> {
  const out = new Map<StationId, string>();
  for (const claim of claims) {
    if (out.has(claim.station)) continue;
    const owner = ownerOf(claims, claim.station);
    if (owner) out.set(claim.station, owner);
  }
  return out;
}
