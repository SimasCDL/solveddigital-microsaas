import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createOrder } from "@/lib/orders";
import type { Order } from "@/lib/types";

fal.config({ credentials: process.env.FAL_KEY! });

const MAX_PHOTOS = 40; // the biggest pack
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per photo

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];
    const email = ((formData.get("email") as string) || "").trim();
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
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
