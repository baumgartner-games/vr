# Die KayKit-Sammlung

In diesem Ordner liegt **fremde Arbeit**: „The Complete KayKit Collection v7"
von [Kay Lousberg](https://www.kaylousberg.com) — 23 Pakete, **gekauft**, und
alle unter [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
freigegeben: „free to use in personal, educational and commercial projects",
Namensnennung nicht verlangt. Der Wortlaut steht in `LICENSE.txt` — einmal hier
und noch einmal in **jedem** Paketordner, damit ein Paket auch dann seine Lizenz
dabei hat, wenn es jemand einzeln kopiert. Die Nennung steht trotzdem in
[`../CREDITS.md`](../CREDITS.md); diese Liste ist die Herkunftsliste und nicht
nur die Lizenznennung.

**Was hier liegt**: 4 470 Modelle in 23 Paketordnern, je eine `.glb`, zusammen
57 MB. Die Ordner sehen aus wie die Pakete des Zeichners — `dungeon/`,
`medieval-hexagon/units/blue/`, `mystery-monthly-4/11-may-2024-clown/` —, nur
kleingeschrieben und ohne Leerzeichen, Klammern und Umlaute: Das sind URLs. Die
**Dateinamen** sind dagegen die des Zeichners geblieben (`Orc_Axe.glb`), denn so
heißen die Dinge.

Die Texturen liegen **nicht** in den Modellen, sondern einmal je Paket in
`<paket>/textures/`; jede `.glb` zeigt mit einer relativen Adresse dorthin. Die
283 Modelle des Dungeon-Pakets teilen sich so **eine** Textur, statt 283 Kopien
davon zu tragen.

`index.json` ist das Inhaltsverzeichnis des ganzen Baums: je Ordner seine
Unterordner und seine Dateien mit Größe. Ein statischer Server liefert keine
Ordnerlisten, und 4 470 Adressen errät niemand.

**Einen Ordner gibt es nur einmal**: `character-animations/animations/`. Sechs
weitere Pakete liefern dieselbe Animationsbibliothek mit, byteweise dieselben
Dateien — die 22 Kopien bleiben draußen und sparen 5 MB.

**Gemacht hat das alles `tools/kaykit-model.mjs`** — von Hand, nicht bei jedem
Build. Die Rohsammlung (644 MB Zip mit 29 358 Dateien, darunter 994 MB
`.blend`, `.fbx`, `.obj` und `.mtl`) liegt **mit Absicht nicht im Repository**:
Was ein Browser davon laden kann, sind die 4 470 Modelle hier. Warum es ein
Ordner voller kleiner Dateien ist und kein gebündelter Katalog wie `diner.glb`,
steht in [`docs/agents/modelle.md`](../../../docs/agents/modelle.md).

**Von Hand wird hier nichts geändert.** Wer etwas anders haben will, ändert das
Werkzeug und lässt es noch einmal laufen; diese Datei ist das einzige, was es
dabei stehen lässt.
