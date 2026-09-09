/**
 * **Eine Liste, in die jeder aus seiner eigenen Datei einträgt.**
 *
 * Fünf Pakete bauen heute Nacht nebeneinander an Haunting, und drei davon
 * wollen an dieselben zentralen Stellen: Rollen, Ansichtsmodi, Assets. Eine
 * gemeinsame `enum` oder ein `switch` in einer Sammeldatei wäre morgen früh
 * ein fünffacher Merge-Konflikt. Deshalb gibt es hier eine Registry, in die
 * jedes Paket **aus einer eigenen Datei** einträgt (`*.register.ts`,
 * eingesammelt von `discover.ts`); niemand fasst die Datei des anderen an.
 *
 * Sie ist absichtlich klein: eintragen, nachschlagen, aufzählen. Reihenfolge
 * ist die Eintragsreihenfolge, gebrochen durch `order`, damit ein Menü nicht
 * davon abhängt, in welcher Reihenfolge Vite Dateien findet.
 */
export interface Registered {
  readonly id: string;
  /** Kleiner steht weiter vorn; gleich bleibt Eintragsreihenfolge. */
  readonly order?: number;
}

export class Registry<T extends Registered> {
  private readonly entries = new Map<string, T>();
  private serial = 0;
  private readonly serials = new Map<string, number>();

  constructor(readonly name: string) {}

  /**
   * Eintragen. Eine zweite Anmeldung derselben Kennung **ersetzt** die erste
   * und warnt: Das ist bei Hot-Reload richtig und bei zwei Paketen, die
   * dieselbe Kennung wollen, wenigstens sichtbar.
   */
  register(entry: T): T {
    if (this.entries.has(entry.id)) {
      console.warn(`[registry ${this.name}] "${entry.id}" wird ersetzt`);
    } else {
      this.serials.set(entry.id, this.serial++);
    }
    this.entries.set(entry.id, entry);
    return entry;
  }

  unregister(id: string): void {
    this.entries.delete(id);
    this.serials.delete(id);
  }

  get(id: string): T | undefined {
    return this.entries.get(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Alle Einträge, nach `order` und dann nach Anmeldung sortiert. */
  list(): T[] {
    return [...this.entries.values()].sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        (this.serials.get(a.id) ?? 0) - (this.serials.get(b.id) ?? 0),
    );
  }

  /** Alles vergessen — nur für Tests. */
  clear(): void {
    this.entries.clear();
    this.serials.clear();
    this.serial = 0;
  }
}
