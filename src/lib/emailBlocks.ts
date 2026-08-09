/**
 * A tiny block language for the nurture emails, rendered to HTML and to plain
 * text from the same definition.
 *
 * Two reasons it exists rather than each email being an HTML string:
 *
 * 1. Every send needs a real `text/plain` alternative. A multipart email with a
 *    genuine text part lands in the inbox measurably more often than an
 *    HTML-only one, and hand-maintaining two copies of eleven emails guarantees
 *    they drift.
 * 2. The nurture emails are supposed to read like a person wrote them, so the
 *    vocabulary is deliberately small: paragraphs, a list, one figure card, one
 *    button. There is no way to express a three-column banner here, which is
 *    the point.
 */

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  /** Label/value rows in a tinted box. The one place a figure gets emphasis. */
  | { t: "figures"; rows: Array<[string, string]> }
  | { t: "quote"; text: string; by: string }
  | { t: "cta"; label: string; href: string }
  /** Small print under a button. */
  | { t: "note"; text: string }
  | { t: "hr" };

const INK = "#15130f";
const SOFT = "#6f6a60";
const LINE = "#e7e1d6";
const ACCENT = "#0f7d6b";
const MINT = "#e3f3ec";

/** HTML-escape. Copy is authored in this repo, but it interpolates answers and
 *  a promo code, so everything goes through here on principle. */
export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** URLs land in href="..." and must not carry a raw quote or angle bracket. */
const escAttr = (s: string) => esc(s).replace(/'/g, "&#39;");

function blockHtml(b: Block): string {
  switch (b.t) {
    case "p":
      return `<p style="color:${INK};font-size:15px;line-height:1.62;margin:0 0 18px;">${esc(b.text)}</p>`;
    case "h":
      return `<p style="color:${INK};font-size:16px;font-weight:700;line-height:1.4;margin:26px 0 12px;">${esc(b.text)}</p>`;
    case "ul":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${b.items
        .map(
          (i) =>
            `<tr>
               <td style="color:${ACCENT};font-size:15px;line-height:1.62;padding:0 10px 8px 0;vertical-align:top;">&bull;</td>
               <td style="color:${INK};font-size:15px;line-height:1.62;padding:0 0 8px;">${esc(i)}</td>
             </tr>`,
        )
        .join("")}</table>`;
    case "figures":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${MINT};border-radius:14px;margin:0 0 20px;">
        <tr><td style="padding:16px 18px;">${b.rows
          .map(
            ([label, value], i) =>
              `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${
                i ? `border-top:1px solid rgba(15,125,107,0.18);` : ""
              }">
                 <tr>
                   <td style="color:${SOFT};font-size:14px;padding:${i ? "10px" : "0"} 0 ${i ? "0" : "10px"};">${esc(label)}</td>
                   <td align="right" style="color:${INK};font-size:16px;font-weight:700;padding:${i ? "10px" : "0"} 0 ${i ? "0" : "10px"};">${esc(value)}</td>
                 </tr>
               </table>`,
          )
          .join("")}</td></tr></table>`;
    case "quote":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr><td style="border-left:3px solid ${LINE};padding:2px 0 2px 16px;">
          <p style="color:${INK};font-size:15px;line-height:1.6;font-style:italic;margin:0 0 6px;">${esc(b.text)}</p>
          <p style="color:${SOFT};font-size:13px;margin:0;">${esc(b.by)}</p>
        </td></tr></table>`;
    case "cta":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 12px;">
        <tr><td style="background:${ACCENT};border-radius:999px;">
          <a href="${escAttr(b.href)}" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;padding:15px 30px;text-decoration:none;">${esc(b.label)} &rarr;</a>
        </td></tr></table>`;
    case "note":
      return `<p style="color:${SOFT};font-size:13px;line-height:1.55;margin:0 0 18px;">${esc(b.text)}</p>`;
    case "hr":
      return `<div style="border-top:1px solid ${LINE};margin:24px 0;"></div>`;
  }
}

function blockText(b: Block): string {
  switch (b.t) {
    case "p":
      return b.text;
    case "h":
      return b.text.toUpperCase();
    case "ul":
      return b.items.map((i) => `  - ${i}`).join("\n");
    case "figures":
      return b.rows.map(([l, v]) => `  ${l}: ${v}`).join("\n");
    case "quote":
      return `  "${b.text}"\n  ${b.by}`;
    case "cta":
      return `${b.label}:\n${b.href}`;
    case "note":
      return b.text;
    case "hr":
      return "---";
  }
}

/**
 * Wrap the blocks in the Tourly shell.
 *
 * Deliberately plainer than the transactional shell: no card, no logo image,
 * one column, left aligned. These emails claim to be a person following up on a
 * diagnostic, and a designed template contradicts the claim before the first
 * line is read.
 */
export function renderHtml(params: {
  blocks: Block[];
  preheader: string;
  unsubUrl: string;
  /** Shown above the unsubscribe link so the recipient can place the email. */
  reason: string;
}): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f3;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(params.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;">
        <tr><td style="padding:0 0 22px;">
          <span style="color:${INK};font-size:19px;font-weight:700;letter-spacing:-0.02em;">Tourly</span>
        </td></tr>
        <tr><td>${params.blocks.map(blockHtml).join("\n")}</td></tr>
        <tr><td style="border-top:1px solid ${LINE};padding:20px 0 0;">
          <p style="color:${SOFT};font-size:12px;line-height:1.55;margin:0;">
            ${esc(params.reason)}<br>
            <a href="${escAttr(params.unsubUrl)}" style="color:${SOFT};text-decoration:underline;">Unsubscribe</a>
            and you will not hear from me again.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderText(params: {
  blocks: Block[];
  unsubUrl: string;
  reason: string;
}): string {
  const body = params.blocks.map(blockText).filter(Boolean).join("\n\n");
  return `${body}\n\n---\n${params.reason}\nUnsubscribe: ${params.unsubUrl}\n`;
}
