'use client';

import { useState, useRef, useEffect } from 'react';

type State = 'idle' | 'sorting' | 'sorted' | 'generating' | 'stitching' | 'done' | 'error';

interface SortedPhoto {
  file?: File;
  url?: string;
  label: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  thumbnails: string[];
  rooms: string[];
  clipUrls: string[];
  photoUrls?: string[];
  videoUrl?: string;
}

const toThumbnail = (file: File): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 80;
      canvas.getContext('2d')!.drawImage(img, 0, 0, 120, 80);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.src = url;
  });

export default function Generate() {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sorted, setSorted] = useState<SortedPhoto[]>([]);
  const [state, setState] = useState<State>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [clipsDone, setClipsDone] = useState(0);
  const [clipTotal, setClipTotal] = useState(0);
  const [clipUrls, setClipUrls] = useState<string[]>([]);
  const [finalVideo, setFinalVideo] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restitching, setRestitching] = useState<string | null>(null);
  const [mode, setMode] = useState<'walkthrough' | 'slides'>('slides');
  const [listingUrl, setListingUrl] = useState('');
  const [remoteUrls, setRemoteUrls] = useState<string[]>([]);
  const [ingesting, setIngesting] = useState(false);

  const getAdminKey = () => {
    const key = localStorage.getItem('admin_key') || window.prompt('Access key:') || '';
    localStorage.setItem('admin_key', key);
    return key;
  };

  const fetchListing = async () => {
    if (!listingUrl.trim()) return;
    setIngesting(true);
    setError('');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ url: listingUrl }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_key');
        throw new Error('Wrong access key — try again.');
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Could not fetch that listing');
      setRemoteUrls(body.photoUrls);
      setFiles([]);
      setSorted([]);
      if (state === 'sorted') setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch that listing');
    } finally {
      setIngesting(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // one-time migration: move old localStorage history to the server
        const legacy: HistoryEntry[] = JSON.parse(localStorage.getItem('walkthrough_history') || '[]');
        if (legacy.length) {
          await Promise.all(legacy.map(e =>
            fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e),
            }).catch(() => {})
          ));
          localStorage.removeItem('walkthrough_history');
        }
        const res = await fetch('/api/history');
        if (res.ok) setHistory((await res.json()).entries || []);
      } catch {}
    })();
  }, []);

  const persistEntry = async (entry: HistoryEntry) => {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  };

  const saveToHistory = async (photos: SortedPhoto[], clips: string[], videoUrl: string, photoUrls: string[]) => {
    const thumbnails = await Promise.all(photos.map(p => (p.file ? toThumbnail(p.file) : Promise.resolve(p.url || ''))));
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      thumbnails,
      rooms: photos.map(p => p.label),
      clipUrls: clips.filter(Boolean),
      photoUrls,
      videoUrl,
    };
    await persistEntry(entry);
    setHistory(prev => [entry, ...prev]);
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter(f => f.type.startsWith('image/')).slice(0, 40);
    setFiles(prev => [...prev, ...imgs].slice(0, 40));
    setRemoteUrls([]);
    setSorted([]);
    if (state === 'sorted') setState('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) => {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setSorted([]);
    if (state === 'sorted') setState('idle');
  };

  const sortPhotos = async () => {
    if (!files.length && !remoteUrls.length) return;
    setState('sorting');
    setError('');
    try {
      let res: Response;
      if (remoteUrls.length) {
        // remote listing photos → whole-house spatial planning in one call
        res = await fetch('/api/sort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: remoteUrls }),
        });
      } else {
        const formData = new FormData();
        files.forEach(f => formData.append('photos', f));
        res = await fetch('/api/sort', { method: 'POST', body: formData });
      }
      if (!res.ok) throw new Error('Sort failed');
      const { sorted: order } = await res.json();
      const sortedPhotos: SortedPhoto[] = order.map((o: { index: number; label: string }) => (
        remoteUrls.length
          ? { url: remoteUrls[o.index], label: o.label }
          : { file: files[o.index], label: o.label }
      ));
      setSorted(sortedPhotos);
      setState('sorted');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Sort failed');
    }
  };

  const moveSorted = (from: number, to: number) => {
    setSorted(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const stitchClips = async (clips: string[]): Promise<string> => {
    setStatusMsg('Merging clips into one video...');
    const res = await fetch('/api/stitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: clips }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Merging clips failed');
    }
    const { url } = await res.json();
    return url;
  };

  const restitchEntry = async (entry: HistoryEntry) => {
    setRestitching(entry.id);
    try {
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: entry.clipUrls }),
      });
      if (!res.ok) throw new Error('Clips may have expired');
      const { url } = await res.json();
      const updated = { ...entry, videoUrl: url };
      await persistEntry(updated);
      setHistory(prev => prev.map(e => (e.id === entry.id ? updated : e)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to re-stitch');
    } finally {
      setRestitching(null);
    }
  };

  const generate = async () => {
    const photos: SortedPhoto[] = sorted.length
      ? sorted
      : files.length
        ? files.map(f => ({ file: f, label: 'unknown' }))
        : remoteUrls.map(u => ({ url: u, label: 'unknown' }));
    if (!photos.length) return;
    setState('generating');
    setClipsDone(0);
    setClipUrls([]);
    setFinalVideo('');
    setError('');

    const formData = new FormData();
    const urls = photos.map(p => p.url).filter(Boolean) as string[];
    if (urls.length === photos.length) {
      formData.append('photo_urls', JSON.stringify(urls));
    } else {
      photos.forEach(p => p.file && formData.append('photos', p.file));
    }
    formData.append('mode', mode);
    // walkthrough = N room pans + N-1 doorway walks, interleaved by clip index
    const clipSlots: string[] = new Array(mode === 'walkthrough' ? photos.length * 2 - 1 : photos.length);

    try {
      const key = getAdminKey();
      const res = await fetch('/api/generate', { method: 'POST', body: formData, headers: { 'x-admin-key': key } });
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

          if (event.type === 'status' || event.type === 'progress') setStatusMsg(event.message);
          if ((event.type === 'progress' || event.type === 'clip_ready') && event.total) setClipTotal(event.total);
          if (event.type === 'clip_ready') {
            clipSlots[event.clip - 1] = event.url;
            const ready = clipSlots.filter(Boolean) as string[];
            setClipsDone(ready.length);
            setClipUrls([...ready]);
          }
          if (event.type === 'done') {
            setState('stitching');
            // the server sends the final ordered clip list — trust it over local slots
            const orderedClips: string[] = event.videoUrls?.length ? event.videoUrls : (clipSlots.filter(Boolean) as string[]);
            if (!orderedClips.length) throw new Error('No clips were generated. Please try again.');
            const url = await stitchClips(orderedClips);
            await saveToHistory(photos, orderedClips, url, event.photoUrls || []);
            setFinalVideo(url);
            setState('done');
            setStatusMsg('');
            if (videoRef.current) { videoRef.current.src = url; videoRef.current.play(); }
          }
          if (event.type === 'error') throw new Error(event.message);
        }
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const reset = () => {
    setState('idle'); setFiles([]); setSorted([]);
    setClipsDone(0); setClipUrls([]); setFinalVideo('');
    setError(''); setStatusMsg('');
    setListingUrl(''); setRemoteUrls([]);
  };

  const busy = state === 'generating' || state === 'stitching';
  const showRight = finalVideo || busy;
  const photoCount = sorted.length || files.length || remoteUrls.length;
  const expectedClips = clipTotal || (mode === 'walkthrough' ? Math.max(photoCount * 2 - 1, 0) : photoCount);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', paddingInline: 24, justifyContent: 'space-between' }}>
        <span style={{ fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          Solved Digital
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/bakeoff" className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px', textDecoration: 'none' }}>Model bake-off</a>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setHistoryOpen(true)}>
            Previous generations{history.length > 0 ? ` (${history.length})` : ''}
          </button>
          <span className="cap">Video generator</span>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: showRight ? '1fr 1fr' : '1fr', gap: 32, marginBottom: 64 }}>
          <div>
            <h1 style={{ fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 6 }}>
              Tourly video generator
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Drop your listing photos. AI sorts them, then generates cinematic 1080p clips and stitches them into one video.
            </p>

            {(state === 'idle' || state === 'sorted') && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input
                  type="url"
                  value={listingUrl}
                  onChange={e => setListingUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !ingesting && fetchListing()}
                  placeholder="Paste an Airbnb listing link — photos load automatically"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, color: 'var(--ink)', outline: 'none' }}
                />
                <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={fetchListing} disabled={ingesting || !listingUrl.trim()}>
                  {ingesting ? 'Fetching...' : 'Fetch photos'}
                </button>
              </div>
            )}

            {(state === 'idle' || state === 'sorted') && remoteUrls.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg2)', marginBottom: 12 }}>
                <p className="cap" style={{ marginBottom: 8 }}>{remoteUrls.length} listing photo{remoteUrls.length > 1 ? 's' : ''}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {remoteUrls.map((u, i) => (
                    <div key={u} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: 'var(--slot)' }}>
                      <img src={u} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => { setRemoteUrls(prev => prev.filter((_, idx) => idx !== i)); setSorted([]); if (state === 'sorted') setState('idle'); }} style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(state === 'idle' || state === 'sorted') && remoteUrls.length === 0 && (
              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: files.length ? 12 : '32px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg2)', marginBottom: 12 }}
              >
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                {files.length === 0 ? (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>Drop photos here</p>
                    <p style={{ fontSize: 12, color: 'var(--muted2)' }}>jpg, png, webp — up to 40</p>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {files.map((f, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: 'var(--slot)' }}>
                        <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                    {files.length < 40 && (
                      <div onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', background: 'var(--slot)', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 20, cursor: 'pointer' }}>+</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {state === 'sorted' && sorted.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="cap" style={{ marginBottom: 8 }}>Walkthrough order</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {sorted.map((s, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--slot)' }}>
                      <div style={{ aspectRatio: '1', position: 'relative' }}>
                        <img src={s.file ? URL.createObjectURL(s.file) : s.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: '#fff', fontWeight: 600 }}>{i + 1}</div>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--muted)', padding: '3px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
                      <div style={{ display: 'flex', gap: 2, padding: '0 4px 4px' }}>
                        {i > 0 && <button type="button" onClick={() => moveSorted(i, i - 1)} style={{ flex: 1, fontSize: 10, padding: '2px 0', background: 'var(--slot)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--muted)' }}>←</button>}
                        {i < sorted.length - 1 && <button type="button" onClick={() => moveSorted(i, i + 1)} style={{ flex: 1, fontSize: 10, padding: '2px 0', background: 'var(--slot)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--muted)' }}>→</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {statusMsg && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                {statusMsg}
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 12 }}>{error}</p>}

            {state === 'generating' && expectedClips > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="cap" style={{ marginBottom: 6 }}>Clips done: {clipsDone}/{expectedClips}</p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {Array.from({ length: expectedClips }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < clipsDone ? 'var(--ink)' : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
                {clipUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {clipUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'underline' }}>Clip {i + 1} — save now</a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state === 'idle' && <button className="btn-primary" onClick={sortPhotos} disabled={!files.length && !remoteUrls.length} style={{ width: '100%' }}>{photoCount > 0 ? `Analyse & sort ${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'Analyse & sort photos'}</button>}
            {state === 'sorting' && <button className="btn-primary" disabled style={{ width: '100%' }}>Analysing photos...</button>}
            {state === 'sorted' && (
              <button className="btn-primary" onClick={generate} style={{ width: '100%' }}>
                {`Generate video — ${sorted.length} clip${sorted.length > 1 ? 's' : ''}`}
              </button>
            )}
            {state === 'done' && (
              <div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={reset}>Start over</button>
                  <a href={finalVideo} download="property-video.mp4" className="btn-ghost" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Download full video</a>
                </div>
                {clipUrls.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p className="cap" style={{ marginBottom: 8 }}>Individual clips</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {clipUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px', textDecoration: 'none' }}>
                          Clip {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showRight && (
            <div>
              <div style={{ background: 'var(--slot)', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {finalVideo
                  ? <video ref={videoRef} controls autoPlay src={finalVideo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <p style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', padding: 16 }}>{state === 'stitching' ? 'Merging clips...' : 'Video will appear here'}</p>
                }
              </div>
            </div>
          )}
        </div>

      </main>

      {/* History panel */}
      {historyOpen && (
        <div onClick={() => setHistoryOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(600px, 100%)', height: '100%', background: 'var(--bg)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                Previous generations
              </h2>
              <button onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
            </div>

            {history.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No generations yet — your finished videos will show up here.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {history.map(entry => (
                <div key={entry.id} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {entry.clipUrls.length} clip{entry.clipUrls.length > 1 ? 's' : ''}
                    </span>
                    {entry.videoUrl
                      ? <a href={entry.videoUrl} download="walkthrough.mp4" className="btn-ghost" style={{ fontSize: 11, textDecoration: 'none', padding: '4px 10px' }}>Download</a>
                      : <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => restitchEntry(entry)} disabled={restitching === entry.id}>
                          {restitching === entry.id ? 'Merging...' : 'Re-stitch video'}
                        </button>
                    }
                  </div>

                  {entry.videoUrl && (
                    <video controls preload="metadata" src={entry.videoUrl} style={{ width: '100%', borderRadius: 8, marginBottom: 10, aspectRatio: '16/9', background: '#000' }} />
                  )}

                  <p className="cap" style={{ marginBottom: 6 }}>Photos used</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(entry.photoUrls?.length ? entry.photoUrls : entry.thumbnails).map((src, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', width: 96, height: 64, flexShrink: 0, background: 'var(--slot)' }}>
                        <img src={src} alt={entry.rooms[i] || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {entry.rooms[i] && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', fontSize: 8, color: '#fff', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.rooms[i]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {entry.clipUrls.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p className="cap" style={{ marginBottom: 6 }}>Individual clips</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {entry.clipUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>
                            Clip {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
