import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';
import { sendQuizDiagnosticEmail } from '@/lib/resend';
import { packCheckoutUrl } from '@/lib/pricing';
import { diagnose, costSentence, usd, type Answers } from '@/lib/quiz';

/**
 * Quiz lead capture — mails the diagnostic and alerts the channel.
 *
 * Public by design, same as `/api/free`: there's no login and the endpoint
 * grants nothing. It sends a fixed-format email to the address supplied and
 * holds no Stripe or admin capability, so the worst a bad actor gets is a noisy
 * Telegram channel. It deliberately accepts no caller-supplied copy — every word
 * of the email is derived server-side from the answers.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, answers } = (await req.json()) as {
      email?: string;
      answers?: Answers;
    };

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const a = answers ?? {};
    const d = diagnose(a);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const checkoutUrl = `${packCheckoutUrl(d.pack)}&prefilled_email=${encodeURIComponent(email)}`;
    const costLine = `${usd(d.costLow)}–${usd(d.costHigh)}${d.single ? '' : ' a year'} ${costSentence(d)}`;

    // Both after() — the visitor is already watching the "analyzing" spinner and
    // must never wait on an email provider to see their result.
    after(() =>
      sendQuizDiagnosticEmail({
        to: email,
        archetype: d.archetype,
        score: d.score,
        costLine,
        situation: d.situation,
        fixFirst: d.fixFirst,
        plan: d.plan,
        packName: d.pack.name,
        packPrice: d.pack.priceLabel,
        checkoutUrl,
      }).catch((err) => console.error('[quiz-lead] diagnostic email failed:', err)),
    );

    after(() =>
      sendTelegram(
        `🧭 *Quiz lead* · ${d.archetype} (${d.score}/100)\n` +
        `📧 ${email}\n` +
        `👤 ${a.who ?? '—'} · 📈 ${d.single ? 'single property' : `${d.perYear} listings/yr`} · 🎥 today: ${a.today ?? '—'}\n` +
        `😖 pain: ${a.pain ?? '—'}\n` +
        `💡 ${d.pack.name} (${d.pack.priceLabel}) · market rate ${usd(d.costLow)}–${usd(d.costHigh)}` +
        (appUrl ? `\n🔗 ${appUrl}/f/quiz` : ''),
      ).catch(() => {}),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[quiz-lead] request failed:', err);
    // Never surface a failure — the visitor's result must render regardless.
    return NextResponse.json({ ok: false });
  }
}
