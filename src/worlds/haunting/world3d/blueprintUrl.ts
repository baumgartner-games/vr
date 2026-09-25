import { versioned } from '../../../core/assetVersion';
import { BLUEPRINT } from './blueprint';

/** Die Adresse des Vorlagenbilds — nur dynamisch geladen (`blueprintArt.ts`), wegen `import.meta`. */
export function blueprintUrl(): string {
  return versioned(`${import.meta.env.BASE_URL}${BLUEPRINT.file}`);
}
