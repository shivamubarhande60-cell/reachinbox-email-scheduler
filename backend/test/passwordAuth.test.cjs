const assert = require('node:assert/strict');
const { test } = require('node:test');
const { hashPassword, verifyPassword } = require('../dist/src/lib/crypto.js');

test('hashPassword creates unique salted scrypt hashes and verifies matching password', async () => {
  const hash1 = await hashPassword('CorrectHorseBatteryStaple!');
  const hash2 = await hashPassword('CorrectHorseBatteryStaple!');

  assert.notEqual(hash1, hash2);
  assert.ok(hash1.startsWith('scrypt:'));
  assert.equal(await verifyPassword('CorrectHorseBatteryStaple!', hash1), true);
  assert.equal(await verifyPassword('CorrectHorseBatteryStaple!', hash2), true);
});

test('verifyPassword rejects wrong passwords, null, and malformed hashes', async () => {
  const hash = await hashPassword('MyStrongPassword123');

  assert.equal(await verifyPassword('WrongPassword123', hash), false);
  assert.equal(await verifyPassword('MyStrongPassword123', null), false);
  assert.equal(await verifyPassword('MyStrongPassword123', undefined), false);
  assert.equal(await verifyPassword('MyStrongPassword123', 'not-a-valid-hash'), false);
  assert.equal(await verifyPassword('MyStrongPassword123', 'scrypt:salt:zzzz'), false);
});
