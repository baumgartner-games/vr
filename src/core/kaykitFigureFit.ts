/**
 * **Eine Figur, die läuft** — die Rechnung dazu, ohne three.js.
 *
 * Der Lader daneben (`core/kaykitFigure.ts`) macht aus einer Adresse im Regal
 * eine Figur, die steht, geht, rennt, zuschlägt und umfällt. Alles, was daran
 * **Zahl oder Name** ist, steht hier: ab welchem Tempo ein Gang ein anderer
 * ist, wie die Spuren der Bibliotheken wirklich heißen, welcher Knochen die
 * rechte Hand ist, und um wie viel eine Figur über dem Paketmaßstab noch
 * wachsen muss, damit sie genau so hoch steht, wie jemand gesagt hat.
 *
 * Eigene Datei und keine Zeile im Lader, aus demselben Grund wie bei
 * `core/kaykitFit.ts` und `core/kaykitClips.ts`: Der Lader braucht
 * `GLTFLoader` und `import.meta`, und beides bringt Jest zum Stehen. Was hier
 * steht, prüft dagegen ein Test — und zwar **gegen die wirklichen Dateien**
 * (`kaykitFigureFit.test.ts` liest den JSON-Teil der `.glb` selbst). Ein
 * Clipname, den es nicht gibt, ist sonst eine Figur, die stumm in ihrer
 * T-Pose steht, und niemand sucht das in einer Namensliste.
 */

/** Steht, geht, rennt — mehr Gänge hat diese Sammlung nicht. */
export type FigureGait = 'idle' | 'walk' | 'run';

/** Und das, was eine Figur einmal tut statt dauernd (`FIGURE_ACTIONS`). */
export type FigureAct = 'attack' | 'hit' | 'death';

/**
 * **Unter diesem Tempo steht die Figur** (m/s).
 *
 * Nicht null: Ein Bot, der an seinem Ziel steht, bekommt aus der Wegsuche
 * Millimeter je Sekunde, und eine Figur, die davon in den Gehschritt fiele,
 * zappelte im Stand. Fünf Zentimeter je Sekunde sind einen halben Meter in
 * zehn Sekunden — das ist Stillstand.
 */
export const GAIT_STILL = 0.05;

/**
 * **Und ab hier rennt sie** (m/s).
 *
 * Gemessen an dem, was in diesem Spiel wirklich unterwegs ist: Die NPCs gehen
 * mit 1,1 bis 1,8 m/s (`worlds/npc/npcKinds.ts`) — das ist der Gang, und genau
 * so sollen sie aussehen. Die Bots der Raumstation traben mit
 * `PLAYER_TROT_SPEED` = 3,56 m/s und sprinten mit 4,94
 * (`worlds/haunting/mission.ts`); beides ist Laufen.
 *
 * Dazwischen liegt die Schwelle, und 2,2 m/s ist dort, wo auch ein Mensch vom
 * Gehen ins Laufen wechselt. Sie ist bewusst näher am oberen Ende der
 * NPC-Tempi als in der Mitte: Ein Gehschritt, der zu schnell abgespielt wird,
 * sieht nach Eile aus; eine Laufanimation bei 1,8 m/s sieht nach Schlittern
 * aus, weil die Füße schneller treten als die Figur vorankommt.
 */
export const GAIT_RUN = 2.2;

/**
 * **Der Gang zu einem Tempo.**
 *
 * Der Betrag zählt: Wer rückwärts geht, geht. Unsinn (`NaN`) steht — das ist
 * der ruhigste Ausgang, den eine Figur nehmen kann.
 */
export function gaitFor(speed: number): FigureGait {
  if (!Number.isFinite(speed)) return 'idle';
  const pace = Math.abs(speed);
  if (pace < GAIT_STILL) return 'idle';
  return pace < GAIT_RUN ? 'walk' : 'run';
}

/**
 * **Welche Spur welcher Gang ist** — die bevorzugte zuerst.
 *
 * Die Namen sind die des Zeichners und stehen so in den Bibliotheken
 * (`core/kaykitClips.KAYKIT_CLIP_FILES`); der Test liest sie dort nach. Die
 * Listen sind nicht aus Zierde mehrzeilig, sondern weil die **beiden
 * Skelette verschieden viel können**: Das mittlere bringt `Walking_A`…`C` und
 * `Running_A`/`B` mit, das große nur je eine Spur. Wer stur `Running_B`
 * verlangte, hätte auf dem großen Skelett eine Figur, die im Rennen steht.
 *
 * `Idle_A` ist das ruhige Stehen, `Idle_B` das mit Blick über die Schulter —
 * für eine Figur, die einfach dasteht, ist das erste richtig. Eine
 * **T-Pose steht hier nicht**: Sie wäre kein Ersatz, sondern genau das Bild,
 * das eine Figur ohne Bewegung ohnehin abgibt.
 */
export const GAIT_CLIPS: Readonly<Record<FigureGait, readonly string[]>> = {
  idle: ['Idle_A', 'Idle_B', 'Melee_Unarmed_Idle'],
  walk: ['Walking_A', 'Walking_B', 'Walking_C'],
  // Fällt das Laufen aus, ist Gehen immer noch besser als Stehen.
  run: ['Running_A', 'Running_B', 'Walking_A'],
};

/**
 * **Und was eine Figur einmal tut**: zuschlagen, einstecken, umfallen.
 *
 * Auch hier heißen dieselben Bewegungen auf den beiden Skeletten
 * **verschieden** — das mittlere hat `Melee_1H_Attack_Chop` und
 * `Melee_Unarmed_Attack_Punch_A`, das große `Melee_1H_Slash` und
 * `Melee_Unarmed_Punch`. Deshalb steht in jeder Liste beides, und
 * `pickClip` nimmt, was da ist.
 *
 * Der Schlag mit einer Hand steht vor dem Fausthieb: Die meisten Figuren der
 * Sammlung halten etwas (`handslot.r`), und wer eine Axt trägt und dabei
 * boxt, sieht falsch aus. `Throw` ist der letzte Ausweg — es ist die einzige
 * Bewegung mit Armschwung, die auch die schmale `General`-Bibliothek kennt.
 *
 * `spawn` und `tpose` stehen dabei, weil es sie gibt: `Spawn_Ground` ist das
 * Aufstehen aus dem Boden (nur mittleres Skelett), `T-Pose` die Ruhelage, in
 * der jede Figur ohne Mischer steht.
 */
export const FIGURE_ACTIONS: Readonly<Record<FigureAct | 'spawn' | 'tpose', readonly string[]>> = {
  attack: [
    'Melee_1H_Attack_Chop',
    'Melee_1H_Slash',
    'Melee_2H_Attack_Chop',
    'Melee_2H_Attack',
    'Melee_Unarmed_Attack_Punch_A',
    'Melee_Unarmed_Punch',
    'Throw',
  ],
  hit: ['Hit_A', 'Hit_B', 'Melee_Block_Hit'],
  death: ['Death_A', 'Death_B'],
  spawn: ['Spawn_Ground', 'Spawn_Air'],
  tpose: ['T-Pose'],
};

/**
 * **Der erste gewünschte Name, den es gibt** — oder `null`.
 *
 * Die Reihenfolge der **Wunschliste** entscheidet, nicht die der vorhandenen
 * Namen: `GAIT_CLIPS.run` will `Running_A`, und nur wenn das Skelett es nicht
 * hat, `Running_B`.
 */
export function pickClip(names: Iterable<string>, wanted: readonly string[]): string | null {
  const have = new Set<string>();
  for (const name of names) if (typeof name === 'string' && name.length > 0) have.add(name);
  for (const wish of wanted) if (have.has(wish)) return wish;
  return null;
}

/**
 * **Wie viel über dem Paketmaßstab** eine Figur noch wachsen muss, damit sie
 * `targetHeight` Meter hoch steht.
 *
 * Der Lader gibt eine Gruppe heraus, auf der schon der Maßstab ihres Pakets
 * sitzt (`core/kaykitFit.kaykitScale`, 0,7 für die Figurenpakete). Das ist die
 * richtige Größe **im Verhältnis zu den Requisiten desselben Pakets** — aber
 * nicht unbedingt die, die eine Zone für ihren Collider und ihre Trefferzonen
 * angenommen hat. Ein NPC ist 1,70 m hoch, weil die Hülle um ihn herum 1,70 m
 * hoch ist; die Figur darin hat sich danach zu richten und nicht umgekehrt.
 *
 * Also: gewünschte Höhe geteilt durch die, die aus Quelle mal Paketmaßstab
 * ohnehin würde. Das Mannequin (Quelle 2,2037) steht mit 0,7 auf 1,543 m und
 * braucht für 1,70 m noch den Faktor 1,102.
 *
 * **Unsinn ergibt 1** und nicht `NaN` oder `Infinity`: Eine Figur, deren
 * Maßstab keine Zahl ist, verschwindet aus dem Bild — eine, die ihre
 * Paketgröße behält, steht falsch hoch da und lässt sich ansehen.
 */
export function figureScale(sourceHeight: number, packScale: number, targetHeight: number): number {
  const source = Number.isFinite(sourceHeight) ? sourceHeight : 0;
  const pack = Number.isFinite(packScale) ? packScale : 0;
  const target = Number.isFinite(targetHeight) ? targetHeight : 0;
  if (source <= 0 || pack <= 0 || target <= 0) return 1;
  return target / (source * pack);
}

/** Die drei Anker, die eine Figur außen hergibt. */
export type FigureBone = 'handLeft' | 'handRight' | 'head';

/**
 * **Die Knochen, an die etwas gehängt wird** — je Anker die bevorzugten
 * Namen, so wie sie **in den Dateien** stehen.
 *
 * Die Sammlung hat dafür eigene Knochen: `handslot.r` und `handslot.l` sitzen
 * dort, wo eine Axt oder eine Fackel hingehört — ein Stück vor der Hand und
 * leicht darunter. Sie sind aber **nicht überall da**: `tools/kaykit-model.mjs`
 * wirft beim Aufbereiten ungenutzte Knoten weg, und weil `handslot` kein
 * Gelenk der Häutung ist, fehlt er bei Figuren, deren Bewegungen ihn nicht
 * anfassen. Nachgemessen am Regal: `Mannequin_Medium.glb` hat ihn **nicht**,
 * `Dummy.glb`, `Robot_One/Two.glb`, `Knight.glb`, `Skeleton_Warrior.glb` und
 * `Mannequin_Large.glb` haben ihn. Deshalb steht `hand.r` als zweiter Name
 * dahinter — eine Hand ist ein schlechterer Griff als ein Griffpunkt, aber ein
 * viel besserer als keiner.
 *
 * **Im Baum heißen sie anders**, siehe `figureBoneName`.
 */
export const FIGURE_BONES: Readonly<Record<FigureBone, readonly string[]>> = {
  handRight: ['handslot.r', 'hand.r', 'wrist.r'],
  handLeft: ['handslot.l', 'hand.l', 'wrist.l'],
  head: ['head'],
};

/**
 * **Der Name, unter dem ein Knochen im Szenenbaum ankommt.**
 *
 * In der Datei heißt er `handslot.r`, im Baum `handslotr`: Der `GLTFLoader`
 * schickt jeden Knotennamen durch `PropertyBinding.sanitizeNodeName`, und der
 * Punkt ist dort ein **reserviertes Zeichen** — er trennt in einem Spurnamen
 * den Knoten von der Eigenschaft (`handslotr.quaternion`). Ein Knochen mit
 * Punkt im Namen wäre eine Spur, die niemand mehr binden kann.
 *
 * Dieselben vier Zeichen wie dort (`[`, `]`, `.`, `:`, `/`), und Leerzeichen
 * werden zu Unterstrichen. Abgeschrieben und nicht importiert: `three` ist in
 * dieser Datei mit Absicht nicht dabei (siehe oben), und die Regel ist fünf
 * Zeichen lang. Der Test hält beides nebeneinander ehrlich, indem er die
 * Namen aus der Datei durch diese Funktion schickt.
 */
export function figureBoneName(name: string): string {
  return name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
}

/**
 * **Wie weit eine Figur gedreht werden muss, damit sie nach −Z schaut.**
 *
 * Alles, was in diesem Spiel eine Vorderseite hat, schaut nach **−Z**: der
 * NPC-Körper (`worlds/npc/NpcBody.ts`), die Crewmate, der Koch, das
 * Küchenmöbel. glTF schreibt das Gegenteil vor („the front of the object faces
 * +Z"), und KayKit hält sich daran.
 *
 * **Nachgesehen, nicht angenommen**, und zwar zweimal: Im Bild von schräg
 * vorn (Kamera bei +Z) lacht das Mannequin in die Kamera, von −Z sieht man
 * seinen Rücken; und die Zehen liegen in der Bindepose vor dem Fuß, aber in
 * **+Z** (`toes.l` bei z = +0,0675, `foot.l` bei z = −0,013 — dieselben Zahlen
 * bei allen sieben nachgemessenen Figuren). Beides sagt dasselbe: Die
 * Vorderseite ist +Z, also dreht der Lader die Figur einmal um die Hochachse.
 *
 * Eine Konstante und kein `Math.PI` irgendwo im Code: Wenn diese Annahme
 * jemals kippt — ein neues Paket, ein anderer Exporteur —, ist das die eine
 * Zeile, die sich ändert.
 */
export const FIGURE_FACING = Math.PI;

/**
 * **Wie lange ein Gangwechsel überblendet** (Sekunden).
 *
 * Kurz genug, dass ein Bot, der losläuft, sofort losläuft; lang genug, dass
 * der Sprung vom Stehen ins Gehen kein Ruck ist. Ein Angriff kommt schneller
 * (`FIGURE_ACT_FADE`) — ein Schlag, der eingeblendet wird, kommt zu spät.
 */
export const FIGURE_FADE = 0.2;

/** Und das, womit eine einmalige Bewegung einsetzt. */
export const FIGURE_ACT_FADE = 0.08;
