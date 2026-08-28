import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import { htmlToText } from './html-to-text';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export type FetchedEmail = {
  id: string;
  from: string;
  dateHeader: string;
  plainText: string;
};

/** Extract Date field components in SGT (UTC+8) from an RFC 2822 date string. */
export function headerToSGT(dateStr: string): { date: number; month: number; year: number } {
  const d = new Date(dateStr);
  const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return {
    date: sgt.getUTCDate(),
    month: sgt.getUTCMonth() + 1,
    year: sgt.getUTCFullYear(),
  };
}

/** Recursively extract the first part of the given MIME type from a message. */
function extractPart(part: gmail_v1.Schema$MessagePart, mimeType: string): string {
  if (part.mimeType === mimeType && part.body?.data) {
    return Buffer.from(part.body.data, 'base64').toString('utf-8');
  }
  if (part.mimeType?.startsWith('multipart/') && part.parts) {
    for (const subPart of part.parts) {
      const text = extractPart(subPart, mimeType);
      if (text) return text;
    }
  }
  return '';
}

/**
 * The body text handed to the parsers: the text/plain part when the email has
 * one, otherwise the text/html part flattened to text.
 *
 * DBS card alerts are multipart/mixed around a single text/html part with no
 * text/plain alternative — they used to arrive here as '' and be skipped as
 * unrecognised. text/plain still wins wherever it exists, so UOB and Citibank
 * bodies are unchanged.
 */
function extractBodyText(payload: gmail_v1.Schema$MessagePart): string {
  const plain = extractPart(payload, 'text/plain');
  if (plain) return plain;
  const html = extractPart(payload, 'text/html');
  return html ? htmlToText(html) : '';
}

/**
 * The scan query, exported so diagnostics report the window the cron actually
 * uses instead of a copy that can drift.
 *
 * `is:unread` is the ingestion cursor: an email is marked read only after its
 * transaction is successfully inserted, so re-scanning the same window never
 * re-imports. The window was `newer_than:1d` until 2026-08-27; a day's width
 * meant a missed cron run, or a parser shipped after the fact, lost those
 * emails permanently. Seven days lets a late fix sweep up what it missed.
 */
export const SCAN_QUERY =
  'from:(unialerts@uobgroup.com OR alerts@citibank.com.sg OR ibanking.alert@dbs.com) is:unread newer_than:7d';

/** Cap on messages fetched per scan. Exported so `npm run doctor` can warn as the window approaches it. */
export const SCAN_MAX_RESULTS = 50;

/**
 * Confirm the refresh token still works, without reading any mail.
 *
 * A dead token is this pipeline's quietest failure: the cron throws, nothing
 * surfaces in the app, and transactions simply stop arriving. Read-only.
 */
export async function checkGmailAccess(): Promise<
  { ok: true; mailbox: string } | { ok: false; error: string }
> {
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return { ok: true, mailbox: profile.data.emailAddress ?? '(unknown)' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Fetch unread emails from UOB, Citibank and DBS inside the scan window. */
export async function fetchUnreadEmails(): Promise<FetchedEmail[]> {
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: SCAN_QUERY,
    maxResults: SCAN_MAX_RESULTS,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const results: FetchedEmail[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const payload = full.data.payload;
    if (!payload) continue;

    const headers = payload.headers ?? [];
    const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? '';
    const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date')?.value ?? '';
    const plainText = extractBodyText(payload);

    results.push({ id: msg.id, from, dateHeader, plainText });
  }

  return results;
}

/** Mark a Gmail message as read by removing the UNREAD label. */
export async function markAsRead(messageId: string): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
}
