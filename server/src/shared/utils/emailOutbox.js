const db = require('../../database/db');
const logger = require('../loggers/logger');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Queues an email in email_outbox. This server never sends mail itself:
 * admin/server owns the SMTP credentials and the editable templates, and its
 * worker renders + sends queued rows (with retries and a delivery log).
 * Pass the surrounding transaction so the email is only queued if the
 * change that caused it commits.
 *
 * For booking emails, put `bookingId` in data — the worker loads the booking
 * details at send time.
 */
async function enqueueEmail(trxOrDb, { templateKey, to, data = {}, entityType = null, entityId = null }) {
  if (!to || !EMAIL_RE.test(to)) return 0;
  await (trxOrDb || db)('email_outbox').insert({
    template_key: templateKey,
    to_email: to,
    data: JSON.stringify(data),
    related_entity_type: entityType,
    related_entity_id: entityId != null ? String(entityId) : null,
  });
  return 1;
}

/** One copy per admin alert recipient (configured in the admin panel's Email Templates → Settings). */
async function enqueueAdminEmail(trxOrDb, payload) {
  const row = await (trxOrDb || db)('settings').where({ key: 'email_settings' }).first();
  const recipients = row?.value?.adminRecipients ?? [];
  let n = 0;
  for (const to of recipients) n += await enqueueEmail(trxOrDb, { ...payload, to });
  if (!recipients.length) logger.info(`No admin alert recipients configured — ${payload.templateKey} not queued`);
  return n;
}

/** The address a booking's emails go to: the lead guest's, else the account's. */
async function bookingEmailAddress(trxOrDb, booking) {
  if (booking.guest_email) return booking.guest_email;
  const customer = await (trxOrDb || db)('customers').where({ id: booking.customer_id }).select('email').first();
  return customer?.email ?? null;
}

module.exports = { enqueueEmail, enqueueAdminEmail, bookingEmailAddress };
