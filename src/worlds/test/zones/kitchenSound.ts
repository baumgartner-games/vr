/**
 * **Die Rechnung hinter den Küchengeräuschen** — ohne three.js, ohne Web Audio,
 * ohne Zone.
 *
 * Eine eigene Datei neben Uhr (`kitchenClock.ts`) und Arbeit
 * (`kitchenWork.ts`), aus demselben Grund wie dort: Was in der Küche klingt,
 * hängt an Zahlen, die niemand hört, bevor sie falsch sind. Wie laut ein Feuer
 * drei Kacheln weiter noch ist und wie oft das Messer aufschlägt — das sind
 * zwei Rechnungen, die ein Test nachrechnen kann, und die erste davon merkt
 * man im Headset erst, wenn die halbe Küche gleich laut ist.
 *
 * **Was hier nicht steht, ist Web Audio.** Die Datei kennt keinen Kontext,
 * keinen Knoten und keine Datei; sie sagt nur, welcher Ton wann, wie laut und
 * von welcher Seite kommen soll. Das Abspielen steht nebenan
 * (`kitchenAudio.ts`), und der Schnitt liegt da, wo er in dieser Küche überall
 * liegt: Rechnung hier, Darstellung dort.
 */

import { TILE } from '../../nav/navTile';
import { FIELD, KITCHEN } from '../layout';

import type { KitchenDeed, StationKind } from './kitchenCarry';

/**
 * **Die Taten der Küche**, wie `kitchenCarry.kitchenDeed` sie ausgibt — nur
 * ihre Namen, nicht ihre Ladung.
 *
 * Abgeleitet und nicht abgeschrieben: Eine zweite Aufzählung derselben elf
 * Wörter wäre die Liste, die beim zwölften auseinanderläuft.
 */
export type DeedKind = KitchenDeed['do'];

/**
 * **Die Töne der Küche** — eine vollständige Liste, und jeder Eintrag steht
 * für genau ein Ereignis des Spiels.
 *
 * Sie ist ein Union und keine Zeichenkette, damit die Tabelle darunter
 * (`KITCHEN_CUES`) **vollständig** sein muss: Wer einen Ton dazutut, bekommt
 * vom Übersetzer die Frage gestellt, welche Datei dazugehört und ob sie eine
 * Schleife ist — derselbe Gedanke wie bei `kitchenCarry.STATION_WORK`.
 */
export type KitchenCue =
  /** Das Messer auf dem Brett — und dieselbe Klinge im Mixer. */
  | 'chop'
  /** Die Pfanne auf dem Herd und die Platte der Kochstelle: eine Schleife. */
  | 'sizzle'
  /** Der Hahn, der den Topf füllt. */
  | 'water'
  /** Das Becken, solange darin gespült wird: dieselbe Aufnahme als Schleife. */
  | 'rinse'
  /** Zwei Zutaten werden eine — von Hand oder im Kombinierer. */
  | 'combine'
  /** Eine Kiste gibt etwas heraus. */
  | 'crate'
  /** Das Warndreieck: Es qualmt, gleich brennt es. */
  | 'warn'
  /** Der Herd brennt: eine Schleife, solange er es tut. */
  | 'fire'
  /** Der Feuerlöscher sprüht: eine Schleife, solange der Trigger gehalten wird. */
  | 'spray'
  /** Und das Feuer ist aus. */
  | 'douse'
  /** Ein Gericht geht über die Theke. */
  | 'serve'
  /** Etwas wird abgestellt. */
  | 'place'
  /** Und etwas wird aufgenommen. */
  | 'pick'
  /** Das Radio (`kitchenRadio.ts`): Musik, solange es an ist. */
  | 'radio';

/** Wo die Dateien liegen — unter `public/`, also unmittelbar neben der Seite. */
export const SOUND_DIR = 'audio/kitchen/';

/**
 * **Welcher Ton zu welcher Tat gehört** — eine Zeile je Tat, `null` für die,
 * die stumm bleiben.
 *
 * Eine **vollständige** Tabelle über `KitchenDeed['do']`, und deshalb steht
 * sie hier und nicht als `if`-Kette in der Zone (dieselbe Entscheidung wie bei
 * `kitchenCarry.STATION_WORK`): Wer eine Tat dazutut, bekommt vom Übersetzer
 * die Frage gestellt, wie sie klingt — und muss sie beantworten, statt sie zu
 * übersehen. Genau eine Stelle in der Zone spielt daraufhin ab
 * (`kitchen.act`), und nicht elf.
 *
 * **`refuse` und `nothing` sind mit Absicht still.** Ein abgelehnter Griff
 * trägt seinen Satz schon mit sich (`kitchenCarry.KitchenDeed`), und ein Ton
 * dazu wäre ein Fehlersummer, den man nach dem dritten Mal nicht mehr hören
 * will.
 *
 * **Und `douse` ebenfalls**, obwohl es zu hören ist: Das Feuer geht auf zwei
 * Wegen aus — mit `A` am Herd und mit dem Strahl des Löschers quer durch die
 * Küche —, und beide laufen durch `kitchen.putOut`. Dort steht der Ton, und
 * damit genau einmal.
 */
export const DEED_SOUNDS: Readonly<Record<DeedKind, KitchenCue | null>> = {
  take: 'pick',
  place: 'place',
  work: 'place',
  combine: 'combine',
  fill: 'water',
  trash: 'place',
  // **Zurücklegen klingt wie Herausholen**, und das ist keine Sparsamkeit: Es
  // ist dieselbe Kistenklappe, nur andersherum — siehe `deedSound`.
  stow: 'crate',
  scrape: 'place',
  serve: 'serve',
  douse: null,
  // **Und die Zange klingt beim Ansetzen nach nichts.** Das Becken rauscht in
  // diesem Augenblick ohnehin (`kitchen.listen` schickt ein spritzendes Becken
  // in dieselbe Schleife wie ein spülendes), und ein Klick darüber wäre ein
  // Ton, den niemand hört. Zu hören ist dafür das **Ende**: Wenn es dicht ist,
  // hört das Rauschen auf, und genau daran merkt man es auch, ohne hinzusehen.
  repair: null,
  refuse: null,
  nothing: null,
};

/**
 * **Der Ton einer Tat an dieser Station** — die Tabelle, mit einer Ausnahme.
 *
 * Die Ausnahme ist die **Kiste**: Etwas aus einer Vorratskiste zu holen ist
 * kein Griff auf eine Fläche, sondern eine Klappe, die aufgeht — und es ist
 * der Handgriff, mit dem in dieser Küche jede Zutat anfängt. Er klingt
 * deshalb anders als das Aufnehmen eines Tellers, obwohl beides `take` heißt.
 *
 * **Beide Kistenarten** klingen gleich: die Ablage, die etwas hergibt
 * (`box` — heute die Ausgabe an der Theke), und die Kiste, auf der nichts
 * steht (`crate` — die vier Vorratskisten und die Tellerkiste,
 * `kitchenCarry.StationKind`). Der Unterschied zwischen ihnen ist, was man
 * darauf abstellen darf, und nicht, wie es klingt.
 */
export function deedSound(deed: DeedKind, station: StationKind): KitchenCue | null {
  if (deed === 'take' && (station === 'box' || station === 'crate')) return 'crate';
  return DEED_SOUNDS[deed];
}

/**
 * **Die Töne, über die noch nicht entschieden ist** — und die Auswahl, die
 * dazu in der Küche steht.
 *
 * Zwei Geräusche haben ihren endgültigen Klang noch nicht gefunden: das
 * **Messer auf dem Brett** und die **Abgabe eines Gerichts**. Bei beiden hilft
 * kein Nachdenken, sondern nur Hinhören, und Hinhören heißt in dieser Küche:
 * im Headset danebenstehen. Deshalb steht die Entscheidung nicht in dieser
 * Datei, sondern auf zwei Knöpfen im Schauraum (`kitchen.addTrialButtons`) —
 * einer schaltet weiter, einer spielt vor.
 *
 * **Eine Variante ist ein Satz und keine Datei.** Das Messer schlägt siebenmal
 * je Schnitt auf (`CHOP_BEAT`); ein Satz aus drei Aufnahmen klingt dabei nach
 * Arbeit, eine einzelne nach Maschine. Die Abgabe kommt dagegen einmal und
 * soll wiedererkennbar sein — dort ist ein Satz genau eine Aufnahme. Beides
 * ist dieselbe Liste, aus demselben Grund wie bei `KitchenCueSpec.files`.
 *
 * **Die erste Variante ist die, die läuft**, bis jemand weiterschaltet; sie
 * steht deshalb auch in `KITCHEN_CUES`. Ist die Wahl gefallen, bleibt von
 * diesem Abschnitt eine Zeile übrig — der Satz, der gewonnen hat — und der
 * Rest fällt mitsamt den Knöpfen wieder heraus.
 */
export type TrialCue = 'chop' | 'serve';

/** Beide, einmal — für die Knöpfe und für die Tests. */
export const TRIAL_CUES: readonly TrialCue[] = ['chop', 'serve'];

/** Eine Variante: wie sie heißt und woraus sie besteht. */
export interface SoundTrial {
  /** Was auf dem Schild des Knopfes steht — danach wird sie benannt. */
  readonly label: string;
  /** Die Aufnahmen, relativ zu `SOUND_DIR`, wie bei `KitchenCueSpec.files`. */
  readonly files: readonly string[];
}

export const SOUND_TRIALS: Readonly<Record<TrialCue, readonly SoundTrial[]>> = {
  chop: [
    // Was bisher lief: ein Hieb aus einem Spielesatz und zwei aus einer echten
    // Küche — gemischt, und genau deshalb nicht aus einem Guss.
    { label: 'Messer und Brett', files: ['chop-0.ogg', 'chop-1.ogg', 'chop-2.ogg'] },
    // Derselbe Mitschnitt, aber nur er: vier Hiebe auf dasselbe Holz, länger
    // geschnitten, damit das Brett nachklingt.
    {
      label: 'Küchenbrett',
      files: ['chop-board-0.ogg', 'chop-board-1.ogg', 'chop-board-2.ogg', 'chop-board-3.ogg'],
    },
    // Und dumpfes Holz statt Klinge: tiefer, weicher, näher am Hackblock.
    { label: 'Hackblock', files: ['chop-wood-0.ogg', 'chop-wood-1.ogg', 'chop-wood-2.ogg'] },
  ],
  serve: [
    // Die Glocke auf der Theke — das Geräusch, das eine Ausgabe in jedem
    // Imbiss macht.
    { label: 'Tresenglocke', files: ['serve-bell.ogg'] },
    // Ein Takt Steeldrum: kurz, freundlich, und keine Fanfare.
    { label: 'Steeldrum', files: ['serve-steel.ogg'] },
    // Und ein Saxofonstoß, für den Fall, dass es doch Musik sein soll.
    { label: 'Saxofon', files: ['serve-sax.ogg'] },
  ],
};

/**
 * **Die Variante an dieser Stelle der Liste** — im Kreis und ohne Absturz.
 *
 * Die Zahl kommt von einem Knopf, der immer weiterzählt und nie zurücksetzt
 * (`nextTrial`); dass sie irgendwann über das Ende hinausläuft, ist der
 * Normalfall und kein Fehler.
 */
export function trialAt(cue: TrialCue, index: number): SoundTrial {
  const list = SOUND_TRIALS[cue];
  const safe = Number.isFinite(index) ? Math.floor(index) : 0;
  return list[((safe % list.length) + list.length) % list.length]!;
}

/** Und die nächste — der Druck auf den linken Knopf. */
export function nextTrial(cue: TrialCue, index: number): number {
  const safe = Number.isFinite(index) ? Math.floor(index) : 0;
  return (
    (((safe + 1) % SOUND_TRIALS[cue].length) + SOUND_TRIALS[cue].length) % SOUND_TRIALS[cue].length
  );
}

/** Was zu einem Ton gehört. */
export interface KitchenCueSpec {
  /**
   * **Die Aufnahmen**, relativ zu `SOUND_DIR`.
   *
   * Bei einem einmaligen Ton sind mehrere davon **Varianten**, aus denen
   * zufällig gewählt wird — zehn Schritte sollen nicht zehnmal derselbe
   * Schritt sein. Bei einer Schleife sind sie **Sender**: Das Radio
   * (`kitchenRadio.ts`) sagt ausdrücklich, welche laufen soll, und würfelt
   * nicht. Beides ist dieselbe Liste, weil beides dasselbe ist — mehr als
   * eine Aufnahme für einen Ton.
   */
  readonly files: readonly string[];
  /** Spitzenlautstärke am Ort des Geschehens, 0…1. */
  readonly gain: number;
  /** Ob der Ton läuft, solange etwas gilt — statt einmal zu klingen. */
  readonly loop: boolean;
  /**
   * **Wie weit er trägt** — fehlt er, gilt `NEARBY`: ein Handgriff, den man
   * dort hört, wo er geschieht.
   *
   * Drei Töne sind keine Handgriffe, sondern **Ansagen an den Raum**, und die
   * stehen deshalb mit `EVERY_ROOM` darin: das Radio, das Feuer und die
   * Warnung kurz davor. Ein Feuer, das man drei Schritte weiter nicht mehr
   * hört, ist keine Warnung, sondern eine Überraschung.
   */
  readonly reach?: KitchenReach;
}

/**
 * **Wie weit ein Küchengeräusch trägt**, in Metern.
 *
 * Acht: Die Küche misst elf Kacheln in der Breite (`kitchenPlan.KITCHEN_SPOTS`
 * und `layout.KITCHEN`), acht Meter reichen also fast, aber nicht ganz von
 * einer Ecke in die andere. Das ist der Zweck — wer an der Rückgabe steht,
 * soll den Herd an der Nordwand **noch** hören.
 */
export const KITCHEN_EAR = 8;

/**
 * **Und auf welcher Entfernung es halb so laut ist**, in Metern.
 *
 * Zwei, also zwei Kacheln. Die Kurve ist damit vorn steil und hinten flach,
 * und genau so hört man auch: Der Unterschied zwischen „vor mir" und „zwei
 * Schritte weiter" ist der, auf den es ankommt; ob etwas sechs oder sieben
 * Meter weg ist, hört ohnehin niemand.
 */
export const KITCHEN_HALF = 2;

/**
 * **Wo ein Ton zu hören ist** — bis wohin voll, und wo er aufhört.
 *
 * Bis eben hatte jeder Ton dieselbe Antwort: eine Kurve, die **an der Quelle**
 * anfängt zu fallen. Für einen Handgriff ist das richtig — ein Teller, der
 * abgestellt wird, gehört an die Stelle, an der er abgestellt wird. Für das
 * **Radio** war es falsch: Vier Schritte weiter war es weg, und ein Radio, das
 * man nur davor hört, ist ein Kopfhörer.
 *
 * Deshalb hat ein Ton jetzt zwei Zahlen statt einer. Innerhalb von `full` ist
 * er **voll** zu hören, dahinter fällt er auf derselben Kurve wie bisher, und
 * bei `gone` ist er weg. Die Balance bleibt davon unberührt: Auch ein Ton, der
 * im ganzen Raum gleich laut ist, kommt von einer Seite.
 */
export interface KitchenReach {
  /** Bis hierher voll zu hören, in Metern. */
  readonly full: number;
  /** Und hier ist Schluss. */
  readonly gone: number;
}

/**
 * **Ein Handgriff**: zu hören, wo er geschieht. Die alte, einzige Antwort —
 * `full = 0` gibt Zeile für Zeile dieselbe Kurve wie vorher.
 */
export const NEARBY: KitchenReach = { full: 0, gone: KITCHEN_EAR };

/** Wie schnell es hinter `full` abfällt — die alte Kurve, in einer Zahl. */
const KITCHEN_FADE = KITCHEN_EAR / KITCHEN_HALF;

/**
 * **Der ganze Raum**: voll zu hören überall in der Küchenzone, danach acht
 * Meter Auslauf.
 *
 * Gerechnet aus der Zone selbst (`layout.KITCHEN`) und nicht geschätzt: Ihre
 * Diagonale ist die größte Entfernung, die zwei Punkte darin haben können.
 * Wächst die Küche, wächst das Radio mit — und niemand sucht den Tag danach
 * eine Zahl, die einmal gestimmt hat.
 */
export const EVERY_ROOM: KitchenReach = {
  full: Math.hypot(KITCHEN.w, KITCHEN.d) * TILE,
  gone: Math.hypot(KITCHEN.w, KITCHEN.d) * TILE + KITCHEN_EAR,
};

/**
 * **Und die ganze Welt** — heute benutzt es niemand, und es steht trotzdem
 * hier.
 *
 * Aus dem Spieltest: „ggf. wäre es auch interessant bei dem Radio, es
 * einstellbar zu halten, dass das Radio in der gesamten Welt zu hören ist."
 * Genau dafür ist es da: Wer das will, trägt in `KITCHEN_CUES.radio` statt
 * `EVERY_ROOM` dieses hier ein, und sonst ändert sich nichts. Die Zahl ist die
 * Diagonale des Geländes (`layout.FIELD`), also wirklich überall.
 */
export const EVERYWHERE: KitchenReach = {
  full: Math.hypot(FIELD.w, FIELD.d) * TILE,
  gone: Math.hypot(FIELD.w, FIELD.d) * TILE + KITCHEN_EAR,
};

/**
 * **Wie weit die Balance ausschlägt**, 0…1.
 *
 * 0,8 und nicht 1: Ein Geräusch, das ganz auf einem Ohr liegt, klingt im
 * Headset wie im Kopf und nicht wie im Raum — und wer sich einmal umdreht,
 * bekommt es von einem Ohr auf das andere geworfen. Ein Rest auf der anderen
 * Seite hält es draußen.
 */
export const KITCHEN_PAN = 0.8;

/**
 * **Welche Aufnahme zu welchem Ereignis gehört** — eine Zeile je Ton.
 *
 * Die Dateien sind CC0 und liegen in `public/audio/kitchen/`; woher jede
 * einzelne stammt, steht in der `CREDITS.md` daneben.
 *
 * **`water` und `rinse` teilen sich eine Datei**, und das ist Absicht und kein
 * Versehen: Es ist derselbe Hahn. Einmal läuft er zwei Sekunden lang in einen
 * Topf, einmal läuft er, solange jemand am Becken spült — der Unterschied ist
 * die Schleife und nicht die Aufnahme. Zwei Dateien mit demselben Inhalt wären
 * zwei Dateien, von denen eines Tages eine getauscht wird.
 *
 * **Zwei Zeilen holen ihre Dateien aus der Auswahl** (`SOUND_TRIALS`): Messer
 * und Abgabe stehen noch zur Wahl, und was hier steht, ist die Variante, mit
 * der die Küche anfängt. Wer im Schauraum weiterschaltet, ändert nicht diese
 * Tabelle, sondern was der Spieler daraus nimmt
 * (`kitchenAudio.KitchenAudio.choose`).
 *
 * **Die Lautstärken sind nicht gleich**, und die Abstufung ist die halbe
 * Mischung: Ein Griff (0,3) darf unter allem liegen, ein Feuer (0,5) muss
 * quer durch die Küche zu hören sein, und die Musik (0,3) ist Hintergrund und
 * nicht Ereignis — wer sie so laut macht wie das Warndreieck, hört das
 * Warndreieck nicht mehr.
 */
export const KITCHEN_CUES: Readonly<Record<KitchenCue, KitchenCueSpec>> = {
  chop: { files: SOUND_TRIALS.chop[0]!.files, gain: 0.4, loop: false },
  sizzle: { files: ['sizzle.ogg'], gain: 0.35, loop: true },
  water: { files: ['water.ogg'], gain: 0.4, loop: false },
  rinse: { files: ['water.ogg'], gain: 0.3, loop: true },
  combine: { files: ['combine-0.ogg', 'combine-1.ogg'], gain: 0.4, loop: false },
  crate: { files: ['crate-0.ogg'], gain: 0.4, loop: false },
  warn: { files: ['warn.ogg'], gain: 0.45, loop: false, reach: EVERY_ROOM },
  fire: { files: ['fire.ogg'], gain: 0.5, loop: true, reach: EVERY_ROOM },
  spray: { files: ['spray.ogg'], gain: 0.45, loop: true },
  douse: { files: ['douse.ogg'], gain: 0.45, loop: false },
  serve: { files: SOUND_TRIALS.serve[0]!.files, gain: 0.5, loop: false },
  place: { files: ['place-0.ogg', 'place-1.ogg', 'place-2.ogg'], gain: 0.35, loop: false },
  pick: { files: ['pick-0.ogg', 'pick-1.ogg'], gain: 0.3, loop: false },
  radio: {
    files: ['radio-0.ogg', 'radio-1.ogg', 'radio-2.ogg'],
    gain: 0.3,
    loop: true,
    reach: EVERY_ROOM,
  },
};

/**
 * **Wie weit dieser Ton trägt** — die Zeile, die jeder Aufrufer braucht und
 * niemand zweimal schreiben soll.
 *
 * Ohne Eintrag gilt `NEARBY`: ein Handgriff dort, wo er geschieht. Ein `??`
 * an elf Aufrufstellen wäre elfmal dieselbe Entscheidung, und eine davon
 * bekäme eines Tages eine andere.
 */
export function reachOf(cue: KitchenCue): KitchenReach {
  return KITCHEN_CUES[cue].reach ?? NEARBY;
}

/** Alle Töne einmal — für das Vorladen und für die Tests. */
export const KITCHEN_CUE_IDS = Object.keys(KITCHEN_CUES) as readonly KitchenCue[];

/**
 * **Alle Dateien einmal, ohne Doppelte** — `water.ogg` gehört zu zwei Tönen.
 *
 * **Auch die Varianten, die gerade nicht laufen** (`SOUND_TRIALS`): Geholt
 * wird beim Aufbau der Zone und entpackt, sobald es einen Kontext gibt
 * (`kitchenAudio.KitchenAudio.prime`). Wer erst beim Druck auf den Knopf zu
 * laden anfinge, bekäme eine Stille zu hören, wo er einen Ton vergleichen
 * wollte — und verglichen wird hier genau einmal, bis die Wahl steht.
 */
export function kitchenSoundFiles(): readonly string[] {
  const seen = new Set<string>();
  for (const id of KITCHEN_CUE_IDS) for (const file of KITCHEN_CUES[id].files) seen.add(file);
  for (const cue of TRIAL_CUES)
    for (const trial of SOUND_TRIALS[cue]) for (const file of trial.files) seen.add(file);
  return [...seen];
}

/** Wo jemand steht und wohin er schaut — mehr braucht das Hören nicht. */
export interface KitchenEar {
  readonly x: number;
  readonly z: number;
  /** Die Blickrichtung, waagerecht und auf Länge eins. */
  readonly ax: number;
  readonly az: number;
}

/** Ein Ort in der Küche. */
export interface KitchenSpotAt {
  readonly x: number;
  readonly z: number;
}

/** Wie ein Ton beim Zuhörer ankommt. */
export interface KitchenHeard {
  /** Anteil der Spitzenlautstärke des Tons, 0…1. */
  readonly gain: number;
  /** Balance, −1 links bis +1 rechts. */
  readonly pan: number;
}

/**
 * **Wie laut und von welcher Seite** ein Geräusch an dieser Stelle ankommt.
 *
 * Gerechnet wird **auf dem Boden**, in x und z, wie beim Anfassen
 * (`core/usable.ts`): Ein Herd steht auf einem halben Meter, ein Feuer darüber,
 * ein Teller darunter — wer davorsteht, hört sie alle von derselben Stelle,
 * und eine Höhe in der Rechnung machte aus dem Bücken ein Lauterwerden.
 *
 * Die Lautstärke fällt zweifach: erst die Kurve (nah steil, fern flach), dann
 * ein linearer Auslauf bis ans Ende. Der Auslauf ist nicht Schönheit, sondern
 * Arbeitsersparnis: Ohne ihn stünde am Rand der Hörweite eine Stimme, die mit
 * einem Sprung verstummt, und das hört man.
 *
 * **Und beides fängt erst hinter `reach.full` an** (`KitchenReach`). Für einen
 * Handgriff ist das null, und dann ist es Zeile für Zeile die Rechnung von
 * vorher; für das Radio ist es die ganze Küche, und dann ist es drinnen überall
 * gleich laut und wird erst draußen leiser.
 */
export function kitchenHeard(
  ear: KitchenEar,
  at: KitchenSpotAt,
  reach: KitchenReach = NEARBY,
): KitchenHeard {
  const dx = at.x - ear.x;
  const dz = at.z - ear.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= reach.gone) return { gain: 0, pan: 0 };
  const span = Math.max(reach.gone - reach.full, 1e-6);
  const out = Math.max(0, distance - reach.full) / span;
  const gain = (1 / (1 + (out * KITCHEN_FADE) ** 2)) * (1 - out);
  // Rechts vom Blick: die Vorwärtsrichtung eine Vierteldrehung im Uhrzeigersinn
  // (in three.js zeigt der Blick nach −z und die rechte Hand nach +x).
  const rx = -ear.az;
  const rz = ear.ax;
  // Wer mitten in der Quelle steht, hat keine Richtung — und braucht keine.
  if (distance < 1e-4) return { gain, pan: 0 };
  const side = (dx * rx + dz * rz) / distance;
  return { gain, pan: Math.max(-1, Math.min(1, side)) * KITCHEN_PAN };
}

/**
 * **Von mehreren gleichen Quellen zählt die nächste** — und nur sie.
 *
 * Zwei brennende Herde sind nicht doppelt so laut wie einer; sie sind ein
 * Feuer, das von der näheren Seite kommt. Ohne diese Zeile addierte eine Küche
 * mit vier Kochstellen vier Zischschleifen übereinander, und die Mischung
 * kippte, sobald jemand ein Möbel dazustellt.
 *
 * Gibt `null`, wenn keine Quelle in Hörweite ist — dann läuft die Schleife
 * nicht, statt still zu laufen.
 */
export function kitchenNearest(
  ear: KitchenEar,
  sources: readonly KitchenSpotAt[],
  reach: KitchenReach = NEARBY,
): KitchenHeard | null {
  let best: KitchenHeard | null = null;
  for (const at of sources) {
    const heard = kitchenHeard(ear, at, reach);
    if (heard.gain <= 0) continue;
    if (!best || heard.gain > best.gain) best = heard;
  }
  return best;
}

/**
 * **Wie oft das Messer aufschlägt**, in Sekunden.
 *
 * 0,42: Ein Schnitt dauert drei Sekunden (`kitchenWork.WORK_SECONDS.chop`),
 * das sind gut sieben Schläge — genug, dass es nach Arbeit klingt, und wenig
 * genug, dass es keine Maschinenpistole wird.
 */
export const CHOP_BEAT = 0.42;

/** Was ein Takt in diesem Bild ergeben hat. */
export interface KitchenBeat {
  /** Die Uhr für das nächste Bild. */
  readonly clock: number;
  /** Ob der Takt in diesem Bild geschlagen hat. */
  readonly hit: boolean;
}

/**
 * **Ein Takt, der zählt und höchstens einmal je Bild schlägt.**
 *
 * Das „höchstens einmal" ist die ganze Entscheidung dieser Funktion. Ein
 * Ruckler von einer halben Sekunde enthält rechnerisch ein Dutzend Schläge;
 * wer sie alle nachholt, bekommt sie alle im selben Bild zu hören — ein
 * Knall statt eines Rhythmus. Der Rest verfällt deshalb, und die Uhr fängt
 * wieder bei `span` an.
 *
 * `clock` zählt herunter und nicht hinauf, damit ein Takt, der eben erst
 * angefangen hat, bei null anfängt und sofort schlägt: Wer das Messer
 * ansetzt, hört den ersten Schlag beim Ansetzen und nicht eine halbe Sekunde
 * später.
 */
export function kitchenBeat(clock: number, dt: number, span: number): KitchenBeat {
  const next = clock - Math.max(0, dt);
  if (next > 0) return { clock: next, hit: false };
  return { clock: span, hit: true };
}
