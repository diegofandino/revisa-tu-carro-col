import { expect } from "@playwright/test";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitSummary {
  ID: string;
  Subject: string;
}

/** Waits for the latest email to `to` (local Mailpit only) and returns the auth link path it contains. */
export async function latestAuthLinkPath(to: string, subjectIncludes: string): Promise<string> {
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
        const body = (await res.json()) as { messages: MailpitSummary[] };
        messageId = body.messages.find((m) => m.Subject.includes(subjectIncludes))?.ID;
        return messageId;
      },
      { timeout: 15_000, message: `email "${subjectIncludes}" to ${to}` },
    )
    .toBeTruthy();

  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const { HTML } = (await res.json()) as { HTML: string };
  const href = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(HTML)?.[1];
  if (!href) throw new Error("No auth link in email");
  const url = new URL(href.replaceAll("&amp;", "&"));
  return `${url.pathname}${url.search}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}
