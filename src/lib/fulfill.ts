import { getOrder, updateOrder } from '@/lib/orders';
import { generateVideo, generateReelSegment, chunkPhotos, makeRunBudget } from '@/lib/fal';
import { sortPhotoUrls } from '@/lib/sort';
import { stitchClips, makeVerticalVariants, addMusicTrack } from '@/lib/stitch';
import { saveVideo } from '@/lib/videos';
import { sendDeliveryEmail, sendFailureEmail, sendAdminAlert } from '@/lib/resend';

// The one fulfillment pipeline: sort → generate → stitch → persist → email.
// Called from the Stripe webhook (paid orders) and /api/fulfill (free mode).
export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  try {
    const sortedUrls = await sortPhotoUrls(order.photoUrls);

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
        propertyAddress: order.propertyAddress,
        orderId,
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
