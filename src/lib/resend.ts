import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeliveryEmail(params: {
  to: string;
  propertyAddress: string;
  videoUrls: string[];
  orderId: string;
}): Promise<void> {
  const [fullVideo, ...clips] = params.videoUrls;
  const clipLinks = clips.length
    ? `<p style="color:#999;margin:28px 0 8px;font-size:13px;">Individual clips (one per photo):</p>
       <p style="line-height:2;">${clips
         .map((url, i) => `<a href="${url}" style="color:#c9a96e;text-decoration:underline;margin-right:14px;white-space:nowrap;">Clip ${i + 1}</a>`)
         .join('')}</p>`
    : '';

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `Your Property Video is Ready`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;padding:40px;border-radius:8px;">
        <h1 style="color:#c9a96e;font-size:24px;margin-bottom:8px;">Your video is ready</h1>
        <p style="color:#999;margin-bottom:32px;">${params.propertyAddress}</p>
        <p style="margin-bottom:24px;">Your full property video, plus every individual clip:</p>
        <p style="margin-bottom:12px;"><a href="${fullVideo}" style="display:inline-block;background:#c9a96e;color:#000;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;">Download the full video</a></p>
        ${clipLinks}
        <p style="color:#666;font-size:12px;margin-top:32px;">Order #${params.orderId}</p>
      </div>
    `,
  });
}

export async function sendFailureEmail(params: {
  to: string;
  orderId: string;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `Issue with your Property Walkthrough Video`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;padding:40px;border-radius:8px;">
        <h1 style="color:#c9a96e;font-size:24px;">We ran into an issue</h1>
        <p>We encountered a problem generating your video for order #${params.orderId}. Our team has been notified and you will receive a full refund within 3-5 business days.</p>
      </div>
    `,
  });
}
