import { NextRequest, NextResponse } from 'next/server';

// Admin-gated env diagnostic — reports which env vars production actually has
// (presence + length only, never the secret values). Pass x-admin-key.
export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_KEY || req.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  const p = (k: string) => {
    const v = process.env[k];
    return v ? `set (len ${v.length})` : 'MISSING';
  };
  return NextResponse.json({
    ANTHROPIC_API_KEY: p('ANTHROPIC_API_KEY'),
    REPLICATE_API_TOKEN: p('REPLICATE_API_TOKEN'),
    FAL_KEY: p('FAL_KEY'),
    SUPABASE_URL: process.env.SUPABASE_URL || 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: p('SUPABASE_SERVICE_ROLE_KEY'),
    STRIPE_SECRET_KEY: p('STRIPE_SECRET_KEY'),
    RESEND_API_KEY: p('RESEND_API_KEY'),
    FROM_EMAIL: process.env.FROM_EMAIL || 'MISSING',
    VIDEO_PROVIDER: process.env.VIDEO_PROVIDER || 'MISSING',
    NEXT_PUBLIC_FREE_MODE: process.env.NEXT_PUBLIC_FREE_MODE || 'MISSING',
    // Must be absent/false in production — bypasses Stripe payment verification.
    SKIP_PAYMENT_CHECK: process.env.SKIP_PAYMENT_CHECK || 'unset (good)',
  });
}
