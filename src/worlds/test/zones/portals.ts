import type { GridPlan } from '../../grid/gridPlan';
import { DIR_N, DIR_S, DIR_W } from '../../nav/navTile';
import { NAVIGATION, START } from '../layout';
import { DECK } from './podium';

/**
 * **Die Portaltafeln** — drei Stellen, an denen ein Portal haftet.
 *
 * Auf dem Gitter haftet ein Portal am **Boden** und an den hellen Tafeln
 * (`panel`, `grid/blocks.ts`) und sonst nirgends. Eine Wand aus hundert
 * Kachelstücken darf nicht portalfähig sein: Ein Portal darin öffnete das Haus
 * zum Nichts dahinter, und hundertfach eigene Kollisionsgruppen kostet
 * obendrein — davon gibt es zehn (`PhysicsWorld.ts`).
 *
 * **Drei Stellen und nicht eine**, weil ein Portal erst zu zweit etwas ist: Man
 * braucht zwei Flächen, die man beide sieht, und eine dritte, die man erst
 * findet. Eine davon steht deshalb **auf dem Podest** — ein Portal von dort
 * nach unten ist der kürzeste Weg, die Treppe zu übergehen, und genau das soll
 * man einmal ausprobiert haben.
 *
 * Die Tafeln stehen hier und nicht in ihren Zonen, weil sie **eine** Sache
 * sind: Wer eine vierte dazustellt, will die anderen drei daneben sehen.
 */
export function stampPortals(plan: GridPlan): void {
  // Am Startplatz, in der Ostkante seiner Nordwand — man sieht sie beim
  // Ankommen, und sie ist die, auf die man zurückschießt.
  plan.put('panel', START.x + START.w - 1, START.z, DIR_N);

  // Auf dem Podest, neben der Brüstung an der Nordkante: von hier geht es
  // hinunter, ohne die Treppe zu nehmen.
  plan.put('panel', DECK.x + 3, DECK.z, DIR_N, 1);

  // Und in der Navigationszone, an ihrer Westwand hinter dem Zielmast: die
  // dritte, die man erst findet.
  plan.put('panel', NAVIGATION.x, NAVIGATION.z + 5, DIR_W);
  // Sie braucht eine Wand hinter sich, sonst hängt sie über dem Gelände.
  plan.wall(NAVIGATION.x, NAVIGATION.z + 5, DIR_W);
  plan.wall(NAVIGATION.x, NAVIGATION.z + 4, DIR_W);
  plan.wall(NAVIGATION.x, NAVIGATION.z + 6, DIR_W);

  plan.putFixture({
    id: 'schild-portale',
    kind: 'sign',
    x: START.x + START.w - 2,
    z: START.z + START.d - 1,
    dir: DIR_S,
    props: { text: 'Portalwaffen am Gürtel — sie haften am Boden und an den hellen Tafeln' },
  });
}
