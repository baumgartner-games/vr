# Projektwissen für Agenten

Siehe [AGENTS.md](AGENTS.md) — dort stehen die **Arbeitsregeln** und der
**Wegweiser** über alles Übrige: Features, vollständige Steuerung, Architektur,
Portale, Netzwerk und Deployment. Die Kapitel selbst liegen in `docs/agents/`,
eines je Datei; `grep -rn "Stichwort" docs/agents/` sucht quer über alle.

Zwei Regeln daraus, die zu oft untergehen und deshalb auch hier stehen:
**alles geht direkt auf `main`** — und wer ausnahmsweise doch auf einem eigenen
Branch gearbeitet hat, **löscht ihn hinterher wieder**, lokal und auf `origin`
(`git push origin --delete <branch>`). Ein Branch, dessen Commits in `main`
stecken, bleibt nicht liegen.

Und: **Es wird aus vorhandenen Modellen gebaut** (Modellregal), keine
eigenen Wände oder Klötze — außer, es ist ausdrücklich so gewünscht. Möbel und
Stationen stellt eine Welt als **Spielelement** hin (`src/worlds/elements/`,
[Spielelemente](docs/agents/spielelemente.md)), das seine Zellen auf dem
2D-Gitter selbst sperrt, und nie als rohes Modell aus dem Regal.

Wessen Session gar nicht auf `main` pushen darf — Claude Code im Browser
bekommt einen Branch zugewiesen —, nimmt den Umweg aus AGENTS.md und geht ihn
zu Ende: Branch, Pull Request **ohne Draft**, nach grüner CI selbst mergen,
Branch löschen. Ein offener Pull Request ist kein Ergebnis.

**Bei visuellen Features 1–2 Bilder in den Chat** (`SendUserFile`), damit der
Besitzer es am Handy sieht: was die Brille betrifft, mit der simulierten VR
(`?xr=sim` oder _VR-Ansicht_), alles Allgemeine _von oben_. Näheres in
AGENTS.md unter den Arbeitsregeln.

**Tests nur für Kritisches** — oder für etwas, das **mehrfach** kaputtgegangen
ist. Gewünscht: _„nur für kritische Punkte Tests, oder wenn etwas mehrfach
auftritt, dass etwas nicht klappt."_ Kritisch heißt: Ein Fehler fällt im
Browser nicht auf (Navigation, Greifen, Boden, Portale, Netz) oder zerstört
etwas, das nicht zurückkommt (Speicherstände, App-Hülle). Ein Fehler, der zum
ersten Mal auftritt, wird repariert, nicht mit einem Test versehen; erst beim
zweiten Mal bekommt er einen. Die Liste und die Begründungen stehen in
[Tests](docs/agents/tests.md).
