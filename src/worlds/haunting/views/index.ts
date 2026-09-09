/**
 * **Rollenansichten** — die eine Tür in dieses Paket.
 *
 * Wer diese Datei importiert, hat die drei Geräte angemeldet (`*.register.ts`)
 * und ihr CSS geladen. `HauntingWorld` tut das **lazy** (wie die 2D-Welt), damit
 * das CSS aus den Jest-Läufen der Welt herausbleibt; Tests importieren die
 * Registrierungen einzeln.
 */
import './views.css';
import './archive.register';
import './panel.register';
import './scout.register';

export { ArchiveRole } from './archive';
export { PanelRole } from './panel';
export { ScoutRole, SCOUT_PERIOD, SCOUT_FLOOR, type ScoutMarker } from './scout';
export { RoleSwitcher, roundHost, PLAY_ID, type RunningRound } from './testRoles';
export { applySwitch } from './switchState';
export { extrasOf, type ViewExtras } from './extras';
