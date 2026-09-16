/**
 * **Die Seite als App** — der kleine Teil davon, der wirklich am Browser hängt.
 *
 * Zwei Dinge macht diese Datei, und beide sind Verdrahtung: Sie meldet den
 * Service Worker an (`src/sw.ts`), und sie hört auf das Angebot des Browsers,
 * die Seite zu installieren. **Was daraus folgt, rechnet `core/install.ts`**
 * — dort steht, wann ein Knopf dasteht und was er sagt, und dort steht der
 * Test dazu.
 *
 * Diese Datei wird von keinem Test importiert: Sie liest `import.meta.env`,
 * und das gibt es nur in Vite (dieselbe Regel wie für `import.meta.glob` in
 * `worlds/haunting/registry/discover.ts`).
 */
import { installState, isAppleHandheld, isStandalone, type InstallState } from './install';

/**
 * Das Ereignis, das Chrome und Edge schicken, statt selbst zu fragen. Es steht
 * in keiner Typdefinition des Browsers, weil es in keiner Norm steht — also
 * hier, mit genau den zwei Dingen, die davon gebraucht werden.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * **Den Service Worker anmelden.**
 *
 * Nur im fertigen Build: Im Entwicklungsbetrieb säße er zwischen Vite und der
 * Seite und lieferte Module aus, die man gerade geändert hat — der
 * unangenehmste Fehler, den man sich einbauen kann, weil er aussieht, als sei
 * die Änderung nicht angekommen. Wer ihn ausprobieren will, nimmt
 * `npm run build && npm run preview`.
 *
 * `updateViaCache: 'none'` sagt dem Browser, dass er den Service Worker selbst
 * nie aus seinem HTTP-Speicher nehmen soll: Er ist die Datei, an der ein neuer
 * Build hängt, und zehn Minuten alt ist dafür zu alt.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  void navigator.serviceWorker
    .register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
    .catch((error: unknown) => {
      // Kein Grund, die Spielwiese aufzuhalten: Ohne Service Worker läuft sie
      // wie vorher, nur eben nicht ohne Netz.
      console.warn('Service Worker nicht angemeldet:', error);
    });
}

/** Was `watchInstall` zurückgibt: den aktuellen Stand und den einen Knopf. */
export interface InstallOffer {
  /** Was gerade gilt. */
  state(): InstallState;
  /**
   * Den Browser fragen. Gibt zurück, ob installiert wurde; `false` auch dann,
   * wenn es gar kein Angebot gab — geworfen wird hier nichts, denn ein
   * Installationsangebot ist eine Bequemlichkeit.
   */
  install(): Promise<boolean>;
}

/**
 * **Auf das Angebot des Browsers hören** und bei jeder Änderung Bescheid sagen.
 *
 * Drei Dinge ändern den Stand, und alle drei kommen von außen: Der Browser
 * legt sein Angebot hin (`beforeinstallprompt`), jemand installiert
 * (`appinstalled`), oder die Seite läuft plötzlich als App — das passiert,
 * wenn man sie aus dem Startbildschirm heraus öffnet, und dann ist es eine
 * neue Seite. Der dritte Fall steht trotzdem hier: `display-mode` ist eine
 * Medienabfrage, und Medienabfragen ändern sich.
 */
export function watchInstall(onChange: (state: InstallState) => void): InstallOffer {
  let offer: InstallPromptEvent | null = null;

  const state = (): InstallState =>
    installState({
      standalone: isStandalone({
        matchMedia: (query) => window.matchMedia(query),
        // Die eine Behauptung, die kein Typ des Browsers kennt: Safari legt
        // seine Antwort seit jeher an den `navigator` und an keine Norm.
        standalone: (navigator as { standalone?: boolean }).standalone,
      }),
      offer: offer !== null,
      apple: isAppleHandheld(navigator),
    });

  const announce = (): void => onChange(state());

  window.addEventListener('beforeinstallprompt', (event) => {
    // Ohne dieses `preventDefault` zeigt Chrome seinen eigenen Streifen am
    // unteren Rand — und der verdeckt auf einem Telefon im Querformat genau
    // die Knöpfe, um die es hier geht.
    event.preventDefault();
    offer = event as InstallPromptEvent;
    announce();
  });

  window.addEventListener('appinstalled', () => {
    // Das Angebot ist mit dem Installieren verbraucht: Ein zweites Mal
    // annehmen lässt es sich nicht.
    offer = null;
    announce();
  });

  window.matchMedia?.('(display-mode: browser)').addEventListener?.('change', announce);

  // **Einmal sofort**, und zwar noch bevor irgendein Ereignis kommt: Auf
  // iPhone und iPad kommt nie eines, und der Satz zum Teilen-Menü stünde sonst
  // nirgends. Dass der Aufrufer seinen Zustand schon beim Anmelden bekommt,
  // spart ihm außerdem die zweite Zeile, die ihn noch einmal abfragt.
  announce();

  return {
    state,
    install: async () => {
      const pending = offer;
      if (!pending) return false;
      offer = null;
      try {
        await pending.prompt();
        const choice = await pending.userChoice;
        announce();
        return choice.outcome === 'accepted';
      } catch {
        announce();
        return false;
      }
    },
  };
}
