# Projektwissen für Agenten

Siehe [AGENTS.md](AGENTS.md) — dort steht alles: Arbeitsregeln, Features,
vollständige Steuerung, Architektur, Portale, Netzwerk und Deployment.

Zwei Regeln daraus, die zu oft untergehen und deshalb auch hier stehen:
**alles geht direkt auf `main`** — und wer ausnahmsweise doch auf einem eigenen
Branch gearbeitet hat, **löscht ihn hinterher wieder**, lokal und auf `origin`
(`git push origin --delete <branch>`). Ein Branch, dessen Commits in `main`
stecken, bleibt nicht liegen.

Wessen Session gar nicht auf `main` pushen darf — Claude Code im Browser
bekommt einen Branch zugewiesen —, nimmt den Umweg aus AGENTS.md und geht ihn
zu Ende: Branch, Pull Request **ohne Draft**, nach grüner CI selbst mergen,
Branch löschen. Ein offener Pull Request ist kein Ergebnis.
