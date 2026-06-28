'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'uploading' | 'redirecting'>('form');

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const valid = Array.from(selected).filter(f => f.type.startsWith('image/')).slice(0, 10);
    setFiles(prev => [...prev, ...valid].slice(0, 10));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !email || !address) {
      setError('Please fill in all fields and upload at least one photo.');
      return;
    }
    setError('');
    setStep('uploading');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('propertyAddress', address);
      files.forEach(f => formData.append('photos', f));

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { orderId } = await uploadRes.json();

      setStep('redirecting');

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!checkoutRes.ok) throw new Error('Checkout failed');
      const { url } = await checkoutRes.json();

      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('form');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[#c9a96e] text-sm font-semibold tracking-[0.2em] uppercase mb-4">Solved Digital</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Turn Property Photos Into<br />
            <span className="text-[#c9a96e]">Cinematic Walkthrough Videos</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Upload your Airbnb or real estate photos. Get a professional AI-generated walkthrough video delivered to your inbox within 30 minutes.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-14 text-center">
          {[
            { num: '1', label: 'Upload Photos', desc: 'Any 3–10 property images' },
            { num: '2', label: 'We Generate', desc: 'AI creates your walkthrough' },
            { num: '3', label: 'Delivered Fast', desc: 'Video in your inbox in ~30 min' },
          ].map(item => (
            <div key={item.num} className="bg-[#141414] border border-white/5 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-[#c9a96e]/20 text-[#c9a96e] text-sm font-bold flex items-center justify-center mx-auto mb-3">{item.num}</div>
              <p className="font-semibold text-sm mb-1">{item.label}</p>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center cursor-pointer hover:border-[#c9a96e]/40 transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            {files.length === 0 ? (
              <>
                <div className="text-4xl mb-3">📸</div>
                <p className="text-gray-300 font-medium">Drop property photos here</p>
                <p className="text-gray-500 text-sm mt-1">or click to browse · up to 10 photos</p>
              </>
            ) : (
              <div className="grid grid-cols-4 gap-3" onClick={e => e.stopPropagation()}>
                {files.map((f, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {files.length < 10 && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="h-20 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-gray-600 cursor-pointer hover:border-white/20 text-2xl"
                  >
                    +
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a96e]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Property Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a96e]/50"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c9a96e] hover:bg-[#b8934f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-colors"
          >
            {step === 'uploading' ? 'Uploading photos...' :
             step === 'redirecting' ? 'Redirecting to checkout...' :
             'Order Walkthrough Video — $97'}
          </button>

          <p className="text-center text-gray-600 text-xs">
            Secure checkout · 30-day money-back guarantee · Video delivered in ~30 min
          </p>
        </form>

        <div className="mt-20 border-t border-white/5 pt-12">
          <h2 className="text-xl font-bold text-center mb-8">What you get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🎬', title: 'Cinematic Quality', desc: 'Smooth gimbal-style camera movement through your property' },
              { icon: '🏡', title: 'Full Walkthrough', desc: 'Exterior to every major room in one continuous tour' },
              { icon: '⚡', title: 'Fast Delivery', desc: 'Video in your inbox within 30 minutes of payment' },
              { icon: '📱', title: 'Listing-Ready', desc: 'Perfect for Airbnb, Zillow, Booking.com, and Instagram' },
            ].map(item => (
              <div key={item.title} className="flex gap-4 bg-[#141414] border border-white/5 rounded-xl p-5">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
