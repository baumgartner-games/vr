/**
 * **Einen Text mitnehmen** — und wenn der Browser das verbietet, wenigstens
 * markieren.
 *
 * Das stand zuerst im Netzpanel (`ui/NetPanel.ts`), weil dort der erste Knopf
 * namens *Kopieren* hing: ein Raum-Code, eine Chatzeile, ein Konfig-Code. Der
 * Katalog hat jetzt den zweiten — die Adresse eines Modells —, und damit war
 * die Frage entschieden, ob dieser Handgriff einmal oder zweimal im Haus
 * steht. Zweimal wäre er beim ersten Nachbessern auseinandergelaufen: Wer die
 * Ersatzantwort an einer Stelle verbessert, verbessert sie nicht an der
 * anderen, und der Unterschied fällt erst dem auf, der ihn erwischt.
 *
 * **Warum es überhaupt eine Ersatzantwort gibt.** `navigator.clipboard` ist
 * kein Versprechen: Ohne `https` und ohne Fokus im Dokument gibt es das Objekt
 * schlicht nicht, und dann wirft schon der Zugriff darauf. „Ging nicht" ist
 * aber die schlechteste aller Antworten auf einen Knopf namens *Kopieren* —
 * also wird der Text dann in ein unsichtbares Feld gelegt und **markiert**,
 * und `Strg+C` tut den Rest.
 */

/**
 * Was dabei herauskommt: `true`, wenn der Text wirklich in der Zwischenablage
 * liegt, `false`, wenn er nur markiert ist.
 *
 * Eine Zahl, kein Wurf: Der Aufrufer schreibt die Meldung, die zu seiner
 * Oberfläche passt — hier steht nur, was passiert ist.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    selectText(text);
    return false;
  }
}

/**
 * **Die ehrliche Zeile zum `false`** — überall dieselbe.
 *
 * Sie steht hier und nicht bei den Aufrufern, damit die Auskunft an jedem
 * Knopf gleich lautet: Wer einmal gelernt hat, was sie bedeutet, liest sie am
 * nächsten Knopf wieder.
 */
export const COPY_FALLBACK = 'Kopieren ging nicht — Text ist markiert, Strg+C.';

/**
 * Der letzte Ausweg: den Text in ein unsichtbares Feld legen und markieren.
 *
 * Damit funktioniert `Strg+C` auch dort, wo die Zwischenablage-API nicht zur
 * Verfügung steht — und das ist keine Ausnahme, sondern jede Seite, die nicht
 * über `https` läuft.
 */
function selectText(text: string): void {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  window.setTimeout(() => field.remove(), 30_000);
}
