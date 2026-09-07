/**
 * **Wem die Zuschauerkamera gerade zusieht** — und zwar auch dann, wenn er
 * gerade woanders steht.
 *
 * Zwei Fragen sehen gleich aus und sind es nicht: *Wen meint das Zuschauen?*
 * und *Von wem gibt es hier eine Pose?* Die zweite hat die Welt als Bedingung —
 * eine Kamera kann nur in einem Kopf sitzen, der in derselben Welt steht wie
 * man selbst. Die erste darf sie nicht haben: Wer durch ein Portal in eine
 * andere Welt geht, hört nicht auf, der zu sein, dem man zusieht — sonst
 * bliebe das Bild in dem Moment stehen, in dem es spannend wird, und niemand
 * erführe, warum.
 *
 * Deshalb steht die Wahl hier für sich, ohne three.js und ohne Netz:
 *
 * - **Wer ausgesucht wurde, gilt** — in jeder Welt, auch in einer anderen.
 * - **Ohne Wahl** gilt der erste VR-Spieler; er ist der, dem man auf dem
 *   flachen Bildschirm zusieht. Und zwar zuerst unter denen, die hier stehen:
 *   Wer schon da ist, ist der wahrscheinlichere Zuschauergegenstand als
 *   jemand zwei Welten weiter. Ist hier niemand, gilt der erste VR-Spieler
 *   überhaupt — dann ist die Welt gerade leer, weil er sie verlassen hat.
 */

export interface WatchCandidate {
  id: string;
  /** `vr`, `desktop`, `handheld` — zusehen will man in der Regel einem in VR. */
  role: string;
  world: string;
}

/**
 * @param peers  alle Mitspieler der Sitzung, in beliebiger Welt.
 * @param wanted die ausgesuchte Id, oder `null` für „der erste VR-Spieler".
 * @param here   die Welt, in der man selbst steht.
 */
export function pickWatched<T extends WatchCandidate>(
  peers: readonly T[],
  wanted: string | null,
  here: string,
): T | null {
  if (wanted) return peers.find((peer) => peer.id === wanted) ?? null;
  return firstVr(peers.filter((peer) => peer.world === here)) ?? firstVr(peers);
}

/** Der erste VR-Spieler einer Liste — und wenn keiner dabei ist, der erste. */
function firstVr<T extends WatchCandidate>(peers: readonly T[]): T | null {
  return peers.find((peer) => peer.role === 'vr') ?? peers[0] ?? null;
}
