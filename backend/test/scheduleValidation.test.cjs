const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateScheduleInput } = require('../dist/src/services/scheduleValidation.js');

const defaults = { minimumDelayMs: 2000, maximumHourlyLimit: 100 };
const validInput = {
  subject: '  Hello  ',
  body: '  A longer email body is accepted and preserved.  ',
  emails: [' User@example.com ', 'user@example.com', 'second@example.com'],
  startTime: '2030-01-01T12:00:00.000Z',
  delayMs: 5000,
  hourlyLimit: 20,
};

test('normalizes and de-duplicates recipients while preserving schedule settings', () => {
  const result = validateScheduleInput(validInput, defaults);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value.emails, ['user@example.com', 'second@example.com']);
  assert.equal(result.value.subject, 'Hello');
  assert.equal(result.value.body, 'A longer email body is accepted and preserved.');
  assert.equal(result.value.startAt.toISOString(), validInput.startTime);
  assert.equal(result.value.delayMs, 5000);
  assert.equal(result.value.hourlyLimit, 20);
});

test('rejects missing text, malformed recipients, and invalid schedule values', () => {
  assert.match(validateScheduleInput({ ...validInput, subject: ' ' }, defaults).error, /Subject/);
  assert.match(validateScheduleInput({ ...validInput, subject: 's'.repeat(256) }, defaults).error, /255 characters/);
  assert.match(validateScheduleInput({ ...validInput, emails: ['not-an-email'] }, defaults).error, /Invalid email/);
  assert.match(validateScheduleInput({ ...validInput, startTime: 'not-a-date' }, defaults).error, /Start time/);
  assert.match(validateScheduleInput({ ...validInput, startTime: new Date(Date.now() - 60000).toISOString() }, defaults).error, /future/);
  assert.match(validateScheduleInput({ ...validInput, delayMs: -1 }, defaults).error, /Delay/);
  assert.match(validateScheduleInput({ ...validInput, hourlyLimit: 101 }, defaults).error, /Hourly limit/);
});

test('rejects non-object bodies and recipient lists outside the supported size', () => {
  assert.match(validateScheduleInput(null, defaults).error, /JSON object/);
  assert.match(validateScheduleInput({ ...validInput, emails: [] }, defaults).error, /1 and 10,000/);
  assert.match(validateScheduleInput({ ...validInput, emails: Array(10001).fill('a@example.com') }, defaults).error, /1 and 10,000/);
});

test('accepts and normalizes a 1,000-recipient campaign', () => {
  const emails = Array.from({ length: 1000 }, (_, index) => `lead${index}@example.com`);
  const result = validateScheduleInput({ ...validInput, emails }, defaults);
  assert.equal(result.error, undefined);
  assert.equal(result.value.emails.length, 1000);
});

test('uses configured delay and hourly limit when omitted', () => {
  const { delayMs, hourlyLimit } = validateScheduleInput({
    subject: 'Hello',
    body: 'Body',
    emails: ['person@example.com'],
  }, defaults).value;
  assert.equal(delayMs, 2000);
  assert.equal(hourlyLimit, 100);
});
