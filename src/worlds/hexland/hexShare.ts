/**
 * **Den Spielstand als Text teilen** — kurz genug, um ihn in einen Chat zu
 * kopieren. Gewünscht: _„zum Testen gerne den aktuellen Map-Stand kopieren
 * können (komprimiert) und einen Import (also Export/Import) haben wollen,
 * damit du den Spielstand nutzen kannst, um zu schauen, was ich meine."_
 *
 * `HEX1.` + der Spielstand (`HexBoard.save`) mit `deflate-raw` gepackt, in
 * Base64url. Ohne `CompressionStream` (ältere Browser) `HEX0.` + ungepackt.
 * Lesen am Rechner: `node -e` mit `zlib.inflateRawSync` (`docs/agents/hexland.md`).
 */
const PACKED = 'HEX1.';
const PLAIN = 'HEX0.';

export async function packSave(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'undefined') return PLAIN + toBase64Url(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const packed = new Uint8Array(await new Response(stream).arrayBuffer());
  return PACKED + toBase64Url(packed);
}

/** Der Spielstand aus dem Text, oder `null`, wenn er keiner ist. */
export async function unpackSave(text: string): Promise<string | null> {
  const clean = text.trim().replace(/\s+/g, '');
  try {
    if (clean.startsWith(PLAIN)) return new TextDecoder().decode(fromBase64Url(clean.slice(5)));
    if (!clean.startsWith(PACKED) || typeof DecompressionStream === 'undefined') return null;
    const bytes = fromBase64Url(clean.slice(5));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
