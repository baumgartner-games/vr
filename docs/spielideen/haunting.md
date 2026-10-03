# Haunting / Orbital

> Eine Brille, zwei bis vier Handys, eine dunkle Raumstation und etwas, das
> darin herumläuft.

Technische Details: [docs/agents/haunting.md](../agents/haunting.md) ·
Bedienung und Start: [README](../../README.md#haunting--orbital--eine-quest-zwei-handys)

## Die Idee

Ein **asymmetrisches Koop-Horrorspiel für einen Abend mit Freunden**. Nur einer
hat eine VR-Brille — alle anderen spielen mit dem Handy mit, das sie sowieso
in der Tasche haben. Vorbilder: _Among Us_ (Station, Aufgaben, Karte),
_Keep Talking and Nobody Explodes_ (einer handelt, die anderen wissen etwas)
und _Alien: Isolation_ (ein Monster, das man nicht besiegt, sondern dem man
ausweicht).

Der Kern: **Niemand sieht alles.** Der Techniker in der Brille ist mitten
drin, sieht aber nur, was seine Taschenlampe trifft. Die Zentrale sieht die
Karte — aber jeder Platz nur einen Teil davon. Gewonnen wird nur, wenn alle
reden.

## Die Rollen

| Rolle | Gerät | Sieht | Tut |
| --- | --- | --- | --- |
| **Techniker** | VR-Brille (oder Bildschirm) | die Station aus den Augen, dunkel, mit Taschenlampe | läuft, sucht Kisten, repariert, versteckt sich |
| **Archiv** | Handy | ganze Station mit Fracht, Raumakten und Codes — aber **niemanden, der sich bewegt** | sagt, wo Teile liegen und wohin sie müssen |
| **Schalttafel** | Handy | Grundriss mit Türen und Lampen — aber **keine Wesen** | sperrt Türen, schaltet Licht (max. 2 Lampen, je 30 s) |
| **Späher** | Handy | alle 3,5 s eine Peilung: grün Techniker, rot Monster | warnt, wo das Monster gerade war |
| **Monster** | Handy (oder Bot) | nur, was das Monster sieht und hört | jagt den Techniker |
| **Zuschauer** | Handy/Laptop | die Station in 3D von schräg oben | schaut zu, sagt nichts |

Leere Plätze können Bots übernehmen.

## Eine Runde

1. **Lobby**: alle öffnen `#haunting`, gleicher Raum-Code, Rollen verteilen.
2. **Übungsrunde**: hell, ohne Uhr, ohne Treffer — zum Kennenlernen.
3. **Echte Runde**: Die Station ist dunkel, der Sauerstoff reicht **10 Minuten**.
   - **Ziel**: drei ausgefallene Systeme reparieren (Ersatzteil aus der
     richtigen Kiste holen, zur Konsole bringen, Rätsel lösen: Kabel, Folge,
     Frequenz) und zurück in die Einsatzzentrale.
   - **Verloren**: drei Treffer vom Monster oder die Zeit ist um.
   - **Hilfen**: Schutzschrank zum Verstecken, Schachtpassagen, Medkit,
     Schotts, die die Schalttafel zuwirft.
4. **Ende**: Sieg oder Niederlage, „Nochmal" oder zurück in die Übung.

## Was es besonders macht

- Das Handy ist **kein schlechterer Platz**, sondern ein anderes Spiel:
  Brettspiel-Karte statt 3D.
- Licht ist knapp und eine **Entscheidung** der Schalttafel, nicht
  selbstverständlich.
- Die Schalttafel weiß nicht, wen sie einsperrt — Türen zu sind Hilfe _und_
  Risiko.
- Kein Konto, kein Server: Raum-Code eintippen, fertig.

## Was noch fehlt — Stand Oktober 2026, Ziel: Spieleabend Mitte November

Zusammengetragen aus der Doku und den letzten Commits, **nicht** aus einem
echten Durchlauf. Der erste Punkt ist deshalb der wichtigste.

### Muss vor dem Spieleabend

- [ ] **Generalprobe mit echter Hardware**: Quest 3 + zwei bis drei Handys über
      WebRTC, eine komplette echte Runde. Laut `docs/orbital-qa.md` ist genau
      das noch nie passiert — bisher wurde am Mac im Browser geprüft.
      Am besten zweimal: einmal Anfang November (Zeit zum Reparieren), einmal
      eine Woche vorher.
- [ ] **Bildrate auf der Quest messen** — in der Station, mit Monster, mit
      Taschenlampe. Das Ruckeln wurde im September deutlich verbessert
      (19 ms → 4 ms je Bild), aber auf der Quest nie gemessen.
- [ ] **Die neue Station einmal ganz durchspielen**: Seit Oktober ist sie
      Kachel für Kachel nach der Vorlage gebaut, und Dekontamination,
      Reaktor, Fracht und Hydroponik kommen seit dem 2. Oktober aus dem
      Weltraum-Katalog. Prüfen: Sind alle Kisten und Konsolen erreichbar?
      Passen 10 Minuten noch zur Größe?
- [ ] **Ablauf für Neulinge testen**: Schafft jemand, der es nie gesehen hat,
      vom Link bis in die Runde zu kommen? (Lobby → Rolle → Übungsrunde →
      echte Runde). Eine Erklärung je Rolle in einem Satz bereithalten.
- [ ] **Deploy-Stopp vor dem Abend**: Nach jedem Update müssen alle Geräte neu
      laden (Protokollversion). Ein paar Tage vorher nichts mehr deployen.

### Sollte (spürbar besser zu zweit, dritt, viert)

- [ ] **Flackern der Lampen sieht nur der Gastgeber** — die anderen sehen den
      Raum nur plötzlich dunkel werden. Dafür müsste der Stand die Fristen
      der Lampen mitschicken (Protokollsprung).
- [ ] **Kompass zum Ziel fehlt in der Brille** — am Bildschirm gibt es ihn,
      in VR nicht (wäre ein Streifen an der Kamera wie die Statuszeile).
- [ ] **Kurze Ruckler beim Taschenlampen-Wechsel**: Jede neue Zahl von
      Lichtern übersetzt einmal alle Shader. Vorwärmen oder Lichtzahl fest
      halten.
- [ ] **Spiegel im Übungsdeck** kostet jedes Bild Zeit, solange es existiert.

### Kann (nach dem Abend)

- [ ] Gedanken des Monsters (Ziel, vermuteter Weg) für Zuschauer zeichnen —
      die Daten gibt es schon.
- [ ] Mehr Abwechslung je Runde: andere Stationen, andere Aufträge.
- [ ] Schwerelosigkeit / Außeneinsätze als eigener Modus.

## Offene Fragen

- Wie viele Leute kommen im November, und wer hat welches Gerät?
  Davon hängt ab, ob alle Plätze Menschen sind oder Bots aushelfen.
- Spielt jemand das Monster am Handy, oder der Bot? (Mensch ist lustiger,
  aber der Monster-Spieler sieht wenig vom Rest.)
- Soll es nach der Runde einen Rückblick geben (Weg des Monsters auf der
  Karte)? Das wäre der Moment, in dem alle lachen.
