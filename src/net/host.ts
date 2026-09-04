/**
 * Wer die geteilte Welt rechnet — und warum nicht mehr die kleinste Id.
 *
 * Einer muss die Physik simulieren und die Ergebnisse verteilen, sonst rechnen
 * zwei Rechner dasselbe Kistenstapel-Chaos verschieden. Das war bisher der
 * Spieler mit der **kleinsten Peer-Id**: Jeder kann das ausrechnen, es braucht
 * keine Wahl und keinen Server. Nur ist die Id gewürfelt, und damit war die
 * Antwort auf „wer rechnet?" ebenfalls gewürfelt — wer dazukam, übernahm mit
 * einer Wahrscheinlichkeit von 50 % die Welt eines anderen und schob ihm im
 * selben Moment seinen eigenen (leeren) Stand hinüber.
 *
 * Jetzt entscheidet die **Dauer**: Wer am längsten in dieser Welt steht, rechnet
 * sie. Das ist die Regel, die man ohnehin erwartet — man kommt in einen Raum
 * hinein, nicht in einen anderen hinüber —, und sie ist genauso ohne
 * Absprache auszurechnen wie die alte, weil jeder seine eigene Standzeit kennt
 * und ansagt.
 *
 * **Warum eine Dauer und kein Zeitpunkt:** Zwei Rechner sind sich über die
 * Uhrzeit nie einig, über die Länge einer Minute schon. Ein „ich bin seit 300
 * Sekunden hier" ist auf jeder Uhr dasselbe, ein „ich bin seit 14:07 hier"
 * nicht.
 *
 * Bei exakt gleicher Standzeit — zwei, die gleichzeitig hereinkommen —
 * entscheidet weiterhin die kleinste Id. Irgendetwas muss entscheiden, und es
 * muss auf beiden Seiten dasselbe sein.
 *
 * Ohne three.js und ohne Netz, damit die Regel für sich geprüft werden kann.
 */

export interface HostCandidate {
  id: string;
  /** Wie lange dieser Spieler schon in dieser Welt steht, in Sekunden. */
  seniority: number;
}

/**
 * Der Gastgeber unter den Anwesenden — dieselbe Antwort auf jedem Gerät.
 *
 * @param candidates alle in derselben Welt, einen selbst eingeschlossen.
 * @returns die Id, oder `''`, wenn niemand da ist (dann gibt es auch nichts zu
 *          rechnen).
 */
export function pickHost(candidates: readonly HostCandidate[]): string {
  let best: HostCandidate | null = null;
  for (const candidate of candidates) {
    if (!best || isSenior(candidate, best)) best = candidate;
  }
  return best?.id ?? '';
}

/**
 * Ob `a` vor `b` drankommt: länger da, und bei gleicher Standzeit die kleinere
 * Id.
 *
 * Gerundet wird auf ein Zehntel — Standzeiten kommen über das Netz und werden
 * lokal hochgezählt, und zwei Zahlen, die sich um eine Millisekunde
 * unterscheiden, sollen nicht dauernd den Gastgeber hin- und herschieben.
 */
function isSenior(a: HostCandidate, b: HostCandidate): boolean {
  const difference = Math.round((a.seniority - b.seniority) * 10);
  if (difference !== 0) return difference > 0;
  return a.id < b.id;
}
