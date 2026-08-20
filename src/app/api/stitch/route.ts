import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { stitchClips } from "@/lib/stitch";
import { saveVideo } from "@/lib/videos";

// 300s is the ceiling on Vercel's Hobby plan — a higher value does not just get
// clamped, it fails the deploy with "invalid maxDuration value". Raise this only
// alongside a plan upgrade.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (
    !process.env.ADMIN_KEY ||
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { urls }: { urls: string[] } = await req.json();
    if (!urls?.length) {
      return NextResponse.json(
        {
          error:
            "No clips to merge - every clip failed to generate. Please try again.",
        },
        { status: 400 },
      );
    }

    const data = await stitchClips(urls);
    const id = randomUUID();
    const url = await saveVideo(id, data);

    return NextResponse.json({ id, url });
  } catch (err) {
    console.error("[stitch]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
