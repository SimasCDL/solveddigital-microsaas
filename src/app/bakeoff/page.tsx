'use client';

import { useState, useRef } from 'react';

interface CandidateInfo {
  key: string;
  label: string;
  price: number;
  seconds: number;
}

interface CandidateResult {
  url?: string;
  error?: string;
  ms?: number;
}

const TEST_COST = '5.70';

export default function Bakeoff() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [candidates, setCandidates] = useState<CandidateInfo[]>([]);
  const [results, setResults] = useState<Record<string, CandidateResult>>({});
  const [error, setError] = useState('');

  const handleFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (f && f.type.startsWith('image/')) setFile(f);
  };

  const run = async () => {
    if (!file || running) return;
    setRunning(true);
    setError('');
    setCandidates([]);
    setResults({});

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const key = localStorage.getItem('admin_key') || window.prompt('Access key:') || '';
      localStorage.setItem('admin_key', key);
      const res = await fetch('/api/bakeoff', { method: 'POST', body: formData, headers: { 'x-admin-key': key } });
      if (res.status === 401) {
        localStorage.removeItem('admin_key');
        throw new Error('Wrong access key — try again.');
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === 'status') setStatusMsg(event.message);
          if (event.type === 'started') {
            setCandidates(event.candidates);
            setStatusMsg('Generating with all models — a few minutes...');
          }
          if (event.type === 'result') {
            setResults(prev => ({ ...prev, [event.key]: { url: event.url, error: event.error, ms: event.ms } }));
          }
          if (event.type === 'done') setStatusMsg('');
          if (event.type === 'error') throw new Error(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRunning(false);
      setStatusMsg('');
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', paddingInline: 24, justifyContent: 'space-between' }}>
        <span style={{ fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          Solved Digital
        </span>
        <span className="cap">Model bake-off</span>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' }}>
        <h1 style={{ fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 6 }}>
          Model bake-off
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5, maxWidth: 560 }}>
          One photo, six models, same instructions. Watch the clips side by side and pick the smoothest — ~${TEST_COST} per run.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 32, flexWrap: 'wrap' }}>
          <div
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: file ? 6 : '24px 32px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg2)', minWidth: 220 }}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            {file
              ? <img src={URL.createObjectURL(file)} alt="" style={{ height: 90, borderRadius: 8, display: 'block' }} />
              : <p style={{ fontSize: 13, color: 'var(--muted)' }}>Drop one photo here</p>
            }
          </div>
          <button className="btn-primary" onClick={run} disabled={!file || running} style={{ alignSelf: 'center', minWidth: 200 }}>
            {running ? 'Running...' : `Run bake-off — ~$${TEST_COST}`}
          </button>
        </div>

        {statusMsg && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)', animation: 'pulse 1.2s ease-in-out infinite' }} />
            {statusMsg}
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 20 }}>{error}</p>}

        {candidates.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {candidates.map(c => {
              const r = results[c.key];
              return (
                <div key={c.key} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>${c.price.toFixed(2)}/clip</span>
                  </div>
                  <div style={{ aspectRatio: '16/9', background: 'var(--slot)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r?.url
                      ? <video controls loop muted playsInline src={r.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : r?.error
                        ? <p style={{ fontSize: 11, color: '#c0392b', padding: 12, textAlign: 'center' }}>Failed: {r.error.slice(0, 140)}</p>
                        : <p style={{ fontSize: 11, color: 'var(--muted2)' }}>{running ? 'Generating...' : 'Waiting'}</p>
                    }
                  </div>
                  {r?.ms && !r.error && (
                    <p style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 6 }}>{c.seconds}s clip · generated in {Math.round(r.ms / 1000)}s</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
