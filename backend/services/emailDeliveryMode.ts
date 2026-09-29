export function isEmailSimulationEnabled(value = process.env.DEMO_EMAIL_MODE) {
  return value?.trim().toLowerCase() === 'true';
}

export function shouldSimulateEmailDelivery(
  senderIsSimulated: boolean | undefined,
  value = process.env.DEMO_EMAIL_MODE,
) {
  return senderIsSimulated === true || isEmailSimulationEnabled(value);
}
