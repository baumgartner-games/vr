import { stepAlong, type RoutePath, type RoutePose } from './route';

function straight(): RoutePath {
  return {
    complete: true,
    grounded: true,
    points: Array.from({ length: 300 }, (_, i) => ({ x: (i + 1) * 0.02, z: 0 })),
  };
}

test('dense curve samples never consume empty frames or lose travelled distance', () => {
  const distances = [30, 60, 90, 120].map((fps) => {
    const pose: RoutePose = { x: 0, z: 0, yaw: Math.PI / 2 };
    const route = straight();
    for (let i = 0; i < fps * 2; i++) stepAlong(pose, route, 1 / fps, 2);
    expect(pose.z).toBe(0);
    return pose.x;
  });
  expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(0.01);
  expect(distances[0]).toBeGreaterThan(3.1);
});

test('travel eases into a route, consumes every corner and stops exactly at the end', () => {
  const pose: RoutePose = { x: 0, z: 0, yaw: Math.PI / 2 };
  const route = straight();
  stepAlong(pose, route, 1 / 60, 2);
  expect(pose.velocity).toBeLessThan(0.1);
  let moving = true;
  for (let i = 0; i < 600 && moving; i++) moving = stepAlong(pose, route, 1 / 60, 2);
  expect(moving).toBe(false);
  expect(pose.x).toBe(6);
  expect(pose.velocity).toBe(0);
  expect(route.points).toEqual([]);
});
