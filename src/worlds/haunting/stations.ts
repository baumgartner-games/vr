import { pickHost, type HostCandidate } from '../../net/host';

/**
 * **Der Van: mehr Stationen als Spieler.**
 *
 * Das ist keine Sparmaßnahme, sondern die Spannungsquelle des ganzen
 * Web-Teils. Es gibt vier Geräte und meistens zwei oder drei Leute davor; die
 * eigentliche Entscheidung des Abends ist deshalb nie „was tue ich", sondern
 * **„was lassen wir gerade unbeobachtet"**. Eine unbesetzte Station läuft
 * weiter — das Monster wandert weiter über den Späherschirm, nur sieht
 * niemand hin.
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
 * nehm den Hacker". Genau dieses Zurufen ist das Spiel.
 *
 * **Und dann ist da noch der Fernseher** (`watch`). Er ist kein fünftes Gerät,
 * sondern ein Fenster: das ganze Haus von schräg oben, bei Tag, mit allem
 * darin. Er gehört nicht ins Spiel, sondern in den Raum — für die, die
 * zusehen, während vier andere sich anschreien. Deshalb ist er der einzige
 * Platz, an dem **mehrere gleichzeitig** sitzen dürfen (`shared`): Wer nichts
 * bedient, nimmt niemandem etwas weg.
 */
export type StationId = 'archive' | 'scout' | 'drone' | 'hack' | 'watch';

export interface StationFacts {
  id: StationId;
  label: string;
  /** Eine Zeile, die sagt, was man hier tut. */
  tagline: string;
  /** Was diese Station sieht — und was ausdrücklich nicht. */
  sees: string;
  /** Ob dafür die Welt gezeichnet werden muss (der Hacker sieht kein Bild). */
  view: boolean;
  /**
   * **Ob mehrere gleichzeitig daran dürfen.**
   *
   * Die vier Geräte sind mit Absicht einzeln: Der Streit darum ist das Spiel.
   * Der Fernseher ist kein Gerät, sondern ein Fenster — wer davorsteht,
   * nimmt niemandem etwas weg, und ein Schubser zwischen zwei Zuschauern wäre
   * eine Regel ohne Sache dahinter.
   */
  shared?: boolean;
}

export const STATIONS: readonly StationFacts[] = [
  {
    id: 'archive',
    label: 'Archiv',
    tagline: 'Aufträge, Fundorte und Freigabecodes',
    sees: '2D-Stationsplan, Aufträge, Fundorte und Codes — keine Live-Positionen',
    view: false,
  },
  {
    id: 'scout',
    label: 'Einsatzkontrolle',
    tagline: 'Radar, Puls, Licht und Türen',
    sees: 'Bewegungsradar, Anzugtelemetrie und Systemschalter — keine Fundorte',
    view: false,
  },
  {
    id: 'drone',
    label: 'Drohne',
    tagline: 'Ein Zimmer, jetzt, vollständig',
    sees: 'alles im Zimmer, in dem sie steht — sonst nichts',
    view: true,
  },
  {
    id: 'watch',
    label: 'Zuschauer',
    tagline: 'Die ganze Station, beleuchtet',
    sees: 'alles — und darf deshalb nichts sagen',
    view: true,
    shared: true,
  },
];

export function stationFacts(id: StationId): StationFacts {
  // Old peers can still announce `hack`; all current menus use Einsatzkontrolle.
  return STATIONS.find((one) => one.id === (id === 'hack' ? 'scout' : id)) ?? STATIONS[0]!;
}

export function isStation(value: unknown): value is StationId {
  return value === 'hack' || STATIONS.some((one) => one.id === value);
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
 * Für die Kachel im Van: Bei den vier einzelnen ist die Zahl immer null oder
 * eins und die Kachel sagt einen Namen; vor dem Fernseher sagt sie „zu dritt".
 */
export function crowdAt(claims: readonly Claim[], station: StationId): number {
  return claims.filter((claim) => claim.station === station).length;
}

/** Wer wo sitzt — für die Kachelübersicht im Van. */
export function seating(claims: readonly Claim[]): Map<StationId, string> {
  const out = new Map<StationId, string>();
  for (const station of STATIONS) {
    const owner = ownerOf(claims, station.id);
    if (owner) out.set(station.id, owner);
  }
  return out;
}
