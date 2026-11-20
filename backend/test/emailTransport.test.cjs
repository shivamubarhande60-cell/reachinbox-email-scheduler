const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  HttpDeliveryError,
  getHttpProviderHost,
  parseEmailTransport,
} = require('../dist/src/services/emailDelivery.js');

test('parseEmailTransport normalizes supported transports and defaults empty values to smtp', () => {
  assert.equal(parseEmailTransport(undefined), 'smtp');
  assert.equal(parseEmailTransport(''), 'smtp');
  assert.equal(parseEmailTransport('BREVO'), 'brevo');
  assert.equal(parseEmailTransport(' resend '), 'resend');
  assert.equal(parseEmailTransport('SendGrid'), 'sendgrid');
  assert.equal(parseEmailTransport('smtp'), 'smtp');
  assert.throws(() => parseEmailTransport('mailgun'), /Unsupported email transport/);
});

test('getHttpProviderHost returns expected API endpoints', () => {
  assert.equal(getHttpProviderHost('brevo'), 'api.brevo.com');
  assert.equal(getHttpProviderHost('resend'), 'api.resend.com');
  assert.equal(getHttpProviderHost('sendgrid'), 'api.sendgrid.com');
});

test('HttpDeliveryError records retryable status cleanly', () => {
  const transient = new HttpDeliveryError('rate limited', true);
  const permanent = new HttpDeliveryError('invalid api key', false);

  assert.equal(transient.retryable, true);
  assert.equal(permanent.retryable, false);
});
