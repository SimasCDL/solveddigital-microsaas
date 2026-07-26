import { getOrder, updateOrder } from '@/lib/orders';
import { generateVideo, generateReelSegment, chunkPhotos, makeRunBudget } from '@/lib/fal';
import { sortPhotoUrls } from '@/lib/sort';
import { stitchClips, makeVerticalVariants, addMusicTrack } from '@/lib/stitch';
import { saveVideo } from '@/lib/videos';
import { sendDeliveryEmail, sendFailureEmail, sendAdminAlert } from '@/lib/resend';
import { sendMetaEventServerSide } from '@/lib/meta';
import { sendTelegram } from '@/lib/telegram';

// The one fulfillment pipeline: sort → generate → stitch → persist → email.
// Called from the Stripe webhook (paid orders) and /api/fulfill (free mode).
//
// `limitPhotos` builds the video from only the first N photos after sorting.
// The order always stores every photo the customer uploaded — the free preview
// just renders a few of them, and unlocking re-runs this with no limit (or the
// limit their pack allows) against the same stored set.
export async function fulfillOrder(
  orderId: string,
  opts: { limitPhotos?: number } = {},
): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  // Free trials carry a `free:<segment>` marker instead of a Stripe session id.
  const isFree = (order.stripeSessionId ?? '').startsWith('free:');

  // Report the conversion to Meta server-side, independent of the customer's
  // browser; de-dupes with the browser pixel via event_id=orderId. A free trial
  // must report StartTrial — sending Lead here would dilute the purchase signal
  // the paid campaigns optimize on, which is the whole reason they're separate.
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await sendMetaEventServerSide({
    eventName: isFree ? 'StartTrial' : 'Lead',
    orderId,
    email: order.email,
    eventSourceUrl: `${appBase}/order/${orderId}`,
  }).catch(() => {});

  try {
    // Sort FIRST, then trim — so a limited preview opens on the exterior and
    // walks inward like the full tour, rather than using whichever photos the
    // customer happened to select first.
    const allSorted = await sortPhotoUrls(order.photoUrls);
    const sortedUrls = opts.limitPhotos
      ? allSorted.slice(0, opts.limitPhotos)
      : allSorted;
    console.log(
      `[fulfill] ${orderId}: stored=${order.photoUrls.length} ` +
        `limit=${opts.limitPhotos ?? 'none'} using=${sortedUrls.length}`,
    );

    // same pipeline as the test page: Seedance reel segments when enabled,
    // per-photo clips otherwise
    let clips: string[];
    if (process.env.VIDEO_PROVIDER === 'seedance' && process.env.REPLICATE_API_TOKEN) {
      const chunks = chunkPhotos(sortedUrls, 5);
      const runBudget = makeRunBudget(chunks.length);
      const settled = await Promise.allSettled(chunks.map(chunk => generateReelSegment(chunk, undefined, runBudget)));
      clips = settled
        .filter((s): s is PromiseFulfilledResult<string> => s.status === 'fulfilled')
        .map(s => s.value);
    } else {
      const runBudget = makeRunBudget(sortedUrls.length);
      const settled = await Promise.allSettled(sortedUrls.map(url => generateVideo(url, undefined, runBudget)));
      clips = settled
        .filter((s): s is PromiseFulfilledResult<string> => s.status === 'fulfilled')
        .map(s => s.value);
    }

    if (!clips.length) throw new Error('All clips failed to generate');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const absolute = (u: string) => (u.startsWith('/') ? `${appUrl}${u}` : u);

    // One 16:9 master generation → three delivered formats (no re-generation).
    const master = await stitchClips(clips);
    let { blurred, crop } = await makeVerticalVariants(master);
    let wide = master;

    // If the customer chose music, lay the SAME track over all three formats.
    if (order.music) {
      [wide, blurred, crop] = await Promise.all([
        addMusicTrack(master),
        addMusicTrack(blurred),
        addMusicTrack(crop),
      ]);
    }

    const wideUrl = absolute(await saveVideo(orderId, wide));
    const blurredUrl = absolute(await saveVideo(`${orderId}-9x16`, blurred));
    const cropUrl = absolute(await saveVideo(`${orderId}-9x16-crop`, crop));

    // videoUrls = [0] widescreen 16:9, [1] vertical 9:16 (blurred), [2] vertical 9:16 (full-screen crop).
    // The order stores permanent (private) URLs for support; the customer's
    // email gets signed links that expire after 7 days.
    const allUrls = [wideUrl, blurredUrl, cropUrl];
    await updateOrder(orderId, { status: 'completed', videoUrls: allUrls });

    // The video exists and the order page can serve it — a delivery-email
    // failure must NOT mark the order failed. Alert the admin instead.
    try {
      await sendDeliveryEmail({
        to: order.email,
        orderId,
        preview: isFree,
      });
    } catch (emailErr) {
      console.error('[fulfill] delivery email failed (video is fine):', emailErr);
      await sendAdminAlert(
        `Delivery email FAILED for order ${orderId}`,
        `The video generated fine but the email to ${order.email} failed.\n` +
        `Send them their order page manually.\n\nError: ${String(emailErr)}`
      ).catch(() => {});
    }
  } catch (err) {
    console.error('Video generation failed:', err);
    await updateOrder(orderId, { status: 'failed', errorMessage: String(err) });

    // Telegram first and always: sendAdminAlert depends on ADMIN_ALERT_EMAIL
    // being set and silently drops the alert if it isn't, which would leave a
    // failed order — and a real prospect's email — completely unnoticed.
    await sendTelegram(
      `⚠️ *Order FAILED* · ${isFree ? 'free trial' : 'paid'}\n` +
      `📧 ${order.email}\n📸 ${order.photoUrls.length} photos\n🆔 \`${orderId}\`\n\n` +
      `${String(err).slice(0, 300)}`
    ).catch(() => {});

    await sendFailureEmail({ to: order.email, orderId }).catch(e =>
      console.error('[fulfill] failure email also failed:', e)
    );
    await sendAdminAlert(
      `Order ${orderId} FAILED`,
      `Customer: ${order.email}\nProperty: ${order.propertyAddress}\nPhotos: ${order.photoUrls.length}\n\n` +
      `Error: ${String(err)}\n\n` +
      `Retry it with:\ncurl -X POST <app-url>/api/admin/retry -H "x-admin-key: <ADMIN_KEY>" -H "Content-Type: application/json" -d "{\\"orderId\\":\\"${orderId}\\"}"`
    ).catch(() => {});
  }
}
