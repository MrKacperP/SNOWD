// Owner's test accounts. Money moved by them is not real business, so admin revenue totals leave it out.
export const TEST_ACCOUNT_EMAILS: readonly string[] = [
  'adamcosza@gmail.com',
  'henrymurski@gmail.com',
  'prymiczkacper@gmail.com',
  // Apple's App Review demo login.
  'appreview@snowd.ca',
];

export const isTestAccountEmail = (email: unknown) =>
  typeof email === 'string' && TEST_ACCOUNT_EMAILS.includes(email.trim().toLowerCase());

/** True when either side of the payment is a test account. */
export const involvesTestAccount = (payment: { clientId?: unknown; operatorId?: unknown }, testIds: ReadonlySet<string>) =>
  testIds.has(String(payment.clientId || '')) || testIds.has(String(payment.operatorId || ''));
