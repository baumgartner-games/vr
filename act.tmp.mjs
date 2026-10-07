export default async function (page, out) {
  const r = await page.evaluate(() => {
    const w = window.bgvr.world; const ctx = w.context;
    const V = ctx.rig.position.constructor;
    const px = Math.floor(ctx.rig.position.x), pz = Math.floor(ctx.rig.position.z);
    const put = (element, dx, dz, face = 'S') => w.furnishSpot({ id: 'test-' + element, element, x: px + dx, z: pz + dz, face });
    const res = {
      die: put('board-die-d6b-red', 1, -1),
      chest: put('tavern-chest', -1, -1),
      barrel: put('tavern-barrel', -2, 1),
      present: put('holiday-present-d', 2, 1),
      lamp: put('furniture-lamp-standing', 0, -2),
      platform: put('parcours-platform-4x4x2-blue', -4, 2),
      bigpresent: put('mystery-present', 3, 2), dice2: put('board-die-d20-blue', 1, 1), throne: put('mystery-vampire-throne', -2, 3), crate: put('resource-gems-chest', 0, 3),
    };
    // wall piece
    const walls = w.standingWalls();
    let best = null, bd = 1e9;
    for (const wall of walls) { const d = Math.hypot(wall.centre.x - ctx.rig.position.x, wall.centre.z - ctx.rig.position.z); if (d < bd) { bd = d; best = wall; } }
    if (best) {
      const at = best.centre.clone().addScaledVector(best.front, 0.3);
      const entry = { halfExtents: new V(0.5, 0.3, 0.05) };
      const mount = w.elementMount(ctx, entry, at.x, at.z);
      res.mount = mount;
      if (mount) res.picture = !!w.furnishAt({ id: 'furniture-pictureframe-large-b', from: null, keep: null }, at.x, at.z, 0, 0, mount);
      const at2 = best.centre.clone().addScaledVector(best.front, -0.3);
      const m2 = w.elementMount(ctx, { halfExtents: new V(0.5, 0.2, 0.13) }, at2.x, at2.z);
      if (m2) res.shelf = !!w.furnishAt({ id: 'furniture-shelf-b-large-decorated', from: null, keep: null }, at2.x, at2.z, 0, 0, m2);
    }
    return res;
  });
  console.log(JSON.stringify(r));
  await page.waitForTimeout(5000);
  await page.mouse.move(640, 430);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(150); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/i-placed.png` });
  const acts = await page.evaluate(() => {
    const w = window.bgvr.world; const ctx = w.context;
    const opener = (id) => { let a = null; w.root.traverse((o) => { if (o.name === 'opens:test-' + id) a = o; }); return a; };
    const out = {};
    for (const [id, what] of [['board-die-d6b-red', 'roll'], ['tavern-chest', 'lid'], ['tavern-barrel', 'tap'], ['holiday-present-d', 'unwrap'], ['furniture-lamp-standing', 'light'], ['mystery-present', 'unwrap'], ['board-die-d20-blue', 'roll']]) {
      const a = opener(id); out[id] = !!a; if (a) w.actOn(ctx, what, a);
    }
    return out;
  });
  console.log(JSON.stringify(acts));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/j-acting.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/k-after.png` });
  const held = await page.evaluate(() => [...window.bgvr.world.bodies?.values?.() ?? []].length);
  console.log('bodies', held);
  await page.evaluate(() => window.bgvr.world.context.openMenu?.('elements'));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/l-catalog.png` });
}
export async function menu(page, out) {}
