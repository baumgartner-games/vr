import * as THREE from 'three';
import { hair, skin } from './chefStyle';
import type { HeadKind } from './avatarLook';

/**
 * **Bart, Schnauzer, Sommersprossen und Haar für den Kopf des _Modells_.**
 *
 * Das geladene Modell (`core/chefModel.ts`) hat **einen** Kopf. Er ist schön,
 * und er ist für alle vier Sorten derselbe: Schädel, Ohren, Augen, Nase, Mund,
 * jedes Mal gleich. Wer in der Umkleide von _Rund_ auf _Vollbart_ schaltete,
 * bekam deshalb genau eine Änderung zu sehen — den Hautton —, und die drei
 * anderen Köpfe waren der erste. Genau das war gemeint mit „der Kleiderschrank
 * zeigt nicht die relevanten Stellen".
 *
 * **Warum eine eigene Datei und nicht die Teile der gebauten Figur.** Der
 * naheliegende Weg war, die Merkmale aus `avatarLook.buildHead` abzuzweigen und
 * auf den Modellkopf zu skalieren. Das wurde gebaut, angesehen und wieder
 * verworfen: Die gebaute Figur hat einen **gefasten Würfel** als Schädel
 * (`chefStyle.squarish`), das Modell eine runde, flachere Kugel; die
 * Gesichtsfläche liegt woanders, das Kinn liegt woanders, und die Augen der
 * gebauten Figur sitzen unter der Mitte, die des Modells genau darauf. Ein Bart
 * mit dem Maß der einen auf der anderen ist ein schwarzer Klumpen über dem
 * halben Gesicht — so sah es aus.
 *
 * Gerechnet wird deshalb **in den Maßen des Modellkopfes selbst**, und die
 * kommen gemessen herein (`HeadBox`): Wer die Quelle austauscht, bekommt
 * dieselben Merkmale an denselben Stellen, ohne hier eine Zahl zu ändern.
 *
 * **Der Ursprung des Modellkopfes liegt zwischen den Augen** — nicht in seiner
 * Mitte. Das ist keine Willkür des Modellierers, sondern das, was `AvatarBody`
 * braucht: Die Pose, die ein Headset liefert, ist die der Augen.
 */

/** Die gemessene Hülle des Modellkopfes, in seinem eigenen Ursprung. */
export interface HeadBox {
  /** Halbe Breite, Ohren eingerechnet. */
  half: number;
  /** Oberkante des Schädels — darauf sitzt die Mütze. */
  crown: number;
  /** Unterkante, also das Kinn. */
  chin: number;
  /** Vorderkante: die Ebene, auf der Wangen und Sommersprossen liegen. */
  face: number;
  /** Und die Hinterkante. */
  back: number;
}

/** Die Hülle eines Kopfes auf die fünf Zahlen bringen, die hier zählen. */
export function headBox(box: THREE.Box3): HeadBox {
  return { half: box.max.x, crown: box.max.y, chin: box.min.y, face: box.min.z, back: box.max.z };
}

/**
 * Was auf einem Kopf sitzt — getrennt nach dem, was ein Hut verdeckt, und dem,
 * was er nicht verdeckt.
 */
export interface FaceMarks {
  /** Alles zusammen; hängt am Kopf des Modells. */
  group: THREE.Group;
  /**
   * **Das Haar auf dem Schädel** — Schopf und Pony.
   *
   * Es liegt in einer eigenen Gruppe, weil es unter einer Mütze nichts zu
   * suchen hat: Bei der gebauten Figur steckte es von selbst darin, am Modell
   * ragte es als brauner Fladen über den Mützenrand. `AvatarBody.setHeadgear`
   * schaltet es mit dem Hut aus (`crown.visible`).
   */
  crown: THREE.Group;
}

/** Das Haar zur Sorte — dieselben Farben wie an der gebauten Figur. */
const HAIR: Record<HeadKind, number> = {
  round: 0x6b4b2f,
  freckles: 0xc4632a,
  beard: 0x3a2a1e,
  moustache: 0x2e2620,
};

/** Wie weit ein Aufsatz vor der Haut schwebt, damit er nicht in ihr flimmert. */
const LIFT = 0.006;

/**
 * **Wo die Haut liegt**, bei `x`/`y` — als z, und damit als Tiefe.
 *
 * Der Schädel wird dafür als Ellipsoid genähert, und das ist keine Schlamperei,
 * sondern der Punkt: Wer eine Wange auf die **vorderste** Ebene des Kopfes legt
 * (`box.face`), legt sie dorthin, wo bei x = 0 die Nasenspitze sitzt — am
 * Rand des Gesichts schwebt sie dann acht Zentimeter davor. Genau so sah der
 * erste Versuch aus: zwei rote Scheiben neben dem Kopf.
 */
function onSkull(box: HeadBox, skull: number, x: number, y: number): number {
  const midY = (box.crown + box.chin) / 2;
  const midZ = (box.face + box.back) / 2;
  const ry = (box.crown - box.chin) / 2;
  const rz = (box.back - box.face) / 2;
  const inside = 1 - (x / skull) ** 2 - ((y - midY) / ry) ** 2;
  return midZ - rz * Math.sqrt(Math.max(0, inside));
}

export function faceMarks(kind: HeadKind, box: HeadBox): FaceMarks {
  const group = new THREE.Group();
  group.name = `chef-marks-${kind}`;
  const crown = new THREE.Group();
  crown.name = 'chef-crown';
  group.add(crown);

  const mane = hair(HAIR[kind]);
  // Der Schädel ohne Ohren: Die messen bei diesem Modell ein Sechstel der
  // Breite mit, und ein Bart, der bis an die Ohrspitzen reicht, ist eine
  // Sturmhaube.
  const skull = box.half * 0.82;

  switch (kind) {
    case 'round': {
      group.add(...blush(box, skull));
      crown.add(dome(mane, 0, box.crown * 0.62, box.face * 0.42, skull * 0.86, 0.34, 0.8));
      break;
    }

    case 'freckles': {
      const dot = skin(0xa9714b);
      // Über der Nase und auf den Wangen — sechs Punkte, zwei Reihen. Sie
      // liegen auf der **Gesichtsebene**, nicht auf einer gedachten Kugel:
      // Dieses Gesicht ist vorn flach.
      const spots: ReadonlyArray<readonly [number, number]> = [
        [-0.52, 0.06],
        [-0.34, -0.1],
        [-0.16, 0.02],
        [0.16, 0.02],
        [0.34, -0.1],
        [0.52, 0.06],
      ];
      for (const [x, y] of spots) {
        const freckle = new THREE.Mesh(new THREE.SphereGeometry(skull * 0.055, 8, 6), dot);
        freckle.position.set(
          skull * x,
          skull * y,
          onSkull(box, skull, skull * x, skull * y) + LIFT,
        );
        freckle.scale.set(1, 1, 0.45);
        group.add(freckle);
      }
      group.add(...blush(box, skull));
      // Zwei Zöpfe, die dem Schädel **anliegen** und bis unter das Kinn fallen.
      // Sie sitzen hinter den Ohren, nicht daneben: Ein Zopf vor dem Ohr ist
      // ein Stab, der neben dem Kopf schwebt.
      for (const sign of [-1, 1]) {
        const braid = new THREE.Mesh(
          new THREE.CapsuleGeometry(skull * 0.15, Math.abs(box.chin) * 0.85, 4, 10),
          mane,
        );
        braid.position.set(sign * skull * 0.78, box.chin * 0.5, box.back * 0.4);
        group.add(braid);
      }
      crown.add(dome(mane, 0, box.crown * 0.66, box.face * 0.3, skull * 0.95, 0.4, 0.92));
      break;
    }

    case 'beard': {
      // **Der Vollbart lässt die Nase frei.** Er umfasst Kinn und Kiefer und
      // reicht seitlich bis unter die Ohren — was darüber liegt, ist Gesicht.
      const beard = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mane);
      beard.scale.set(skull * 0.98, Math.abs(box.chin) * 0.62, (box.back - box.face) * 0.42);
      beard.position.set(0, box.chin * 0.72, (box.face + box.back) * 0.3);
      group.add(beard);
      group.add(...whiskers(box, skull, mane));
      // Die Koteletten schließen ihn an die Schläfen an.
      for (const sign of [-1, 1]) {
        const chop = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mane);
        chop.scale.set(skull * 0.16, Math.abs(box.chin) * 0.5, skull * 0.3);
        chop.position.set(sign * skull * 0.9, box.chin * 0.22, box.back * 0.1);
        group.add(chop);
      }
      break;
    }

    case 'moustache': {
      group.add(...whiskers(box, skull, mane));
      crown.add(dome(mane, 0, box.crown * 0.7, box.face * 0.36, skull * 0.9, 0.36, 0.86));
      break;
    }
  }

  return { group, crown };
}

/**
 * **Der Schnauzer** — zwei Lappen dicht unter der Nase, nach außen und unten
 * gelegt. Vollbart und Schnauzer teilen ihn sich: Er ist das Stück, das aus
 * einer Knollennase erst eine Nase macht.
 */
function whiskers(box: HeadBox, skull: number, material: THREE.Material): THREE.Mesh[] {
  return [-1, 1].map((sign) => {
    const half = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), material);
    half.scale.set(skull * 0.3, skull * 0.11, skull * 0.14);
    // Auf Höhe der Oberlippe: die Nase dieses Modells endet bei gut einem
    // Drittel zwischen Augen und Kinn.
    half.position.set(sign * skull * 0.26, box.chin * 0.46, box.face * 0.92);
    half.rotation.z = sign * 0.3;
    return half;
  });
}

/**
 * **Zwei Wangenflecken**, flach auf die Haut gelegt — nicht auf eine gedachte
 * Ebene vor dem Gesicht (`onSkull`).
 */
function blush(box: HeadBox, skull: number): THREE.Mesh[] {
  const colour = skin(0xe08a7a);
  const x = skull * 0.56;
  const y = box.chin * 0.42;
  return [-1, 1].map((sign) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(skull * 0.19, 12, 8), colour);
    cheek.scale.set(1, 0.78, 0.3);
    cheek.position.set(sign * x, y, onSkull(box, skull, x, y) + LIFT);
    return cheek;
  });
}

/**
 * **Haar auf dem Schädel** — eine gedrückte Kuppel über der Stirn, das eine
 * Stück, das eine Mütze verdeckt.
 */
function dome(
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  flat: number,
  deep: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  mesh.scale.set(1, flat, deep);
  mesh.position.set(x, y, z);
  return mesh;
}
