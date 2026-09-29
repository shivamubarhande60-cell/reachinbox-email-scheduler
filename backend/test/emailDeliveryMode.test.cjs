const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  isEmailSimulationEnabled,
  shouldSimulateEmailDelivery,
} = require('../dist/services/emailDeliveryMode.js');

test('simulated email delivery is opt-in and accepts case-insensitive true', () => {
  assert.equal(isEmailSimulationEnabled('true'), true);
  assert.equal(isEmailSimulationEnabled(' TRUE '), true);
  assert.equal(isEmailSimulationEnabled(undefined), false);
  assert.equal(isEmailSimulationEnabled('false'), false);
  assert.equal(isEmailSimulationEnabled('yes'), false);
});

test('simulation is enabled for an explicit simulated sender or global demo mode', () => {
  assert.equal(shouldSimulateEmailDelivery(true, 'false'), true);
  assert.equal(shouldSimulateEmailDelivery(false, 'true'), true);
  assert.equal(shouldSimulateEmailDelivery(false, 'false'), false);
});
