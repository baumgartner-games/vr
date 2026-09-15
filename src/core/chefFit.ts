/**
 * **Die Maße der Kochfigur** — ohne three.js, ohne Vite, ohne Datei.
 *
 * Getrennt von `core/chefModel.ts`, und zwar aus demselben Grund, aus dem
 * `worlds/haunting/registry/discover.ts` allein steht: Der Lader dort braucht
 * `import.meta` und `GLTFLoader`, und beides gibt es in Jest nicht. Was der
 * Rest des Spiels von der Figur wissen muss, sind drei Zahlen — und die
 * stehen hier, wo jeder Test sie lesen kann.
 *
 * Geschrieben werden sie von `tools/chef-model.mjs`: Das Werkzeug gibt sie
 * beim Aufbereiten aus, wer dort die Zielhöhe ändert, schreibt sie hier um.
 */

/**
 * **Wie hoch die Figur ist**, vom Boden bis zum Scheitel der Mütze, in Metern.
 *
 * Diese Zahl ist die Antwort auf die Frage, an der zwei Anläufe hingen. Der
 * Koch ist eine **Chibi-Figur**: Kopf und Mütze machen gut die Hälfte seiner
 * Höhe aus. Skaliert man ihn so, dass seine Augen auf der Augenhöhe eines
 * Menschen liegen, wird er 2,84 m hoch und sein Kopf allein einen Meter
 * breit — neben einem Tresen von einem Meter ein Riese im Puppenhaus. Das
 * wurde gebaut, nebeneinandergestellt und angesehen (`npm run avatar`).
 *
 * Also andersherum: **Die Figur bekommt die Größe, die zur Küche passt.**
 */
export const CHEF_HEIGHT = 1.6;

/**
 * **Auf welcher Höhe ihre Augen stehen** — und zwar immer.
 *
 * Früher kam die Höhe der Figur aus der des Spielerkopfes, und Ducken stauchte
 * sie mit. Das ist vorbei: Ihre Höhe hat mit seiner nichts mehr zu tun, also
 * ändert sich auch nichts, wenn er sich hinsetzt. Es gibt kein Bücken der
 * Figur mehr, und das ist eine Entscheidung und kein Versehen.
 */
export const CHEF_EYE = 0.914;

/** Woran der Maßstab hängt: die Augenhöhe eines stehenden Spielers. */
const PLAYER_EYE = 1.62;

/**
 * **Wie eine Pose des Spielers in den Raum der Figur kommt.**
 *
 * Der Spieler schaut aus 1,6 m, seine Figur aus 0,91 m. Eine Hand, die er auf
 * Brusthöhe hält, läge über dem Kopf seiner Figur, übernähme man sie
 * unbesehen. Gestaucht wird deshalb der **Abstand zum Kopf** — was er eine
 * Kopfhöhe unter seinen Augen hält, hält sie eine Kopfhöhe unter ihren.
 *
 * Derselbe Faktor sitzt auf den Handankern, damit ein Werkzeug darin mit der
 * Figur kleiner wird, statt in ihrer Faust zu stecken wie ein Balken.
 */
export const POSE_SCALE = CHEF_EYE / PLAYER_EYE;

/** Die Teile, in die `tools/chef-model.mjs` das Modell zerlegt. */
export type ChefPart = 'hat' | 'head' | 'body' | 'handLeft' | 'handRight';

export const CHEF_PARTS: readonly ChefPart[] = ['hat', 'head', 'body', 'handLeft', 'handRight'];

/**
 * Ob in dieser Umgebung überhaupt ein Modell geladen werden kann.
 *
 * In Jest gibt es kein WebGL und meistens kein `document`; ein Lader, der es
 * dort trotzdem versucht, zieht `GLTFLoader` und `import.meta` in den
 * Testlauf und bringt ihn zum Stehen. Die Frage wird deshalb **vor** dem
 * dynamischen Import gestellt und nicht danach.
 */
export function canLoadModels(): boolean {
  return typeof document !== 'undefined' && typeof WebGLRenderingContext !== 'undefined';
}
