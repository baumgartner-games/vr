import { freshCrew, stepVitals } from './mission';

test('one second of sprint already causes breath, and four seconds saturate exertion', () => {
  const crew = freshCrew();
  for (let i = 0; i < 60; i++) stepVitals(crew, 1 / 60, 5, Infinity);
  expect(crew.exertion).toBeCloseTo(0.25, 6);
  for (let i = 0; i < 180; i++) stepVitals(crew, 1 / 60, 5, Infinity);
  expect(crew.exertion).toBeCloseTo(1, 6);
  for (let i = 0; i < 300; i++) stepVitals(crew, 1 / 60, 2, Infinity);
  expect(crew.exertion).toBeCloseTo(0, 6);
});
