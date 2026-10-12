import type * as THREE from 'three';

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
  group.traverse((node) => {
    if (!shown) {
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
