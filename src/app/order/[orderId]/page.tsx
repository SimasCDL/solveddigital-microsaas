'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type Status = 'pending_payment' | 'processing' | 'completed' | 'failed';

interface StatusData {
  status: Status;
  videoUrls: string[];
  propertyAddress: string;
  photoCount: number;
}

const POLL_INTERVAL = 8000;

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get('success') === '1';

  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status?orderId=${orderId}`);
        if (!res.ok) throw new Error('Order not found');
        const json: StatusData = await res.json();
        setData(json);

        if (json.status !== 'processing' && json.status !== 'pending_payment') return;
        timer = setTimeout(poll, POLL_INTERVAL);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [orderId]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <p className="text-[#c9a96e] text-sm font-semibold tracking-[0.2em] uppercase mb-8">Solved Digital</p>

        {error ? (
          <div>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : !data ? (
          <div>
            <div className="w-10 h-10 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-400">Loading order status...</p>
          </div>
        ) : data.status === 'completed' ? (
          <div>
            <div className="text-6xl mb-6">🎬</div>
            <h1 className="text-3xl font-bold mb-3">Your video is ready!</h1>
            <p className="text-gray-400 mb-8">{data.propertyAddress}</p>
            <div className="space-y-4">
              <video
                controls
                src={data.videoUrls[0]}
                className="w-full rounded-xl mb-3 aspect-video bg-black"
              />
              <a
                href={data.videoUrls[0]}
                download="property-video.mp4"
                className="block w-full bg-[#c9a96e] hover:bg-[#b8934f] text-black font-bold py-4 rounded-xl transition-colors"
              >
                Download the full video →
              </a>
              {data.videoUrls.length > 1 && (
                <div className="text-left">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-6 mb-3">Individual clips</p>
                  <div className="flex flex-wrap gap-2">
                    {data.videoUrls.slice(1).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        download={`clip-${i + 1}.mp4`}
                        className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors"
                      >
                        Clip {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-6">
              We also sent these links to your email · Order #{orderId}
            </p>
          </div>
        ) : data.status === 'failed' ? (
          <div>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Generation failed</h1>
            <p className="text-gray-400 text-sm">
              We&apos;ve been notified and will issue a full refund within 3–5 business days.
            </p>
          </div>
        ) : (
          <div>
            {justPaid && (
              <div className="bg-green-950/40 border border-green-800/30 rounded-xl px-5 py-3 mb-8 text-sm text-green-400">
                ✓ Payment confirmed — generating your video now
              </div>
            )}
            <div className="w-14 h-14 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Creating your walkthrough</h1>
            <p className="text-gray-400 mb-2">{data.propertyAddress}</p>
            <p className="text-gray-500 text-sm">
              Generating {data.photoCount} clip{data.photoCount !== 1 ? 's' : ''} · usually ready in 15–30 minutes
            </p>
            <p className="text-gray-600 text-xs mt-8">
              This page updates automatically · We&apos;ll also email you when done
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
