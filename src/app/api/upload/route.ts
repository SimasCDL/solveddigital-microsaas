import { after } from "next/server";
import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createOrder } from "@/lib/orders";
import { sendTelegram } from "@/lib/telegram";
import type { Order } from "@/lib/types";

fal.config({ credentials: process.env.FAL_KEY! });

const MAX_PHOTOS = 40; // the biggest pack
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per photo

export async function POST(req: NextRequest) {
  // Hoisted so the catch can name the customer and the photo count in the
  // alert. Knowing WHO could not upload is the difference between an alert you
  // can act on and one you can only note.
  let email = "";
  let fileCount = 0;

  try {
    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];
    fileCount = files.length;
    email = ((formData.get("email") as string) || "").trim();
    // property address is optional — kept for support labelling if provided
    const propertyAddress = (formData.get("propertyAddress") as string) || "";
    const music = formData.get("music") === "true";

    if (!files.length || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Only real image files, non-empty and within the per-file cap — reject
    // anything else server-side so the endpoint can't be used to dump arbitrary
    // large files into storage.
    const valid = files
      .slice(0, MAX_PHOTOS)
      .filter(
        (f) =>
          f.type.startsWith("image/") && f.size > 0 && f.size <= MAX_FILE_BYTES,
      );
    if (!valid.length) {
      return NextResponse.json(
        { error: "No valid image files" },
        { status: 400 },
      );
    }

    // uploaded in parallel
    const photoUrls = await Promise.all(
      valid.map((file) => fal.storage.upload(file)),
    );

    const orderId = uuid();
    const order: Order = {
      id: orderId,
      email,
      propertyAddress,
      photoUrls,
      music,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createOrder(order);

    return NextResponse.json({ orderId, photoCount: photoUrls.length });
  } catch (err) {
    console.error("Upload error:", err);

    // This is the first step after payment. A failure here means a customer who
    // has already been charged cannot hand over their photos, and until now the
    // only trace was a Vercel log line while they were shown "please try again"
    // — advice that cannot work when the cause is a locked provider.
    //
    // fal.ai answers 403 "User is locked. Reason: Exhausted balance." when the
    // account runs dry, which is exactly what happened on 13 Aug 2026 and is
    // indistinguishable from any other 500 from the outside. Call it out by
    // name, because the fix is a billing page and nothing else.
    const detail = String(err);
    const providerLocked = /exhausted balance|user is locked/i.test(detail);

    after(() =>
      sendTelegram(
        `🚨 *Upload FAILED* — customer cannot submit photos\n` +
          `📧 ${email || "(no email)"}\n` +
          `📸 ${fileCount} file(s)\n` +
          (providerLocked
            ? `💳 *fal.ai balance exhausted* — top up at fal.ai/dashboard/billing\n`
            : "") +
          `⚠️ ${detail.slice(0, 300)}`,
      ).catch(() => {}),
    );

    return NextResponse.json(
      {
        // Honest, and never "try again" when retrying cannot help. Same rule the
        // /help channel exists for: a customer who paid and got nothing must be
        // given a route to a human, not a spinner and a shrug.
        // No "please try again" on the locked-provider path — retrying cannot
        // work, and telling someone who has paid to keep clicking is how a
        // refund request turns into a chargeback. The page appends a /help link.
        error: providerLocked
          ? "We couldn't process your photos — something on our side is down, and we've been alerted. Your purchase is safe and we'll get your tour to you."
          : "We couldn't upload your photos, and we've been alerted. If it happens again, let us know.",
      },
      { status: 500 },
    );
  }
}
