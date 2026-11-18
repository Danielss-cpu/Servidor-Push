import test from 'node:test';
import assert from 'node:assert/strict';
import { condition, isForecast, isSnapshot } from '../src/app/core/weather.models.ts';

test('interpreta códigos WMO y admite condiciones desconocidas sin inventar clima', () => {
  assert.equal(condition(0).label, 'Despejado');
  assert.equal(condition(55).label, 'Llovizna');
  assert.equal(condition(65).label, 'Lluvia');
  assert.equal(condition(95).label, 'Tormenta');
  assert.equal(condition(null).label, 'Sin información');
});

test('descarta caché corrupta y respuestas incompletas antes de mostrarlas', () => {
  assert.equal(isSnapshot(null), false);
  assert.equal(isSnapshot({ city: { name: 'Orizaba' }, savedAt: 'ayer' }), false);
  assert.equal(isForecast({ current: { temperature_2m: 20 } }), false);
});
