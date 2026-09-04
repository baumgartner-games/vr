# Projektwissen für Agenten

Siehe [AGENTS.md](AGENTS.md) — dort steht alles: Arbeitsregeln, Features,
vollständige Steuerung, Architektur, Portale, Netzwerk und Deployment.

Zwei Regeln daraus, die zu oft untergehen und deshalb auch hier stehen:
**alles geht direkt auf `main`** — und wer ausnahmsweise doch auf einem eigenen
Branch gearbeitet hat, **löscht ihn hinterher wieder**, lokal und auf `origin`
(`git push origin --delete <branch>`). Ein Branch, dessen Commits in `main`
stecken, bleibt nicht liegen.
