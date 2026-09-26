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

Und: **Es wird aus vorhandenen Modellen gebaut** (KayKit-Regal), keine
eigenen Wände oder Klötze — außer, es ist ausdrücklich so gewünscht.

Wessen Session gar nicht auf `main` pushen darf — Claude Code im Browser
bekommt einen Branch zugewiesen —, nimmt den Umweg aus AGENTS.md und geht ihn
zu Ende: Branch, Pull Request **ohne Draft**, nach grüner CI selbst mergen,
Branch löschen. Ein offener Pull Request ist kein Ergebnis.
