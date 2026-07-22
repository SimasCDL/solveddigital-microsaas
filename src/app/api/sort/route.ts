import { NextRequest, NextResponse } from "next/server";
import {
  classifyPhoto,
  planWalkthrough,
  ROOM_ORDER,
  type PhotoSource,
} from "@/lib/sort";

export async function POST(req: NextRequest) {
  if (
    !process.env.ADMIN_KEY ||
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // JSON body with photo URLs → whole-house spatial planning in one call
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const { urls } = await req.json();
      if (!Array.isArray(urls) || !urls.length) {
        return NextResponse.json({ error: "No photo URLs" }, { status: 400 });
      }
      const capped = (urls as string[]).slice(0, 12);
      try {
        const plan = await planWalkthrough(capped.map((url) => ({ url })));
        return NextResponse.json({
          sorted: plan.order.map((i) => ({
            index: i,
            label: plan.labels[i] ?? "other",
          })),
        });
      } catch (err) {
        console.error(
          "[sort] plan failed, falling back to original order:",
          err,
        );
        return NextResponse.json({
          sorted: capped.map((_, i) => ({ index: i, label: "other" })),
        });
      }
    }

    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];
    if (!files.length)
      return NextResponse.json({ error: "No photos" }, { status: 400 });

    const sources: PhotoSource[] = await Promise.all(
      files.map(async (file) => ({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mediaType: file.type || "image/jpeg",
      })),
    );

    // Whole-house spatial planning for uploaded files too — consecutive photos
    // in the order should be physically adjacent so transitions never jump walls.
    try {
      const plan = await planWalkthrough(sources);
      return NextResponse.json({
        sorted: plan.order.map((i) => ({
          index: i,
          label: plan.labels[i] ?? "other",
        })),
      });
    } catch (err) {
      console.error(
        "[sort] plan failed, falling back to per-photo labels:",
        err,
      );
    }

    const classifications = await Promise.all(
      sources.map(async (s, i) => {
        const label =
          "base64" in s ? await classifyPhoto(s.base64, s.mediaType) : "other";
        return { index: i, label, order: ROOM_ORDER[label] ?? 11 };
      }),
    );

    classifications.sort((a, b) => a.order - b.order || a.index - b.index);

    return NextResponse.json({
      sorted: classifications.map((c) => ({ index: c.index, label: c.label })),
    });
  } catch (err) {
    console.error("Sort error:", err);
    return NextResponse.json({ error: "Sort failed" }, { status: 500 });
  }
}
