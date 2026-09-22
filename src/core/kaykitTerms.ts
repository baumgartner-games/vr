/**
 * **Das Wörterbuch der Sammlung** — dieselben Dinge auf Deutsch.
 *
 * Die KayKit-Pakete sind englisch beschriftet, Datei für Datei:
 * `barrel_large.glb`, `bookcase_single.glb`, `lantern.glb`,
 * `target_stand_A.glb`. Wer hier `fass`, `regal`, `laterne` oder
 * `zielscheibe` eintippt, fand bis eben nichts — und das ist keine kleine
 * Unbequemlichkeit, sondern der Unterschied zwischen einem Katalog, den man
 * durchsucht, und einem, durch den man blättert, bis man aufgibt. Gewünscht
 * war deshalb: „ich möchte zudem translations (deutsch, english) für die
 * kaykit elemente haben, sodass ich auch auf deutsch danach suchen kann."
 *
 * **Warum ein Wörterbuch und keine Übersetzung je Datei.** Viertausend-
 * vierhundertsiebzig Dateien mit einer deutschen Zeile daneben wären 4470
 * Zeilen, die niemand schreibt und erst recht niemand pflegt: Kommt ein Paket
 * dazu, fehlen tausend davon, und was fehlt, sieht man nicht — man findet es
 * nur nicht. Die Sammlung besteht aber gar nicht aus 4470 verschiedenen
 * Wörtern, sondern aus **913**, und davon trägt eine Handvoll hundert den
 * Löwenanteil: `rock` steht in 543 Namen, `hill` in 491, `tree` in 281. Also
 * hängt die Übersetzung an den **Wörtern** und nicht an den Dateien. Ein
 * neues Paket mit `barrel_small.glb` darin ist damit vom ersten Tag an
 * deutsch durchsuchbar, ohne dass jemand etwas nachträgt.
 *
 * **Wie die Liste entstanden ist.** Nicht aus dem Bauch: Ein Wegwerf-Skript
 * hat alle Dateinamen aus `public/models/kaykit/index.json` in Wörter
 * zerlegt, gezählt und nach Häufigkeit sortiert; von oben nach unten ist
 * abgearbeitet worden, was überhaupt etwas bedeutet. **Draußen bleibt, was
 * nichts heißt**: die Zählbuchstaben (`A`, `B`, `C`) und Zählziffern hinter
 * einem Namen, die Maßkürzel der Blockpakete (`4x4x2`), die Farbordner des
 * Waldes (`color1` … `color8`), Stilkürzel (`styleB`, `patternA`) und die
 * Handvoll Wörter, die auf Deutsch genauso heißen (`Hammer`, `Gold`,
 * `Park`, `Pizza`, `Zombie`, `Wolf`) — ein Eintrag, der ein Wort auf sich
 * selbst abbildet, kostet eine Zeile und bringt keinen einzigen Treffer.
 *
 * **Gemessen statt geschätzt**: 710 Einträge, und damit tragen **4433 der
 * 4470 Dateien** mindestens ein deutsches Wort im Namen — 99,2 %. Der Test
 * rechnet es über den echten Index nach und hält es über
 * `KAYKIT_TERM_COVERAGE`; eine Zahl im Kommentar, die niemand nachprüft,
 * wäre in einem halben Jahr eine Behauptung. Dass es so viele sind, ist
 * weder Zufall noch Verdienst: Die großen Pakete sind Gelände, und `rock`,
 * `hill`, `tree`, `grass`, `cliff` und die vier Farben stehen zusammen in
 * mehr als der Hälfte aller Namen. Die 37, die übrig bleiben, sind genau
 * das, was hier nicht hingehört: Eigennamen (`Paladin`, `Ninja`, `4GTN`,
 * `Clanker`) und Wörter, die auf Deutsch genauso heißen (`Hammer`, `Lava`,
 * `Sand`, `Taco`, `Ketchup`) — ein Eintrag `sand: ['Sand']` bringt keinen
 * einzigen Treffer, den es nicht schon gibt, und ein Test besteht darauf
 * (_bildet kein Wort auf sich selbst ab_).
 *
 * **Deutsche Wörter dürfen Umlaute haben.** Getippt wird gegen die Faltung
 * des Zerteilers (`core/kaykitIndex.terms`, `ä→a`, `ö→o`, `ü→u`, `ß→ss`) —
 * `Fässer` findet also, wer `fässer` schreibt, und genauso, wer auf einem
 * englischen Pad `fasser` tippt. Deshalb steht hier die richtige Schreibweise
 * und nicht die getippte: Die Zeile im Steckbrief liest ein Mensch.
 *
 * Reine Rechnung, ohne three.js und ohne Datei — wie alles, woran die Suche
 * hängt.
 */

/**
 * **Wie viel der Sammlung ein deutsches Wort tragen muss.**
 *
 * Neunundneunzig Prozent, gemessen an den Dateinamen des echten Index
 * (`kaykitIndex.test.ts`, _das Wörterbuch_). Die Schwelle steht hier und
 * nicht im Test, weil sie eine **Zusage** ist und keine Messung: Wer ein
 * Paket dazunimmt, dessen Wörter niemand übersetzt hat, soll das nicht erst
 * merken, wenn jemand vergeblich `laterne` tippt.
 *
 * Hundert Prozent wären die falsche Zahl. Ein Eigenname wie `Paladin` hat
 * keine Übersetzung, und ein Eintrag `hammer: ['Hammer']` bringt keinen
 * Treffer, den es nicht schon gibt — er verlängert nur die Liste.
 */
export const KAYKIT_TERM_COVERAGE = 0.99;

/**
 * **Englisch, wie es in den Dateinamen steht → Deutsch.**
 *
 * Der Schlüssel ist genau das Wort, das im Namen vorkommt, klein geschrieben:
 * Gelesen wird gegen dieselbe Zerlegung, die auch die Schubladen benutzen
 * (`kaykitCategoriesOf`), und die kennt nur Kleinbuchstaben und Ziffern.
 *
 * **Mehrere deutsche Wörter sind der Normalfall und nicht die Ausnahme**:
 * `crate` ist eine Kiste und ein Verschlag, `barrel` ein Fass und eine Tonne,
 * `rock` ein Stein und ein Fels. Alle zählen für die Suche gleich viel; für
 * die **Anzeige** zählt nur das erste (`kaykitGerman`), denn eine Kachel
 * unter einem Namen ist eine Beschriftung und kein Thesaurus.
 *
 * Plural und Einzahl stehen beide da, wo beide in Dateinamen vorkommen
 * (`barrel`/`barrels`) — welcher Eintrag dann gesucht wird, entscheidet
 * `KAYKIT_ENGLISH` und nicht der, der tippt.
 */
export const KAYKIT_TERMS: Readonly<Record<string, readonly string[]>> = {
  // ---- Natur und Gelände -------------------------------------------------
  // Die größte Gruppe der Sammlung: Das Waldpaket allein bringt rund 1588
  // Modelle mit, und das Sechseck-Gelände noch einmal ein paar hundert.
  rock: ['Stein', 'Fels'],
  rocks: ['Steine', 'Felsen'],
  rocky: ['Felsig', 'Steinig'],
  stone: ['Stein'],
  hill: ['Hügel'],
  hills: ['Hügel'],
  cliff: ['Klippe', 'Felswand'],
  mountain: ['Berg'],
  coast: ['Küste'],
  tree: ['Baum'],
  trees: ['Bäume'],
  trunk: ['Stamm', 'Baumstamm'],
  log: ['Baumstamm', 'Scheit'],
  logs: ['Baumstämme', 'Scheite'],
  pine: ['Kiefer', 'Tanne'],
  bush: ['Busch', 'Strauch'],
  bushes: ['Büsche', 'Sträucher'],
  grass: ['Gras', 'Wiese'],
  weeds: ['Unkraut'],
  flower: ['Blume', 'Blüte'],
  plant: ['Pflanze'],
  waterplant: ['Wasserpflanze'],
  waterlily: ['Seerose'],
  berry: ['Beere'],
  berries: ['Beeren'],
  mushroom: ['Pilz'],
  mushrooms: ['Pilze'],
  cactus: ['Kaktus'],
  flax: ['Flachs', 'Lein'],
  hay: ['Heu'],
  haybale: ['Heuballen'],
  bale: ['Ballen'],
  grain: ['Getreide', 'Korn'],
  water: ['Wasser'],
  waterless: ['Trocken', 'Wasserlos'],
  river: ['Fluss'],
  snow: ['Schnee'],
  snowball: ['Schneeball'],
  cloud: ['Wolke'],
  fire: ['Feuer'],
  campfire: ['Lagerfeuer'],
  dirt: ['Erde', 'Dreck'],
  gravel: ['Kies', 'Schotter'],
  terrain: ['Gelände'],
  hex: ['Sechseck'],
  hole: ['Loch'],

  // ---- Bauen, Gebäude, Bauteile -----------------------------------------
  building: ['Gebäude', 'Haus'],
  house: ['Haus'],
  home: ['Zuhause', 'Heim'],
  structure: ['Bauwerk'],
  foundation: ['Fundament'],
  basemodule: ['Grundmodul'],
  roofmodule: ['Dachmodul'],
  module: ['Modul'],
  wall: ['Wand', 'Mauer'],
  walled: ['Ummauert'],
  floor: ['Boden', 'Fußboden'],
  ceiling: ['Decke'],
  roof: ['Dach'],
  overhang: ['Überhang'],
  door: ['Tür'],
  doorway: ['Türöffnung', 'Durchgang'],
  gate: ['Tor'],
  gated: ['Vergittert'],
  entry: ['Eingang'],
  window: ['Fenster'],
  archedwindow: ['Bogenfenster'],
  arch: ['Bogen', 'Torbogen'],
  arched: ['Gewölbt'],
  pillar: ['Säule', 'Pfeiler'],
  pillars: ['Säulen', 'Pfeiler'],
  column: ['Säule'],
  beam: ['Balken', 'Träger'],
  beams: ['Balken', 'Träger'],
  bracing: ['Verstrebung'],
  strut: ['Strebe'],
  stairs: ['Treppe', 'Stufen'],
  railing: ['Geländer'],
  bars: ['Stäbe', 'Gitterstäbe'],
  grate: ['Rost', 'Gitter'],
  grates: ['Roste', 'Gitter'],
  fence: ['Zaun'],
  barrier: ['Absperrung', 'Schranke'],
  scaffold: ['Gerüst'],
  scaffolding: ['Gerüst'],
  bricks: ['Ziegel', 'Backsteine'],
  brick: ['Ziegel', 'Backstein'],
  plank: ['Brett', 'Planke'],
  planks: ['Bretter', 'Planken'],
  lumber: ['Bauholz'],
  wood: ['Holz'],
  wooden: ['Hölzern', 'Holz'],
  metal: ['Metall'],
  metalframe: ['Metallrahmen'],
  glass: ['Glas'],
  plastic: ['Plastik', 'Kunststoff'],
  iron: ['Eisen'],
  copper: ['Kupfer'],
  silver: ['Silber'],
  rubble: ['Schutt', 'Trümmer'],
  road: ['Straße'],
  path: ['Weg', 'Pfad'],
  crossing: ['Kreuzung', 'Übergang'],
  junction: ['Abzweig', 'Kreuzung'],
  bridge: ['Brücke'],
  tower: ['Turm'],
  watchtower: ['Wachturm'],
  watertower: ['Wasserturm'],
  castle: ['Burg', 'Schloss'],
  church: ['Kirche'],
  tavern: ['Taverne', 'Wirtshaus'],
  market: ['Markt'],
  barracks: ['Kaserne'],
  blacksmith: ['Schmiede', 'Schmied'],
  lumbermill: ['Sägewerk'],
  watermill: ['Wassermühle'],
  windmill: ['Windmühle'],
  shipyard: ['Werft'],
  docks: ['Hafen'],
  stables: ['Stall', 'Ställe'],
  townhall: ['Rathaus'],
  workshop: ['Werkstatt'],
  well: ['Brunnen'],
  mine: ['Bergwerk'],
  mining: ['Bergbau'],
  farm: ['Bauernhof'],
  tent: ['Zelt'],
  shrine: ['Schrein'],
  crypt: ['Gruft'],
  maze: ['Labyrinth'],
  platform: ['Plattform', 'Podest'],
  podium: ['Podest'],
  stage: ['Bühne'],
  tile: ['Kachel', 'Fliese'],
  tiles: ['Kacheln', 'Fliesen'],
  dome: ['Kuppel'],
  vault: ['Tresor', 'Gewölbe'],

  // ---- Möbel und Haushalt ------------------------------------------------
  chair: ['Stuhl'],
  armchair: ['Sessel'],
  couch: ['Sofa'],
  stool: ['Hocker', 'Schemel'],
  footstool: ['Fußhocker'],
  bar: ['Theke', 'Tresen'],
  bartop: ['Tresenplatte'],
  bench: ['Bank'],
  table: ['Tisch'],
  tablecloth: ['Tischdecke'],
  desk: ['Schreibtisch'],
  workbench: ['Werkbank'],
  bed: ['Bett'],
  pillow: ['Kissen'],
  pillows: ['Kissen'],
  shelf: ['Regal', 'Bord'],
  shelves: ['Regale'],
  bookcase: ['Bücherregal', 'Regal'],
  cabinet: ['Schrank'],
  locker: ['Spind'],
  drawers: ['Schubladen'],
  lamp: ['Lampe'],
  lantern: ['Laterne'],
  streetlight: ['Straßenlaterne'],
  candle: ['Kerze'],
  candles: ['Kerzen'],
  torch: ['Fackel'],
  lights: ['Lichter'],
  lit: ['Beleuchtet', 'Angezündet'],
  carpet: ['Teppich'],
  rug: ['Teppich', 'Läufer'],
  curtains: ['Vorhänge', 'Gardinen'],
  textiles: ['Textilien', 'Stoffe'],
  pictureframe: ['Bilderrahmen'],
  picture: ['Bild'],
  frame: ['Rahmen'],
  plaque: ['Tafel', 'Plakette'],
  hourglass: ['Sanduhr'],
  broom: ['Besen'],
  bucket: ['Eimer'],
  trash: ['Müll', 'Abfall'],
  trashcan: ['Mülleimer'],
  dumpster: ['Müllcontainer'],
  towelrail: ['Handtuchhalter'],
  papertowel: ['Küchenrolle', 'Papiertuch'],
  throne: ['Thron'],
  hook: ['Haken'],
  hanger: ['Bügel'],
  chain: ['Kette'],
  chainlink: ['Kettenglied'],
  chainlinks: ['Kettenglieder'],
  rope: ['Seil'],
  ladder: ['Leiter'],

  // ---- Küche, Essen und Trinken ------------------------------------------
  kitchen: ['Küche'],
  kitchencounter: ['Küchentheke'],
  kitchencabinet: ['Küchenschrank'],
  kitchentable: ['Küchentisch'],
  countertop: ['Arbeitsplatte'],
  backsplash: ['Spritzschutz'],
  extractorhood: ['Dunstabzugshaube'],
  stove: ['Herd'],
  woodstove: ['Holzofen'],
  oven: ['Backofen', 'Ofen'],
  fridge: ['Kühlschrank'],
  sink: ['Spüle', 'Waschbecken'],
  dishrack: ['Abtropfgestell'],
  cuttingboard: ['Schneidebrett'],
  rollingpin: ['Nudelholz'],
  pan: ['Pfanne'],
  pot: ['Topf'],
  cauldron: ['Kessel'],
  mortar: ['Mörser'],
  pestle: ['Stößel'],
  knife: ['Messer'],
  spoon: ['Löffel'],
  scoop: ['Kugel', 'Löffel'],
  plate: ['Teller'],
  plates: ['Teller'],
  plated: ['Angerichtet'],
  bowl: ['Schüssel', 'Schale'],
  cup: ['Tasse', 'Becher'],
  cups: ['Tassen', 'Becher'],
  mug: ['Becher', 'Krug'],
  goblet: ['Kelch'],
  drinkinghorn: ['Trinkhorn'],
  bottle: ['Flasche'],
  waterbottle: ['Wasserflasche'],
  jar: ['Glas', 'Krug'],
  keg: ['Fass'],
  can: ['Dose'],
  jerrycan: ['Kanister'],
  food: ['Essen', 'Nahrung'],
  ingredient: ['Zutat'],
  dinner: ['Abendessen'],
  menu: ['Speisekarte'],
  bun: ['Brötchen'],
  buns: ['Brötchen'],
  dough: ['Teig'],
  flour: ['Mehl'],
  cheese: ['Käse'],
  ham: ['Schinken'],
  chicken: ['Huhn', 'Hähnchen'],
  fish: ['Fisch'],
  lettuce: ['Salat'],
  onion: ['Zwiebel'],
  onions: ['Zwiebeln'],
  potato: ['Kartoffel'],
  potatoes: ['Kartoffeln'],
  carrot: ['Karotte', 'Möhre'],
  carrots: ['Karotten', 'Möhren'],
  tomato: ['Tomate'],
  tomatoes: ['Tomaten'],
  melon: ['Melone'],
  apple: ['Apfel'],
  apples: ['Äpfel'],
  cherry: ['Kirsche'],
  cherries: ['Kirschen'],
  strawberry: ['Erdbeere'],
  pumpkin: ['Kürbis'],
  pepperoni: ['Salami'],
  sauce: ['Soße'],
  mustard: ['Senf'],
  stew: ['Eintopf'],
  slice: ['Scheibe', 'Stück'],
  slices: ['Scheiben', 'Stücke'],
  chunks: ['Brocken', 'Stücke'],
  grated: ['Gerieben'],
  mashed: ['Püriert'],
  chopped: ['Gehackt'],
  cooked: ['Gekocht', 'Gegart'],
  uncooked: ['Roh'],
  burnt: ['Verbrannt'],
  milk: ['Milch'],
  icecream: ['Eis', 'Speiseeis'],
  softserve: ['Softeis'],
  waffle: ['Waffel'],
  waffles: ['Waffeln'],
  cookie: ['Keks'],
  chocolate: ['Schokolade'],
  candy: ['Bonbon', 'Süßigkeit'],
  candycane: ['Zuckerstange'],
  candycorn: ['Zuckermais'],
  lollipop: ['Lutscher'],
  gumball: ['Kaugummi'],
  gingerbread: ['Lebkuchen'],
  peppermint: ['Pfefferminz'],
  vanilla: ['Vanille'],
  potion: ['Trank', 'Zaubertrank'],
  potionstation: ['Trankstation'],

  // ---- Kisten, Behälter, Ladung ------------------------------------------
  crate: ['Kiste', 'Verschlag'],
  crates: ['Kisten'],
  box: ['Kiste', 'Schachtel'],
  chest: ['Truhe'],
  barrel: ['Fass', 'Tonne'],
  barrels: ['Fässer', 'Tonnen'],
  container: ['Behälter'],
  containers: ['Behälter'],
  basket: ['Korb'],
  sack: ['Beutel'],
  backpack: ['Rucksack'],
  bag: ['Tasche', 'Beutel'],
  pallet: ['Palette'],
  cargo: ['Fracht', 'Ladung'],
  cargodepot: ['Frachtlager'],
  lid: ['Deckel'],
  cap: ['Kappe', 'Deckel'],
  pile: ['Haufen'],
  stack: ['Stapel'],
  stacks: ['Stapel'],
  stacked: ['Gestapelt'],
  trough: ['Trog'],
  packed: ['Verpackt'],
  filled: ['Gefüllt'],
  covered: ['Bedeckt'],
  bundle: ['Bündel'],

  // ---- Waffen und Kampf --------------------------------------------------
  sword: ['Schwert'],
  dagger: ['Dolch'],
  blade: ['Klinge'],
  axe: ['Axt', 'Beil'],
  mace: ['Streitkolben'],
  club: ['Keule'],
  halberd: ['Hellebarde'],
  spear: ['Speer'],
  scythe: ['Sense'],
  pitchfork: ['Mistgabel', 'Heugabel'],
  bow: ['Bogen'],
  crossbow: ['Armbrust'],
  arrow: ['Pfeil'],
  arrows: ['Pfeile'],
  quiver: ['Köcher'],
  shield: ['Schild'],
  helmet: ['Helm'],
  cape: ['Umhang'],
  gun: ['Waffe', 'Pistole'],
  pistol: ['Pistole'],
  rifle: ['Gewehr'],
  shotgun: ['Schrotflinte'],
  sniper: ['Scharfschütze'],
  cannon: ['Kanone'],
  cannonball: ['Kanonenkugel'],
  catapult: ['Katapult'],
  bomb: ['Bombe'],
  smokebomb: ['Rauchbombe'],
  grenade: ['Granate'],
  dynamite: ['Dynamit'],
  ammo: ['Munition'],
  bullet: ['Patrone', 'Kugel'],
  magazine: ['Magazin'],
  projectile: ['Geschoss'],
  muzzleflash: ['Mündungsfeuer'],
  laserbeam: ['Laserstrahl'],
  combat: ['Kampf'],
  range: ['Reichweite'],
  turret: ['Geschützturm'],
  trap: ['Falle'],
  spikes: ['Stacheln', 'Spitzen'],
  spikeblock: ['Stachelblock'],
  spikeball: ['Stachelkugel'],
  spikeroller: ['Stachelwalze'],
  weaponrack: ['Waffenständer'],
  fistweapon: ['Faustwaffe'],
  wand: ['Zauberstab'],
  staff: ['Stab'],
  spellbook: ['Zauberbuch'],
  target: ['Zielscheibe', 'Ziel'],
  archeryrange: ['Schießstand'],
  trainingdummy: ['Trainingspuppe'],
  safetynet: ['Fangnetz', 'Sicherheitsnetz'],

  // ---- Werkzeug und Werkstatt --------------------------------------------
  wrench: ['Schraubenschlüssel'],
  screwdriver: ['Schraubenzieher'],
  screw: ['Schraube'],
  nail: ['Nagel'],
  saw: ['Säge'],
  sawblade: ['Sägeblatt'],
  mallet: ['Holzhammer'],
  anvil: ['Amboss'],
  chisel: ['Meißel'],
  file: ['Feile'],
  handplane: ['Hobel'],
  handdrill: ['Handbohrer'],
  drill: ['Bohrer'],
  pickaxe: ['Spitzhacke'],
  pickaxes: ['Spitzhacken'],
  shovel: ['Schaufel', 'Spaten'],
  trowel: ['Kelle'],
  tongs: ['Zange'],
  scissors: ['Schere'],
  grindstone: ['Schleifstein'],
  magnifying: ['Lupe'],
  toolcart: ['Werkzeugwagen'],
  tools: ['Werkzeuge'],
  glue: ['Kleber', 'Leim'],
  blueprint: ['Bauplan'],
  compass: ['Kompass'],
  key: ['Schlüssel'],
  keyring: ['Schlüsselbund'],
  lock: ['Schloss'],
  lockpick: ['Dietrich'],
  shackle: ['Fessel'],
  lever: ['Hebel'],
  button: ['Knopf', 'Taste'],
  spring: ['Feder', 'Sprungfeder'],
  cog: ['Zahnrad'],
  pipe: ['Rohr'],
  fishing: ['Angeln', 'Fischen'],
  rod: ['Rute', 'Stange'],
  tacklebox: ['Angelkoffer'],
  net: ['Netz'],
  mesh: ['Geflecht', 'Netz'],
  extinguisher: ['Feuerlöscher'],
  firehydrant: ['Hydrant'],
  wheelbarrow: ['Schubkarre'],
  machine: ['Maschine'],
  conveyor: ['Förderband'],
  fuel: ['Treibstoff', 'Brennstoff'],
  battery: ['Batterie'],
  power: ['Strom', 'Kraft'],
  resource: ['Rohstoff'],
  nugget: ['Klumpen'],
  nuggets: ['Klumpen'],
  parts: ['Teile'],
  pieces: ['Teile', 'Stücke'],

  // ---- Figuren und Wesen -------------------------------------------------
  character: ['Figur', 'Charakter'],
  unit: ['Einheit'],
  knight: ['Ritter'],
  blackknight: ['Schwarzer Ritter'],
  warrior: ['Krieger'],
  barbarian: ['Barbar'],
  rogue: ['Schurke', 'Dieb'],
  mage: ['Magier', 'Zauberer'],
  druid: ['Druide'],
  cleric: ['Kleriker', 'Priester'],
  necromancer: ['Totenbeschwörer'],
  ranger: ['Waldläufer'],
  marksman: ['Schütze'],
  engineer: ['Ingenieur', 'Techniker'],
  merchant: ['Händler', 'Kaufmann'],
  farmer: ['Bauer', 'Landwirt'],
  hiker: ['Wanderer'],
  caveman: ['Höhlenmensch'],
  witch: ['Hexe'],
  vampire: ['Vampir'],
  werewolf: ['Werwolf'],
  skeleton: ['Skelett', 'Gerippe'],
  skeletons: ['Skelette'],
  skull: ['Schädel', 'Totenkopf'],
  bone: ['Knochen'],
  ribcage: ['Brustkorb'],
  orc: ['Ork'],
  orcraider: ['Orkräuber'],
  orcbrute: ['Orkschläger'],
  monstrosity: ['Ungeheuer'],
  minion: ['Handlanger', 'Diener'],
  plantwarrior: ['Pflanzenkrieger'],
  toysoldier: ['Spielzeugsoldat'],
  superhero: ['Superheld'],
  spaceranger: ['Weltraumheld'],
  combatmech: ['Kampfroboter'],
  robot: ['Roboter'],
  mannequin: ['Schaufensterpuppe', 'Puppe'],
  dummy: ['Attrappe', 'Puppe'],
  scarecrow: ['Vogelscheuche'],
  snowman: ['Schneemann'],
  king: ['König'],
  queen: ['Dame', 'Königin'],
  bishop: ['Läufer'],
  rook: ['Turm'],
  pawn: ['Bauer'],
  driver: ['Fahrer'],
  helper: ['Helfer'],
  protagonist: ['Hauptfigur'],
  survivalist: ['Überlebenskünstler'],
  lorekeeper: ['Chronist'],
  hoarder: ['Sammler'],
  magicalgirl: ['Zaubermädchen'],
  avianswordsman: ['Vogelschwertkämpfer'],
  monstercostume: ['Monsterkostüm'],
  man: ['Mann'],
  head: ['Kopf'],
  hooded: ['Kapuze'],
  horse: ['Pferd'],
  dog: ['Hund'],
  bat: ['Fledermaus'],
  worm: ['Wurm'],

  // ---- Spiel, Freizeit, Karten und Würfel --------------------------------
  card: ['Karte'],
  playercard: ['Spielerkarte'],
  playerstand: ['Spielerständer'],
  hearts: ['Herz'],
  heart: ['Herz'],
  spades: ['Pik'],
  clubs: ['Kreuz'],
  diamonds: ['Karo'],
  diamond: ['Diamant', 'Raute'],
  ace: ['Ass'],
  jack: ['Bube'],
  chess: ['Schach'],
  board: ['Brett'],
  token: ['Marke', 'Spielstein'],
  meeple: ['Spielfigur'],
  chip: ['Jeton', 'Spielmarke'],
  coin: ['Münze'],
  coins: ['Münzen'],
  money: ['Geld'],
  bill: ['Geldschein'],
  bills: ['Geldscheine'],
  gem: ['Edelstein', 'Juwel'],
  gems: ['Edelsteine'],
  ball: ['Kugel'],
  football: ['Fußball'],
  hoop: ['Korb', 'Reifen'],
  guitar: ['Gitarre'],
  trumpet: ['Trompete'],
  toy: ['Spielzeug'],
  plushie: ['Plüschtier', 'Kuscheltier'],
  puzzlecube: ['Zauberwürfel'],
  rollerskate: ['Rollschuh'],
  bicycle: ['Fahrrad'],
  umbrella: ['Regenschirm'],
  circus: ['Zirkus'],
  juggling: ['Jonglier'],
  balloon: ['Luftballon'],
  arcademachine: ['Spielautomat'],
  comicbox: ['Comickiste'],
  comicbook: ['Comicheft'],
  instantcamera: ['Sofortbildkamera'],
  gameconsole: ['Spielkonsole'],
  keyboard: ['Tastatur'],
  headphones: ['Kopfhörer'],
  monitor: ['Bildschirm'],
  mouse: ['Maus'],
  pencil: ['Bleistift'],
  pencils: ['Bleistifte'],
  book: ['Buch'],
  books: ['Bücher'],
  tome: ['Wälzer', 'Buch'],
  journal: ['Tagebuch'],
  map: ['Karte'],
  sandcastle: ['Sandburg'],

  // ---- Fest, Grab und Deko -----------------------------------------------
  decoration: ['Dekoration', 'Schmuck'],
  decorated: ['Verziert', 'Geschmückt'],
  decorative: ['Dekorativ'],
  banner: ['Fahne'],
  flag: ['Flagge', 'Fahne'],
  sign: ['Schild'],
  icon: ['Symbol'],
  signage: ['Beschilderung'],
  stopsign: ['Stoppschild'],
  trafficlight: ['Ampel'],
  statue: ['Standbild'],
  idol: ['Götze'],
  bell: ['Glocke'],
  cross: ['Kreuz'],
  star: ['Stern'],
  present: ['Geschenk'],
  presents: ['Geschenke'],
  gift: ['Geschenk'],
  christmas: ['Weihnachten'],
  wreath: ['Kranz'],
  mistletoe: ['Mistel'],
  grave: ['Grab'],
  gravestone: ['Grabstein'],
  gravemarker: ['Grabstein'],
  coffin: ['Sarg'],
  jackolantern: ['Kürbislaterne'],
  creepy: ['Gruselig'],
  dead: ['Tot'],
  broken: ['Kaputt', 'Zerbrochen'],
  destroyed: ['Zerstört'],
  cracked: ['Rissig'],
  dirty: ['Schmutzig', 'Dreckig'],
  bare: ['Kahl', 'Nackt'],
  old: ['Alt'],
  forgotten: ['Vergessen'],
  melted: ['Geschmolzen'],
  labeled: ['Beschriftet'],
  padded: ['Gepolstert'],
  striped: ['Gestreift'],
  stripes: ['Streifen'],
  colored: ['Farbig', 'Bunt'],

  // ---- Fahrzeuge, Technik, Weltraum --------------------------------------
  car: ['Auto', 'Wagen'],
  cart: ['Karren', 'Wagen'],
  wagon: ['Wagen', 'Karren'],
  carriage: ['Waggon', 'Kutsche'],
  trailer: ['Anhänger'],
  roofrack: ['Dachgepäckträger'],
  tractor: ['Traktor'],
  police: ['Polizei'],
  train: ['Zug', 'Eisenbahn'],
  locomotive: ['Lokomotive'],
  tracks: ['Gleise', 'Schienen'],
  coal: ['Kohle'],
  ship: ['Schiff'],
  boat: ['Boot'],
  boatrack: ['Bootsständer'],
  anchor: ['Anker'],
  saddle: ['Sattel'],
  space: ['Weltraum', 'All'],
  spacetruck: ['Raumtransporter'],
  dropship: ['Landungsschiff'],
  lander: ['Landefähre'],
  landingpad: ['Landeplattform'],
  landingimpact: ['Landeaufprall'],
  chargingstation: ['Ladestation'],
  solarpanel: ['Solarzelle'],
  solarpanels: ['Solarzellen'],
  windturbine: ['Windrad'],
  computer: ['Rechner'],
  rig: ['Gestell'],
  stand: ['Ständer'],
  post: ['Pfosten', 'Pfahl'],
  pin: ['Kegel', 'Stift'],

  // ---- Form, Größe, Lage, Zustand ----------------------------------------
  // Zahlen und Buchstaben hinter einem Namen bedeuten nichts; diese Wörter
  // schon — sie sind der Unterschied zwischen zwei Kacheln, die sonst gleich
  // aussehen, und genau danach sucht jemand („kleiner Tisch").
  large: ['Groß'],
  extralarge: ['Übergroß'],
  big: ['Groß'],
  huge: ['Riesig'],
  small: ['Klein'],
  mini: ['Winzig'],
  medium: ['Mittel'],
  tall: ['Hoch'],
  high: ['Hoch'],
  low: ['Niedrig', 'Flach'],
  long: ['Lang'],
  short: ['Kurz'],
  wide: ['Breit'],
  narrow: ['Schmal'],
  thin: ['Dünn'],
  half: ['Halb'],
  full: ['Voll'],
  empty: ['Leer'],
  open: ['Offen'],
  closed: ['Geschlossen'],
  single: ['Einzel'],
  double: ['Doppel'],
  triple: ['Dreifach'],
  pair: ['Paar'],
  quad: ['Vierfach'],
  multi: ['Mehrfach'],
  complete: ['Vollständig'],
  incomplete: ['Unvollständig'],
  round: ['Rund'],
  square: ['Quadrat'],
  rectangle: ['Rechteck'],
  cube: ['Würfel'],
  sphere: ['Kugel'],
  cone: ['Kegel'],
  curved: ['Gebogen'],
  curvy: ['Kurvig'],
  straight: ['Gerade'],
  angled: ['Abgewinkelt'],
  sloped: ['Schräg', 'Geneigt'],
  slope: ['Hang', 'Schräge'],
  split: ['Geteilt'],
  cut: ['Geschnitten'],
  corner: ['Ecke'],
  innercorner: ['Innenecke'],
  outercorner: ['Außenecke'],
  opencorner: ['Offene Ecke'],
  side: ['Seite'],
  sides: ['Seiten'],
  singlesided: ['Einseitig'],
  allsides: ['Allseitig'],
  top: ['Oben'],
  bottom: ['Unten'],
  up: ['Hoch', 'Oben'],
  down: ['Runter', 'Unten'],
  left: ['Links'],
  right: ['Rechts'],
  front: ['Vorne'],
  back: ['Hinten', 'Rücken'],
  center: ['Mitte'],
  inner: ['Innen'],
  outer: ['Außen'],
  inside: ['Innen'],
  outside: ['Außen'],
  end: ['Ende'],
  endcap: ['Abschluss'],
  base: ['Sockel', 'Basis'],
  horizontal: ['Waagerecht'],
  vertical: ['Senkrecht'],
  standing: ['Stehend'],
  hanging: ['Hängend'],
  mounted: ['Montiert'],
  connected: ['Verbunden'],
  transition: ['Übergang'],
  block: ['Klotz'],
  rings: ['Ringe'],
  hot: ['Heiß'],
  dark: ['Dunkel'],
  '1handed': ['Einhändig'],
  '2handed': ['Zweihändig'],
  one: ['Eins'],
  two: ['Zwei'],
  three: ['Drei'],
  four: ['Vier'],
  five: ['Fünf'],
  six: ['Sechs'],
  seven: ['Sieben'],
  eight: ['Acht'],
  nine: ['Neun'],
  ten: ['Zehn'],

  // ---- Farben ------------------------------------------------------------
  // `orange` und `gold` fehlen hier mit Absicht: Sie heißen auf Deutsch
  // genauso, und ein Eintrag, der ein Wort auf sich selbst abbildet, bringt
  // keinen einzigen Treffer mehr, den es nicht schon gibt.
  color: ['Farbe'],
  paint: ['Farbe'],
  red: ['Rot'],
  green: ['Grün'],
  blue: ['Blau'],
  yellow: ['Gelb'],
  white: ['Weiß'],
  black: ['Schwarz'],
  grey: ['Grau'],
  brown: ['Braun'],
  pink: ['Rosa'],
  purple: ['Lila', 'Violett'],
  tan: ['Beige'],
};

/**
 * **Englische Synonyme** — die Kür, und sie kostet fünfzehn Zeilen.
 *
 * Die Pflicht ist Deutsch; wer `barrel` tippt, findet ohnehin alles. Aber ein
 * Fass heißt im Englischen auch `cask`, ein Sofa `sofa` und nicht `couch`,
 * und eine Taschenlampe `flashlight` — wer so sucht, soll nicht leer
 * ausgehen, nur weil der Zeichner sich für das andere Wort entschieden hat.
 * Der Schlüssel ist hier das **getippte** Wort, der Wert das, was in den
 * Dateinamen steht.
 */
const KAYKIT_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  cask: ['barrel', 'keg'],
  sofa: ['couch'],
  cupboard: ['cabinet'],
  closet: ['cabinet'],
  bookshelf: ['bookcase'],
  flashlight: ['torch'],
  garbage: ['trash'],
  rubbish: ['trash'],
  boulder: ['rock'],
  lumberjack: ['lumbermill'],
  cutlery: ['knife', 'spoon'],
  firearm: ['gun', 'rifle', 'pistol'],
  couchtable: ['table'],
  wardrobe: ['cabinet'],
  bin: ['trash', 'bucket'],
};

/**
 * **Was ein getipptes Wort auf Englisch heißen könnte** — deutsch → die
 * Wörter der Sammlung.
 *
 * Die Umkehrung des Wörterbuchs, **einmal beim Laden des Moduls** gerechnet
 * und danach nur noch gelesen: Die Suche läuft bei jedem Tastendruck, und
 * eine Tabelle, die dabei jedes Mal neu entstünde, wäre der teuerste Teil der
 * ganzen Rechnung. Übersetzt wird ohnehin die **Anfrage** (ein paar Wörter)
 * und nicht die 4470 Namen.
 *
 * Die Schlüssel sind gefaltet (`ä→a`, `ö→o`, `ü→u`, `ß→ss`) und in Wörter
 * zerlegt, genau wie die Anfrage — `Schwarzer Ritter` steht also unter
 * `schwarzer` **und** unter `ritter`, und `Fässer` findet, wer `fasser`
 * tippt.
 *
 * **Ein Plural zeigt auf die Einzahl**, wenn es sie im Wörterbuch gibt:
 * `Fässer` → `barrel` und nicht `barrels`, denn `barrel` steckt in
 * `barrels_stacked.glb` ohnehin drin — die Suche vergleicht mit `includes`.
 * Andersherum verlöre man die Hälfte der Treffer.
 */
export const KAYKIT_ENGLISH: ReadonlyMap<string, readonly string[]> = buildEnglish();

function buildEnglish(): Map<string, readonly string[]> {
  const out = new Map<string, string[]>();
  for (const [english, german] of Object.entries(KAYKIT_TERMS)) {
    const target = shortest(english);
    for (const word of german) {
      for (const key of foldWords(word)) {
        const list = out.get(key);
        if (!list) out.set(key, [target]);
        else if (!list.includes(target)) list.push(target);
      }
    }
  }
  for (const [typed, english] of Object.entries(KAYKIT_SYNONYMS)) {
    const list = out.get(typed);
    if (!list) out.set(typed, [...english]);
    else for (const word of english) if (!list.includes(word)) list.push(word);
  }
  return out;
}

/** Die Einzahl, wenn es sie gibt — siehe `KAYKIT_ENGLISH`. */
function shortest(english: string): string {
  if (!english.endsWith('s') || english.length < 4) return english;
  const one = english.slice(0, -1);
  return one in KAYKIT_TERMS ? one : english;
}

/**
 * **Die Wörter eines deutschen Eintrags, so wie man sie tippt.**
 *
 * Dieselbe Faltung wie im Zerteiler der Suche (`core/kaykitIndex.terms`) —
 * sie steht hier ein zweites Mal, weil dieses Modul nichts über die Suche
 * wissen soll und die Suche nichts über das Wörterbuch wissen müsste, um es
 * zu bauen. Vier Zeilen doppelt sind billiger als ein Kreisbezug.
 */
function foldWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * **Was dieses getippte Wort in den Dateinamen heißen könnte** — oder nichts.
 *
 * Eine leere Liste ist die normale Antwort: `barrel` steht selbst in den
 * Namen und braucht keine Übersetzung, und `xyz` bedeutet auf keiner Sprache
 * etwas. Nur wer wirklich etwas findet, erweitert damit die Suche.
 */
export function kaykitEnglish(term: string): readonly string[] {
  return KAYKIT_ENGLISH.get(term) ?? [];
}

/**
 * **Die deutsche Bedeutung eines Dateinamens** — eine Zeile, kein Satz.
 *
 * `barrel_large.glb` wird `Fass Groß`, `crate_wood.glb` wird `Kiste Holz`.
 * Das ist **keine Übersetzung**, sondern eine Glosse: Wort für Wort in der
 * Reihenfolge des Namens, je Wort das erste deutsche aus dem Wörterbuch, und
 * was nicht darin steht (`A`, `02`, `styleB`), fällt weg. Eine Grammatik
 * daraus zu machen — „großes Fass" — hieße, für jedes Wort zu wissen, ob es
 * Eigenschaft oder Ding ist; das wüsste eine zweite Tabelle mit 500 Zeilen,
 * und die pflegt wieder niemand.
 *
 * Doppelte fallen heraus: `rock_rocky_A` ist einmal `Stein` und nicht
 * zweimal. Bleibt nichts übrig, ist die Antwort leer — und dann steht auch
 * keine Zeile da (`fileFacts`).
 */
export function kaykitGerman(fileName: string): string {
  const bare = fileName.replace(/\.(glb|gltf)$/i, '').toLowerCase();
  const out: string[] = [];
  for (const word of bare.split(/[^a-z0-9]+/)) {
    const german = KAYKIT_TERMS[word]?.[0];
    if (german !== undefined && !out.includes(german)) out.push(german);
  }
  return out.join(' ');
}
