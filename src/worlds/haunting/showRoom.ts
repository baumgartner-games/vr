import * as THREE from 'three';

/** Woran ein Knoten erkennt, dass `showRoom` ihn angehalten hat. */
const FROZEN = 'roomFrozen';
/** Was `showRoom` zuletzt für eine Gruppe entschieden hat. */
const SHOWN = 'roomShown';

/**
 * **Einen Raum zeigen oder ausblenden — samt seinen Matrizen.** three.js
 * rechnet in jedem Bild die Matrix jedes Knotens neu, der `matrixAutoUpdate`
 * trägt, sichtbar oder nicht; in der Station waren das über 5 000 Knoten, die
 * meisten in Räumen hinter drei Wänden. Gemeldet: _„leider hatte ich eben in
 * der übungsrunde eine fps von 18"_. Ein ausgeblendeter Raum steht still: Seine
 * Knoten rechnen nicht mehr, bis er wieder zu sehen ist — dann bekommen genau
 * die, die hier angehalten wurden, ihr `matrixAutoUpdate` zurück.
 */
export function showRoom(group: THREE.Object3D, shown: boolean): void {
  if (group.userData[SHOWN] === shown) return;
  group.userData[SHOWN] = shown;
  group.visible = shown;
  pauseMatrices(group, !shown);
}

/**
 * **Die Matrizen einer Gruppe anhalten oder wieder laufen lassen**, ohne an
 * ihrer Sichtbarkeit zu drehen — `showRoom` ohne das `visible`. Für Dinge, die
 * ihre Sichtbarkeit selbst führen, etwa die schlafenden Bots der Zentrale
 * (`CommandBots.setAwake`). Angehalten wird nur, was lief, und zurückgegeben
 * nur, was hier angehalten wurde.
 */
export function pauseMatrices(group: THREE.Object3D, paused: boolean): void {
  group.traverse((node) => {
    if (paused) {
      if (!node.matrixAutoUpdate) return;
      node.updateMatrix();
      node.matrixAutoUpdate = false;
      node.userData[FROZEN] = true;
    } else if (node.userData[FROZEN]) {
      node.matrixAutoUpdate = true;
      delete node.userData[FROZEN];
    }
  });
}

/**
 * **Für immer still**: Ein Teilbaum, der sich nach dem Bauen nie mehr bewegt,
 * rechnet weder seine Matrizen (`matrixAutoUpdate`) noch seine Weltmatrizen
 * (`matrixWorldAutoUpdate`) je Bild — dieselbe Überlegung wie
 * `GridWorld.freezeBatched` und `modelBatch.freeze`. Vorher wird einmal
 * gerechnet, also muss der Teilbaum schon an seinem Platz hängen.
 *
 * Gemessen hat `scene.updateMatrixWorld` in der Übungsrunde 3,7 ms je Bild
 * gekostet (`npm run perf:haunting`) — mehr als die ganze Weltrechnung;
 * gemeldet _„Bitte weiter optimieren, sodass ich auf 60fps kommen kann"_.
 *
 * Was später dazukommt (ein Modell, das nachlädt), läuft wie gewohnt: Es
 * rechnet seine Weltmatrix aus der festen des Elters. Und was `showRoom`
 * vorher angehalten hatte, gibt es danach nicht mehr frei.
 */
export function freezeTree(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    node.matrixAutoUpdate = false;
    node.matrixWorldAutoUpdate = false;
    delete node.userData[FROZEN];
  });
}

/**
 * **Eine Gruppe, die nie bewegt wird, rechnet ihre Matrix nicht mehr jedes
 * Bild.** Solange ein Vorfahre das tut, rechnet three.js darunter auch die
 * Weltmatrix jedes Kindes neu (`force`), angehalten oder nicht. Die Wurzeln
 * der Station stehen im Ursprung und rühren sich nicht.
 */
export function holdStill(group: THREE.Object3D): void {
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  group.updateMatrixWorld(true);
}

/**
 * **Der Matrizenlauf steigt nicht in Unsichtbares hinab.** three.js besucht
 * vor jedem Bild jeden Knoten der Szene, sichtbar oder nicht, und in der
 * Station ist über die Hälfte unsichtbar: Räume hinter Wänden (`showRoom`),
 * ihre Türen, schlafende Bots, die Einzelwände für die Ansicht von oben,
 * gebündelte Quader. Gemessen kostete der Lauf im echten Bild 3 ms, und das
 * nicht fürs Rechnen — in einer engen Schleife waren es 1 ms —, sondern fürs
 * Besuchen von 6 000 Knoten mit kaltem Speicher. Gemeldet: _„Bitte weiter
 * optimieren, sodass ich auf 60fps kommen kann"_.
 *
 * Wer übersprungen wird, bekommt `matrixWorldNeedsUpdate`: Sobald er wieder zu
 * sehen ist, rechnet er sich und alles unter sich einmal ganz neu. Ein Knoten
 * mit eigenem Lauf (Kamera, `SkinnedMesh`, `modelBatch`) behält seinen.
 *
 * Was das heißt: **Die Weltmatrix von etwas Unsichtbarem steht still**, bis es
 * wieder zu sehen ist. Wer sie trotzdem braucht, fragt `getWorldPosition` und
 * Verwandte — die rechnen ihre Kette selbst nach.
 */
export function skipHiddenMatrices(root: THREE.Object3D): void {
  root.updateMatrixWorld = updateShown;
}

// Nur zum Vergleichen, wer einen eigenen Lauf hat — aufgerufen wird sie nie lose.
// eslint-disable-next-line @typescript-eslint/unbound-method
const prototypeUpdate = THREE.Object3D.prototype.updateMatrixWorld;

function updateShown(this: THREE.Object3D, force?: boolean): void {
  if (this.matrixAutoUpdate) this.updateMatrix();
  if (this.matrixWorldNeedsUpdate || force) {
    if (this.matrixWorldAutoUpdate) {
      if (this.parent === null) this.matrixWorld.copy(this.matrix);
      else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    }
    this.matrixWorldNeedsUpdate = false;
    force = true;
  }
  const children = this.children;
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]!;
    if (!child.visible) {
      child.matrixWorldNeedsUpdate = true;
      continue;
    }
    if (child.updateMatrixWorld === prototypeUpdate) updateShown.call(child, force);
    else child.updateMatrixWorld(force);
  }
}
