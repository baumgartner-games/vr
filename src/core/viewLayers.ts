import { LAYER_SELF_ONLY } from './PlayerAvatar';
import { LAYER_HUD } from '../ui/ScoreHud';

/**
 * Die Ebenenmaske für jede Sicht, die **nicht das Auge selbst** ist.
 *
 * Zwei Ebenen liegen quer zur normalen Sicht, und beide aus demselben Grund:
 * es gibt Dinge, die nur der eigene Blick sehen darf, und Dinge, die nur ein
 * zweiter Blick sehen darf. Der eigene **Körper** ist das zweite
 * (`LAYER_SELF_ONLY`) — man sieht seine Hände direkt, aber den Rumpf nur, wenn
 * man durch ein Portal oder in einen **Spiegel** schaut. Das **HUD** ist das
 * erste (`LAYER_HUD`): es klebt auf dem Glas vor diesem Auge und hat in einem
 * Bild, das anderswo entsteht, nichts verloren.
 *
 * Portalsichten und Spiegelbilder brauchen also dieselbe Maske, und sie stand
 * eine Weile nur im Portal-Renderer. Zwei Sichten mit derselben Regel an zwei
 * Stellen laufen irgendwann auseinander — dann sähe man sich im Spiegel ohne
 * Körper an, und das fiele erst in der Brille auf.
 */
export function viewLayers(mask: number): number {
  return (mask | (1 << LAYER_SELF_ONLY)) & ~(1 << LAYER_HUD);
}
