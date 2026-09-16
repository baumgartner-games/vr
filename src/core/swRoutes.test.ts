import { inScope, routeFor, type RouteRequest } from './swRoutes';

/** Der Geltungsbereich, wie GitHub Pages ihn meldet — mit Unterverzeichnis. */
const SCOPE = 'https://baumgartner-games.github.io/vr/';

function ask(url: string, extra: Partial<RouteRequest> = {}): ReturnType<typeof routeFor> {
  return routeFor({ method: 'GET', url, navigate: false, ...extra }, SCOPE);
}

describe('inScope', () => {
  it('nimmt, was unter dem Geltungsbereich liegt', () => {
    expect(inScope(`${SCOPE}assets/main-C3aB9x2Q.js`, SCOPE)).toBe(true);
    expect(inScope(SCOPE, SCOPE)).toBe(true);
  });

  it('lässt den Nachbarn auf demselben Server in Ruhe', () => {
    expect(inScope('https://baumgartner-games.github.io/andere/app.js', SCOPE)).toBe(false);
  });

  it('lässt fremde Server in Ruhe — dort liegen die Relays der Verbindung', () => {
    expect(inScope('https://relay.example/ws', SCOPE)).toBe(false);
  });
});

describe('routeFor', () => {
  it('speichert nur Lesezugriffe', () => {
    expect(ask(`${SCOPE}index.html`, { method: 'POST' })).toBe('bypass');
    expect(ask(`${SCOPE}index.html`, { method: 'HEAD' })).toBe('bypass');
  });

  it('geht einer stückweisen Anfrage aus dem Weg', () => {
    // `206 Partial Content` lässt sich nicht ablegen; ein Versuch wirft.
    expect(ask(`${SCOPE}audio/haunting/ambient-hum.ogg`, { range: true })).toBe('bypass');
  });

  it('holt eine ganze Seite erst aus dem Netz', () => {
    expect(ask(SCOPE, { navigate: true })).toBe('page');
    expect(ask(`${SCOPE}tools.html`, { navigate: true })).toBe('page');
    // Auch mit Einladungslink: Der Raum-Code hängt als Query dran.
    expect(ask(`${SCOPE}?room=mond-riff-47`, { navigate: true })).toBe('page');
  });

  it('nimmt eine Datei mit Hash im Namen sofort aus dem Speicher', () => {
    expect(ask(`${SCOPE}assets/main-C3aB9x2Q.js`)).toBe('immutable');
    expect(ask(`${SCOPE}assets/style-Bd7_x-1a.css`)).toBe('immutable');
    // Auch die Welt, die erst beim Betreten nachgeladen wird.
    expect(ask(`${SCOPE}assets/HauntingWorld-9zQ2bK4c.js`)).toBe('immutable');
  });

  it('hält feste Namen frisch, liefert sie aber sofort', () => {
    expect(ask(`${SCOPE}models/chef.glb`)).toBe('revalidate');
    expect(ask(`${SCOPE}audio/haunting/creak-0.ogg`)).toBe('revalidate');
    expect(ask(`${SCOPE}controllers/oculus-touch-v3/left.glb`)).toBe('revalidate');
    expect(ask(`${SCOPE}manifest.webmanifest`)).toBe('revalidate');
    expect(ask(`${SCOPE}icon-192.png`)).toBe('revalidate');
  });

  it('lässt Quellkarten und den Service Worker selbst am Speicher vorbei', () => {
    // Zwei Gründe, ein Weg: Quellkarten sind Megabytes für niemanden, und ein
    // Service Worker, der sich selbst ausliefert, hängt an seinem Vorgänger.
    expect(ask(`${SCOPE}assets/main-C3aB9x2Q.js.map`)).toBe('bypass');
    expect(ask(`${SCOPE}sw.js`)).toBe('bypass');
  });

  it('rührt nichts an, was einem anderen gehört', () => {
    expect(ask('https://relay.example/announce', { navigate: false })).toBe('bypass');
    // Auch eine Seitenanfrage nach draußen bleibt draußen.
    expect(ask('https://example.com/', { navigate: true })).toBe('bypass');
  });

  it('erkennt einen Hash nur, wo wirklich einer steht', () => {
    // Ein Bindestrich allein macht noch keinen Hash: Diese Datei kann sich
    // unter ihrem Namen ändern und darf deshalb nicht ewig gelten.
    expect(ask(`${SCOPE}audio/haunting/monster-run-0.ogg`)).toBe('revalidate');
    expect(ask(`${SCOPE}apple-touch-icon.png`)).toBe('revalidate');
  });
});
