import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';

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

/** Recursively extract plain-text content from a Gmail message part. */
function extractPlainText(part: gmail_v1.Schema$MessagePart): string {
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64').toString('utf-8');
  }
  if (part.mimeType?.startsWith('multipart/') && part.parts) {
    for (const subPart of part.parts) {
      const text = extractPlainText(subPart);
      if (text) return text;
    }
  }
  return '';
}

/** Fetch unread emails from UOB and Citibank received in the last 24 hours. */
export async function fetchUnreadEmails(): Promise<FetchedEmail[]> {
  const query =
    'from:(unialerts@uobgroup.com OR alerts@citibank.com.sg) is:unread newer_than:1d';

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
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
    const plainText = extractPlainText(payload);

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
