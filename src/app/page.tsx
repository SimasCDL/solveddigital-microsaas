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
      setError('Please upload photos and fill in all fields.');
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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        height: 56,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: 24,
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}>
          Solved Digital
        </span>
        <span className="cap">Real estate video</span>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '56px 20px 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <p className="cap" style={{ marginBottom: 12 }}>Powered by Kling AI</p>
          <h1 style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: 'var(--ink)',
            marginBottom: 12,
          }}>
            Turn property photos into cinematic walkthrough videos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 440 }}>
            Upload your Airbnb or listing photos. Get a professional AI walkthrough video delivered to your inbox within 30 minutes.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[
            { n: '1', label: 'Upload photos' },
            { n: '2', label: 'We generate' },
            { n: '3', label: 'Video delivered' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <span className="cidx" style={{ color: 'var(--ink)' }}>{s.n}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{s.label}</span>
              {i < 2 && (
                <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="card" style={{ padding: 20, marginBottom: 32 }}>

          {/* Upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '1px dashed var(--border)',
              borderRadius: 12,
              padding: files.length ? 12 : '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--bg2)',
              marginBottom: 16,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                  Drop property photos here
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted2)' }}>
                  or click to browse — up to 10 photos
                </p>
              </>
            ) : (
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}
                onClick={e => e.stopPropagation()}
              >
                {files.map((f, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: 'var(--slot)' }}>
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{
                        position: 'absolute', top: 3, right: 3,
                        width: 16, height: 16,
                        background: 'rgba(0,0,0,0.55)',
                        border: 'none', borderRadius: '50%',
                        color: '#fff', fontSize: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {files.length < 10 && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      aspectRatio: '1', background: 'var(--slot)', borderRadius: 8,
                      border: '1px dashed var(--border)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--muted2)', fontSize: 18, cursor: 'pointer',
                    }}
                  >
                    +
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label className="cap" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
              />
            </div>
            <div>
              <label className="cap" style={{ display: 'block', marginBottom: 6 }}>Property address</label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City"
                className="field"
              />
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 10 }}>{error}</p>
          )}

          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ marginBottom: 10 }}>
            {step === 'uploading' ? 'Uploading photos…' :
             step === 'redirecting' ? 'Opening checkout…' :
             'Order walkthrough video — $97'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--muted2)', textAlign: 'center' }}>
            Secure checkout · 30-day money-back guarantee · ~30 min delivery
          </p>
        </div>

        {/* What you get */}
        <p className="cap" style={{ marginBottom: 14 }}>What you get</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { title: 'Cinematic quality', desc: 'Smooth gimbal-style camera movement, photorealistic depth' },
            { title: 'Full walkthrough', desc: 'Exterior through every major room, one continuous tour' },
            { title: 'Fast delivery', desc: 'Video in your inbox within 30 minutes of payment' },
            { title: 'Listing-ready', desc: 'Perfect for Airbnb, Zillow, Booking.com, and Instagram' },
          ].map((item, i) => (
            <div key={i} className="card" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{item.title}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
