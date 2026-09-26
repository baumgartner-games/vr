/**
 * **Räume dekorieren** — wo ein Stück aus dem Regal landet, wenn es nicht
 * einfach auf dem Boden steht. Reine Rechnung, ohne Szene.
 *
 * Zwei Fragen, die das Einrasten auf dem Kachelgitter (`gridSnap.ts`) bewusst
 * offen lässt — dort macht die Höhe die Schwerkraft:
 *
 * - **Stapeln** (`restOn`): Eine Tasse über einem Tisch steht **auf** dem
 *   Tisch, eine Lampe über einer Kommode auf der Kommode. Bis dahin tat das
 *   nur ein Stück, das man fallen ließ; ein gemaltes (`paintAt`) entstand auf
 *   Bodenhöhe und steckte im Tisch. Und ob es passt, sagt dieselbe Rechnung:
 *   Ein Bett auf einer Tasse, ein Stuhl halb in einer Wand ist **ungültig**,
 *   und der Geist färbt sich rot (`placeGhost.ts`).
 * - **An die Wand** (`mountPose`): Bilder, Banner, Wandfackeln, Zielscheiben
 *   (`mountsOnWall`) suchen sich die nächste Wandfläche vor dem Kran, drehen
 *   sich mit der Vorderseite in den Raum, rücken bis an die Fläche und hängen
 *   auf Augenhöhe. Ohne Wand in Reichweite stehen sie wie jedes Stück.
 *
 * Alle Kästen sind achsparallel in Weltmetern (`Box`). Eine Wand unter 45°
 * ist für diese Rechnung ein Kasten um ihre Mitte — an sie hängt man nichts.
 */

/** Ein achsparalleler Kasten in Weltmetern. */
export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

/** Ein Kasten aus Mitte und Kantenlängen — die Schreibweise von `grid/solids.PlanSolid`. */
export function boxAround(x: number, y: number, z: number, w: number, h: number, d: number): Box {
  return {
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y - h / 2,
    maxY: y + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  };
}

// --- Stapeln ------------------------------------------------------------------

/** Wie hoch eine Fläche höchstens liegen darf, um noch etwas darauf zu stellen, über dem Boden. */
export const STACK_MAX = 2.0;

/**
 * Wie viel Überlappen ein Nachbar haben darf, bevor er im Weg steht — als
 * Anteil der Grundfläche. Ein Stuhl, der drei Zentimeter unter die
 * Tischplatte ragt, ist ein Stuhl am Tisch und kein Fehler.
 */
export const BLOCK_SHARE = 0.12;

/**
 * Wie viel der Grundfläche mindestens aufliegen muss — ein Sofa auf einer
 * Tasse liegt nicht auf, es balanciert.
 */
export const SUPPORT_SHARE = 0.3;

/** Wie viel breiter als seine Unterlage ein Stück sein darf, in Metern — Kanten stehen gern über. */
export const STACK_SLACK = 0.1;

/** Eine Grundfläche: Mitte und halbe Kantenlängen, schon gedreht (`gridSnap.turnedHalf`). */
export interface Footprint {
  readonly x: number;
  readonly z: number;
  readonly halfX: number;
  readonly halfZ: number;
}

export interface Rest {
  /** Die Unterkante des Stücks — der Boden oder die Oberkante dessen, worauf es steht. */
  readonly y: number;
  /** Worauf es steht: der Index in `others`, oder `-1` für den Boden. */
  readonly support: number;
  /** Ob da etwas im Weg steht — dann wird es nicht hingestellt. */
  readonly blocked: boolean;
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function footArea(foot: Footprint): number {
  return Math.max(1e-6, 4 * foot.halfX * foot.halfZ);
}

/** Wie viel von der Grundfläche ein Kasten von oben deckt, als Anteil. */
export function coverShare(foot: Footprint, box: Box): number {
  const dx = overlap(foot.x - foot.halfX, foot.x + foot.halfX, box.minX, box.maxX);
  const dz = overlap(foot.z - foot.halfZ, foot.z + foot.halfZ, box.minZ, box.maxZ);
  return (dx * dz) / footArea(foot);
}

/**
 * **Worauf ein Stück steht, und ob es dort Platz hat.**
 *
 * Getragen wird von dem, was **unter der Mitte** liegt — die höchste
 * Oberkante bis `STACK_MAX` über dem Boden, sonst der Boden selbst. Das ist
 * dieselbe Frage, die eine Hand beim Abstellen stellt: Wo die Mitte ist, da
 * steht es. Im Weg steht danach alles, was die Grundfläche um mehr als
 * `BLOCK_SHARE` deckt **und** in der Höhe des Stücks liegt; was darunter
 * endet (die Tischplatte unter der Tasse, der Teppich unter dem Stuhl), stört
 * nicht.
 *
 * @param height die Höhe des Stücks
 */
export function restOn(
  foot: Footprint,
  height: number,
  floorY: number,
  others: readonly Box[],
): Rest {
  let y = floorY;
  let support = -1;
  for (let i = 0; i < others.length; i++) {
    const box = others[i]!;
    if (foot.x < box.minX || foot.x > box.maxX || foot.z < box.minZ || foot.z > box.maxZ) continue;
    if (box.maxY > floorY + STACK_MAX || box.maxY <= y) continue;
    y = box.maxY;
    support = i;
  }
  let blocked = false;
  if (support >= 0) {
    // Aufliegen heißt: Genug von der Grundfläche liegt auf der Oberkante. Eine
    // Tasse auf einem schmalen Brett liegt ganz auf; ein Sofa auf einer Tasse
    // zu einem Prozent.
    const box = others[support]!;
    if (coverShare(foot, box) < SUPPORT_SHARE) blocked = true;
    // Und gestapelt wird **Kleines auf Großes**: Ein Sofa auf einem
    // Beistelltisch liegt vielleicht zu einem Drittel auf, gemeint ist es
    // trotzdem nicht. Was in einer Richtung breiter ist als seine Unterlage,
    // steht dort nicht.
    const fits =
      2 * foot.halfX <= box.maxX - box.minX + STACK_SLACK &&
      2 * foot.halfZ <= box.maxZ - box.minZ + STACK_SLACK;
    if (!fits) blocked = true;
  }
  const top = y + Math.max(0, height);
  for (let i = 0; i < others.length && !blocked; i++) {
    if (i === support) continue;
    const box = others[i]!;
    // Ein Zentimeter Luft oben und unten: Was genau auf derselben Höhe
    // aufhört, auf der das Stück anfängt, trägt es und steht nicht im Weg.
    if (box.maxY <= y + 0.01 || box.minY >= top - 0.01) continue;
    if (coverShare(foot, box) > BLOCK_SHARE) blocked = true;
  }
  return { y, support, blocked };
}

/** Bis zu welcher halben Kantenlänge ein Stück als Kleinkram gilt, in Metern. */
export const SMALL_HALF = 0.3;

/** Wie fein Kleinkram auf einer Fläche einrastet, in Metern: Viertelkacheln. */
export const SURFACE_STEP = 0.25;

/**
 * **Wo Kleinkram auf einer Fläche steht** — eine Tasse, ein Buch, eine
 * Tischlampe — oder `null`, wenn unter dem Punkt keine Fläche ist.
 *
 * Kleinkram rastet nicht auf der Kachelmitte ein, sondern auf Viertelkacheln
 * **innerhalb** der Fläche unter dem Zeiger: Ein Wandbrett ist 30 cm tief und
 * liegt an der Wand, also weit weg von jeder Kachelmitte, und auf einem
 * Tisch sollen zwei Tassen nebeneinander stehen können und nicht beide in der
 * Mitte. Gerückt wird so, dass das Stück ganz auf der Fläche steht; ist die
 * Fläche schmaler, steht es auf ihrer Mitte.
 */
export function surfaceSpot(
  x: number,
  z: number,
  foot: { readonly halfX: number; readonly halfZ: number },
  floorY: number,
  others: readonly Box[],
): { x: number; z: number } | null {
  if (foot.halfX > SMALL_HALF || foot.halfZ > SMALL_HALF) return null;
  let best: Box | null = null;
  for (const box of others) {
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
    if (box.maxY > floorY + STACK_MAX || box.maxY < floorY + 0.1) continue;
    if (!best || box.maxY > best.maxY) best = box;
  }
  if (!best) return null;
  const fit = (value: number, min: number, max: number, half: number): number => {
    if (max - min <= 2 * half) return (min + max) / 2;
    const snapped = Math.round(value / SURFACE_STEP) * SURFACE_STEP;
    return Math.max(min + half, Math.min(max - half, snapped));
  };
  return {
    x: fit(x, best.minX, best.maxX, foot.halfX),
    z: fit(z, best.minZ, best.maxZ, foot.halfZ),
  };
}

// --- an die Wand --------------------------------------------------------------

/**
 * **Was an die Wand gehört** — am Dateinamen, wie die Haltung
 * (`modelStance.ts`): Bilderrahmen (nicht die stehenden), Banner und Wappen,
 * Wandfackeln, Zielscheiben für die Wand, Tafeln, Wandschmuck und die
 * Wandbretter aus `furniture-bits` (`shelf_A_*` — ein Brett mit Konsolen, das
 * auf dem Boden lag wie ein Stück Holz) und die Wandfliesen des Restaurants
 * (`wall_tiles_*`, eine Platte, die sonst als Wand galt und eine ersetzte).
 */
export function mountsOnWall(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name.startsWith('pictureframe_')) return !name.includes('standing');
  return /^(banner_|torch_mounted|plaque_|target_wall_|wall_decoration_|wall_tiles_|shelf_a_|sign_(left|right|both))/.test(
    name,
  );
}

/** Wie weit vor einer Wand der Kran noch an ihr gilt, in Metern. */
export const MOUNT_REACH = 0.75;

/** Wie hoch die Mitte eines Wandstücks hängt, über dem Boden — ungefähr Augenhöhe. */
export const MOUNT_HEIGHT = 1.55;

/** Die Luft zwischen Wand und Stück — genug gegen Flimmern, zu wenig, um es zu sehen. */
export const MOUNT_GAP = 0.01;

/** Wie fein ein Wandstück entlang der Wand einrastet, in Metern: halbe Kacheln. */
export const MOUNT_STEP = 0.5;

/** Was als Wand gilt: mindestens so hoch … */
const WALL_MIN_HEIGHT = 1.2;
/** … und höchstens so dick. */
const WALL_MAX_THICK = 0.6;

/**
 * **Eine Wandfläche** — eine Seite einer Wand, an die man etwas hängen kann.
 * `axis` ist die Achse, entlang der ihre Normale zeigt: Eine Fläche mit
 * `axis: 'x'` liegt in der Ebene `x = at` und läuft von `from` bis `to` in z.
 */
export interface WallFace {
  readonly axis: 'x' | 'z';
  readonly at: number;
  /** In welche Richtung die Fläche in den Raum sieht: +1 oder −1 entlang `axis`. */
  readonly normal: 1 | -1;
  readonly from: number;
  readonly to: number;
  readonly bottom: number;
  readonly top: number;
}

/**
 * **Die Flächen aller Wände unter diesen Kästen** — jeder hohe, dünne Kasten
 * hat zwei, auf jeder Seite eine. Ein dicker Kasten (ein Schrank, ein
 * Felsblock) ist keine Wand, auch wenn man theoretisch etwas daran hängen
 * könnte: Gemeint ist ein Raum und seine Wände.
 */
export function wallFaces(boxes: readonly Box[]): WallFace[] {
  const out: WallFace[] = [];
  for (const box of boxes) {
    const w = box.maxX - box.minX;
    const d = box.maxZ - box.minZ;
    if (box.maxY - box.minY < WALL_MIN_HEIGHT) continue;
    const bottom = box.minY;
    const top = box.maxY;
    if (w <= WALL_MAX_THICK && d > w * 1.5) {
      out.push({ axis: 'x', at: box.maxX, normal: 1, from: box.minZ, to: box.maxZ, bottom, top });
      out.push({ axis: 'x', at: box.minX, normal: -1, from: box.minZ, to: box.maxZ, bottom, top });
    } else if (d <= WALL_MAX_THICK && w > d * 1.5) {
      out.push({ axis: 'z', at: box.maxZ, normal: 1, from: box.minX, to: box.maxX, bottom, top });
      out.push({ axis: 'z', at: box.minZ, normal: -1, from: box.minX, to: box.maxX, bottom, top });
    }
  }
  return joinFaces(out);
}

/**
 * **Stücke derselben Wand zusammenlegen.** Der Grundriss baut eine Wand aus
 * einem Quader je Kachel (`grid/gridPlan.solids`); ohne das Zusammenlegen
 * passte an eine acht Meter lange Wand kein Bild, das breiter ist als einen
 * Meter, und keines säße über einer Fuge.
 */
function joinFaces(faces: WallFace[]): WallFace[] {
  const key = (face: WallFace): string =>
    `${face.axis}|${face.at.toFixed(3)}|${face.normal}|${face.bottom.toFixed(2)}|${face.top.toFixed(2)}`;
  const groups = new Map<string, WallFace[]>();
  for (const face of faces) {
    const list = groups.get(key(face));
    if (list) list.push(face);
    else groups.set(key(face), [face]);
  }
  const out: WallFace[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.from - b.from);
    let run = list[0]!;
    for (const face of list.slice(1)) {
      if (face.from <= run.to + 1e-3) run = { ...run, to: Math.max(run.to, face.to) };
      else {
        out.push(run);
        run = face;
      }
    }
    out.push(run);
  }
  return out;
}

/** Wo ein Wandstück hängt: Mitte, Drehung und die Fläche, an der es hängt. */
export interface MountPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Drehung um die Hochachse: Die Vorderseite (+z des Modells) zeigt in den Raum. */
  readonly yaw: number;
  readonly face: WallFace;
}

/** Die Maße eines Wandstücks, **ungedreht**: breit entlang der Wand, tief von ihr weg. */
export interface MountSize {
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly height: number;
}

/**
 * **Die Maße eines Stücks, wie es an der Wand hängt** — die längere
 * waagerechte Kante läuft die Wand entlang, die kürzere steht von ihr ab. So
 * hängt ein Bild flach an der Wand, egal, wie herum die Datei es gespeichert
 * hat.
 */
export function mountSize(halfX: number, halfY: number, halfZ: number): MountSize {
  return {
    halfWidth: Math.max(halfX, halfZ),
    halfDepth: Math.min(halfX, halfZ),
    height: 2 * halfY,
  };
}

/**
 * **Die Drehung, mit der ein Stück von einer Fläche weg in den Raum sieht.**
 * Dieselbe Schreibweise wie überall (`yaw` um +y, +z vorn): Eine Fläche mit
 * der Normalen +x braucht eine Vierteldrehung, eine mit −z eine halbe.
 *
 * @param alongX ob die Datei ihre Breite entlang x hat (`halfX >= halfZ`) —
 *   dann ist +z ihre Vorderseite; sonst liegt die Breite entlang z, und die
 *   Vorderseite ist +x.
 */
export function faceYaw(face: WallFace, alongX: boolean): number {
  const nx = face.axis === 'x' ? face.normal : 0;
  const nz = face.axis === 'z' ? face.normal : 0;
  const yaw = Math.atan2(nx, nz);
  return alongX ? yaw : yaw - Math.PI / 2;
}

/** Die Höhe der Mitte: Augenhöhe, aber nie mit der Unterkante unter 10 cm oder über der Wand. */
export function mountHeight(floorY: number, height: number, face: WallFace): number {
  const low = floorY + height / 2 + 0.1;
  const high = Math.min(face.top, floorY + 2.8) - height / 2 - 0.05;
  return Math.max(low, Math.min(floorY + MOUNT_HEIGHT, high));
}

/**
 * **Wo ein Wandstück an der nächsten Wand hängt** — oder `null`, wenn vor dem
 * Kran keine Wand in Reichweite ist.
 *
 * Gesucht wird die nächste Fläche, **vor** der der Punkt liegt (bis
 * `MOUNT_REACH` davor, und ein kleines Stück dahinter: Wer genau über die
 * Wand zeigt, meint die Seite, auf der er näher dran ist). Entlang der Wand
 * rastet es in halben Kacheln ein (`MOUNT_STEP`) und bleibt ganz auf der
 * Fläche — ein Bild, das über das Wandende hinausragt, hängt in der Luft.
 * Eine Fläche, die schmaler ist als das Stück, trägt es nicht.
 */
export function mountPose(
  x: number,
  z: number,
  faces: readonly WallFace[],
  size: MountSize,
  floorY: number,
  alongX = true,
): MountPose | null {
  let best: WallFace | null = null;
  let bestDistance = Infinity;
  for (const face of faces) {
    if (face.to - face.from < 2 * size.halfWidth - 1e-6) continue;
    if (face.bottom > floorY + 0.5 || face.top < floorY + 1) continue;
    const across = face.axis === 'x' ? x : z;
    const along = face.axis === 'x' ? z : x;
    const distance = (across - face.at) * face.normal;
    if (distance < -0.3 || distance > MOUNT_REACH) continue;
    if (along < face.from - 0.25 || along > face.to + 0.25) continue;
    const score = Math.abs(distance);
    if (score < bestDistance) {
      bestDistance = score;
      best = face;
    }
  }
  if (!best) return null;
  const along = best.axis === 'x' ? z : x;
  const snapped = Math.round(along / MOUNT_STEP) * MOUNT_STEP;
  const lo = best.from + size.halfWidth;
  const hi = best.to - size.halfWidth;
  const slide = Math.max(lo, Math.min(hi, snapped));
  const off = best.at + best.normal * (size.halfDepth + MOUNT_GAP);
  return {
    x: best.axis === 'x' ? off : slide,
    z: best.axis === 'x' ? slide : off,
    y: mountHeight(floorY, size.height, best),
    yaw: faceYaw(best, alongX),
    face: best,
  };
}

/**
 * **Ob zwei Wandstücke sich an derselben Fläche überdecken** — ein Bild über
 * dem anderen ist kein Schmuck, sondern ein Versehen. Verglichen wird die
 * Mitte des neuen gegen die Kästen der schon hängenden.
 */
export function mountBlocked(pose: MountPose, size: MountSize, hung: readonly Box[]): boolean {
  const alongX = pose.face.axis === 'z';
  const half = size.halfWidth;
  const foot: Box = {
    minX: alongX ? pose.x - half : pose.x - size.halfDepth,
    maxX: alongX ? pose.x + half : pose.x + size.halfDepth,
    minZ: alongX ? pose.z - size.halfDepth : pose.z - half,
    maxZ: alongX ? pose.z + size.halfDepth : pose.z + half,
    minY: pose.y - size.height / 2,
    maxY: pose.y + size.height / 2,
  };
  for (const box of hung) {
    const dx = overlap(foot.minX, foot.maxX, box.minX, box.maxX);
    const dy = overlap(foot.minY, foot.maxY, box.minY, box.maxY);
    const dz = overlap(foot.minZ, foot.maxZ, box.minZ, box.maxZ);
    if (dx > 0.02 && dy > 0.02 && dz > 0.005) return true;
  }
  return false;
}

// --- eine ganze Fläche --------------------------------------------------------

/** Wo ein Stück einer Fläche landet — dieselbe Antwort wie für ein einzelnes (`decorTarget`). */
export interface DecorSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly mounted: boolean;
  readonly valid: boolean;
}

/**
 * **Eine Fläche Stück für Stück hinstellen — mit Stapeln und Wand** wie beim
 * Einzelsetzen. Bis dahin legte die Fläche jede Kopie auf den Boden, auch
 * die Tasse über dem Tisch und das Bild vor der Wand.
 *
 * Gefragt wird **nacheinander** (`target` je Stelle, dann `place`): Was eben
 * hingestellt wurde, steht beim nächsten schon im Weg — zwei Bilder, die die
 * Fläche an dieselbe Stelle der Wand hängen würde, werden eines, und das
 * zweite ist rot (`mountBlocked`). Was keinen Platz hat, wird übersprungen
 * und gezählt; zwei Stellen, die an **dieselbe** Stelle der Wand führen,
 * zählen als eine.
 *
 * @param target wo das Stück an dieser Stelle landete, oder `null` für „wie
 *   bisher, auf den Boden"
 * @param place hinstellen — mit der Stelle, oder `null` für die Stelle selbst
 */
export function decorArea<S extends { readonly x: number; readonly z: number }>(
  slots: readonly S[],
  target: (slot: S) => DecorSpot | null,
  place: (slot: S, spot: DecorSpot | null) => void,
): { placed: number; refused: number } {
  const hung = new Set<string>();
  let placed = 0;
  let refused = 0;
  for (const slot of slots) {
    const spot = target(slot);
    if (spot?.mounted) {
      const key = `${spot.x.toFixed(2)}/${spot.y.toFixed(2)}/${spot.z.toFixed(2)}`;
      if (hung.has(key)) continue;
      hung.add(key);
    }
    if (spot && !spot.valid) {
      refused += 1;
      continue;
    }
    place(slot, spot);
    placed += 1;
  }
  return { placed, refused };
}

// --- an eine schräge Wand -----------------------------------------------------

/**
 * **Eine Wand unter 45°** — die Mitte ihrer Grundlinie, die Richtung, in der
 * sie läuft (Einheitsvektor), die halbe Länge und die halbe Dicke. Die
 * Kastenrechnung oben kann sie nicht: Ein achsparalleler Kasten um eine
 * schräge Wand ist ein Quadrat, und an ein Quadrat hängt man nichts.
 */
export interface SlantWall {
  readonly x: number;
  readonly z: number;
  readonly dirX: number;
  readonly dirZ: number;
  readonly half: number;
  readonly thick: number;
  readonly bottom: number;
  readonly top: number;
}

/** Wo ein Wandstück an einer schrägen Wand hängt. */
export interface SlantMount {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /** Wie weit der Punkt vor der Fläche lag. */
  readonly distance: number;
}

/** Wie fein ein Wandstück entlang einer schrägen Wand einrastet, in Metern. */
export const SLANT_STEP = 0.25;

/**
 * **Wo ein Wandstück an der nächsten schrägen Wand hängt** — dieselben Regeln
 * wie `mountPose`, nur mit einer Normalen unter 45°: bis `MOUNT_REACH` vor der
 * Fläche, ganz auf ihr, auf Augenhöhe, die Vorderseite in den Raum.
 */
export function slantMountPose(
  x: number,
  z: number,
  walls: readonly SlantWall[],
  size: MountSize,
  floorY: number,
  alongX = true,
): SlantMount | null {
  let best: SlantMount | null = null;
  for (const wall of walls) {
    if (wall.half < size.halfWidth - 1e-6) continue;
    if (wall.bottom > floorY + 0.5 || wall.top < floorY + 1) continue;
    const rx = x - wall.x;
    const rz = z - wall.z;
    const along = rx * wall.dirX + rz * wall.dirZ;
    if (Math.abs(along) > wall.half + 0.25) continue;
    // Die Normale ist die Richtung, eine Vierteldrehung weiter — auf der
    // Seite, auf der der Punkt liegt.
    let nx = -wall.dirZ;
    let nz = wall.dirX;
    let across = rx * nx + rz * nz;
    if (across < 0) {
      nx = -nx;
      nz = -nz;
      across = -across;
    }
    const distance = across - wall.thick;
    if (distance < -0.3 || distance > MOUNT_REACH) continue;
    if (best && Math.abs(distance) >= Math.abs(best.distance)) continue;
    const room = wall.half - size.halfWidth;
    const slide = Math.max(-room, Math.min(room, Math.round(along / SLANT_STEP) * SLANT_STEP));
    const off = wall.thick + size.halfDepth + MOUNT_GAP;
    const yaw = Math.atan2(nx, nz);
    const face: WallFace = {
      axis: 'x',
      at: 0,
      normal: 1,
      from: -wall.half,
      to: wall.half,
      bottom: wall.bottom,
      top: wall.top,
    };
    best = {
      x: wall.x + wall.dirX * slide + nx * off,
      z: wall.z + wall.dirZ * slide + nz * off,
      y: mountHeight(floorY, size.height, face),
      yaw: alongX ? yaw : yaw - Math.PI / 2,
      distance,
    };
  }
  return best;
}

/**
 * **Ob ein Stück an einer schrägen Wand ein schon hängendes überdeckt** — die
 * Mitten beider in der Ebene und in der Höhe verglichen. Die Kästen der
 * anderen sind achsparallel; unter 45° reicht der Abstand der Mitten.
 */
export function slantBlocked(
  pose: { readonly x: number; readonly y: number; readonly z: number },
  size: MountSize,
  hung: readonly Box[],
): boolean {
  for (const box of hung) {
    const reach = Math.max(box.maxX - box.minX, box.maxZ - box.minZ) / 2;
    const tall = box.maxY - box.minY;
    // Ein Kasten, der viel größer ist als ein Bild, ist die Wand selbst.
    if (reach > 1.2 || tall > 2) continue;
    const flat = Math.hypot((box.minX + box.maxX) / 2 - pose.x, (box.minZ + box.maxZ) / 2 - pose.z);
    const high = Math.abs((box.minY + box.maxY) / 2 - pose.y);
    if (flat < size.halfWidth + reach * 0.7 - 0.02 && high < (size.height + tall) / 2 - 0.02)
      return true;
  }
  return false;
}
