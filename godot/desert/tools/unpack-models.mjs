/**
 * **Regalmodelle für Godot entpacken.** Das Modellregal (`public/models/kaykit/`)
 * ist mit `EXT_meshopt_compression` und `KHR_mesh_quantization` gepackt — das
 * liest der Browser, Godots glTF-Import nicht. Dieses Skript schreibt die
 * angegebenen `.glb` an Ort und Stelle entpackt zurück.
 *
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer
 *   node godot/desert/tools/unpack-models.mjs godot/desert/models/**\/*.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    const name = ext.extensionName;
    if (name === 'EXT_meshopt_compression' || name === 'KHR_mesh_quantization') ext.dispose();
  }
  await doc.transform(dequantize());
  await io.write(file, doc);
  console.log('entpackt', file);
}
