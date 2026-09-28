const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isLocalDemoEnabled } = require('../dist/services/localDemo.js');

test('local preview is available only when explicitly enabled on a local non-production request', () => {
  assert.equal(isLocalDemoEnabled('development', 'true', '127.0.0.1'), true);
  assert.equal(isLocalDemoEnabled('development', 'false', '127.0.0.1'), false);
  assert.equal(isLocalDemoEnabled('production', 'true', '127.0.0.1'), false);
  assert.equal(isLocalDemoEnabled('development', 'true', '192.168.1.10'), false);
});
