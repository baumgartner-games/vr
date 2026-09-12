# Woher diese Dateien kommen

Kopiert von `@webxr-input-profiles/assets@1.0.20` (npm), Verzeichnis
`dist/profiles`, von der [Immersive Web Community
Group](https://github.com/immersive-web/webxr-input-profiles). Lizenz: MIT,
siehe `LICENSE.md` daneben.

Enthalten sind nur die Profile, die an einer Quest tatsächlich vorkommen:

- `meta-quest-touch-plus`
- `meta-quest-touch-plus-v2`
- `meta-quest-touch-pro`
- `oculus-touch-v3`
- `oculus-touch-v2`

`profilesList.json` ist entsprechend gestutzt — es darf nichts darin stehen,
was hier nicht danebenliegt. Alles andere fällt im Spiel auf den selbst
gebauten Controller aus `src/worlds/tune/InputModel.ts` zurück.

**Nicht von Hand ändern.** Erneuern mit:

```
node --experimental-strip-types tools/controllers.ts
```
