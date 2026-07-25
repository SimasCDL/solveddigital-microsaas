/**
 * Send a Telegram message to the configured chat/channel.
 *
 * Never throws — callers treat alerting as best-effort. Returns a result so the
 * admin diagnostic can report WHY a message didn't arrive (Telegram answers 400
 * for a bad chat id and 401 for a bad token, which a swallowed error hides).
 */
export async function sendTelegram(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      // Telegram puts the reason in the body ("chat not found", "unauthorized").
      const body = await res.text().catch(() => "");
      console.error("Telegram send failed:", res.status, body);
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Telegram send failed:", err);
    return { ok: false, error: String(err) };
  }
}
