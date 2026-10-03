# Restaurant

> Kochen mit den eigenen Händen, Gäste bedienen, zwischen den Tagen den Laden
> ausbauen.

Technische Details: [docs/agents/burgerladen.md](../agents/burgerladen.md) ·
[Test Restaurant](../agents/testrestaurant.md) ·
[Spielelemente](../agents/spielelemente.md)

## Die Idee

Ein Küchenspiel nach dem Vorbild von _PlateUp!_ und _Overcooked_ — aber in VR:
Man **greift** das Patty, legt es auf den Herd, schneidet den Salat mit dem
Brett vor sich, trägt den Teller zum Tisch. Was in diesen Spielen ein
Knopfdruck ist, ist hier eine Handbewegung. Vorbild für das Gefühl:
_Cooking Simulator VR_ / _Job Simulator_.

## Ein Tag

1. **Laden öffnen** mit der Glocke an der Durchreiche.
2. **Gäste** kommen herein, setzen sich und bestellen (Sprechblase mit Burger,
   Tischnummer, Geduldsbalken). Ab Tag 2 kommen auch Paare.
3. **Kochen**: Patty braten (verbrennt, wenn man es liegen lässt — Rauch,
   später schwarz), Salat und Tomate schneiden, auf einem Teller
   zusammenlegen. Dazu die Eisecke (Vanille, Erdbeere).
4. **Servieren**, der Gast isst, zahlt Preis plus Trinkgeld nach Geduld.
5. **Abwasch**: Schmutzige Teller abräumen, spülen — an einen Tisch mit
   Geschirr setzt sich niemand.
6. Drei Gäste zu lange warten lassen → **der Laden macht zu**.
7. **Ladenschluss**: Tagesbilanz, dann **Einrichten**: Baupläne kaufen
   (Tische, Stationen, Deko) und hinstellen. Nächster Tag.

## Stand Oktober 2026

- Im September wurde die Welt **neu aus dem Möbelkatalog** aufgebaut: Böden,
  Wände und die Küche stehen als Spielelemente.
- **Bewusst noch nicht drin**: Tische, Stühle, Gäste — die müssen erst als
  Möbel eingerichtet und geprüft werden. Der Spielablauf oben ist der von vor
  dem Umbau (Commit `56462b6`) und muss auf die neuen Elemente umziehen.
- Offen aus dem alten Spiel: nicht geteilt (jeder sieht seinen eigenen
  Laden), kein echtes Feuer am Herd, Gruppen nur zu zweit, Töne nur
  synthetisch.

## Wohin es wachsen kann

Ideen aus dem Oktober 2026, in der Reihenfolge, in der sie aufeinander aufbauen:

1. **Tische, Stühle, Gäste zurück** — als Spielelemente aus dem Katalog.
2. **Zusammen kochen**: der Laden wird geteilt, eine zweite Person (Brille oder
   Bildschirm) steht in derselben Küche — das ist der Overcooked-Kern.
3. **Handys spielen mit**: als Kellner von oben (Bestellungen tragen,
   abräumen) — oder als Party-Modus, in dem die Handys Chaos schicken
   (schwierige Gäste, Mäuse in der Vorratskammer), _Wipeout_-artig.
4. **Taverne** statt Burgerladen: dieselben Stationen in mittelalterlicher
   Hülle — Bar-Elemente, Zapfhahn, Fässer, die kleinen Mittelalter-Häuser aus
   dem Regal. Einrichten und Ausbauen mit dem Bau-Modus (Wände, Tapeten,
   Böden wie in Die Sims gibt es schon).
5. **Die kleine Stadt drumherum**: auf dem Markt Vorräte nachkaufen statt
   unendlicher Kisten; mit dem Gewinn neue Läden in der Stadt ansiedeln
   (Brauerei, Metzger, Gemüsebauer), die bessere oder billigere Zutaten
   liefern. Ein _kleines_ Stück Aufbauspiel, von oben am Diorama-Tisch — ohne
   Verkehrssimulation. Herumfahren ginge über die Kart-Zone.

## Offene Fragen

- Burger-Restaurant in der Gegenwart oder Taverne im Mittelalter? (Die
  Taverne passt zu mehr Modellen im Regal und zu einer Stadt drumherum.)
- Solo-Spiel mit Wirtschaft oder Party-Spiel mit Freunden? Beides geht, aber
  der erste Prototyp sollte sich für eins entscheiden.
- Wie groß darf die Stadt werden, bevor sie ein eigenes Spiel ist?
