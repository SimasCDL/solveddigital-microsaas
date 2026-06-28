import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeliveryEmail(params: {
  to: string;
  propertyAddress: string;
  videoUrls: string[];
  orderId: string;
}): Promise<void> {
  const videoLinks = params.videoUrls
    .map((url, i) => `<p><a href="${url}" style="color:#c9a96e;font-weight:600;">Download Clip ${i + 1}</a></p>`)
    .join('');

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.to,
    subject: `Your Property Walkthrough Video is Ready`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;padding:40px;border-radius:8px;">
        <h1 style="color:#c9a96e;font-size:24px;margin-bottom:8px;">Your video is ready</h1>
        <p style="color:#999;margin-bottom:32px;">${params.propertyAddress}</p>
        <p style="margin-bottom:24px;">Your professional walkthrough video has been generated. Click below to download your clip(s):</p>
        ${videoLinks}
        <p style="color:#666;font-size:12px;margin-top:32px;">Order #${params.orderId} · Links expire in 7 days</p>
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
