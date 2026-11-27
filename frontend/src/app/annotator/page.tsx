'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BoxItem {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  box_type: string;
  text: string;
}

interface ImageItem {
  file_name: string;
  relative_path: string;
  category: string;
  mode: string;
  is_annotated: boolean;
  box_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

const CLASS_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16',
];

function getClassColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length];
}

export default function DocumentAnnotatorPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [boxTypes, setBoxTypes] = useState<{ id: string; label: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'annotated' | 'unannotated'>('all');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [activeLabel, setActiveLabel] = useState('patient_name');
  const [activeBoxType, setActiveBoxType] = useState('FORM_SECTION');
  const [classSearch, setClassSearch] = useState('');
  const [newClassInput, setNewClassInput] = useState('');
  const [newBoxTypeInput, setNewBoxTypeInput] = useState('');
  const [mode, setMode] = useState<'draw' | 'drag'>('draw');
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [renderJpg, setRenderJpg] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [statusMsg, setStatusMsg] = useState('Ready');
  const [history, setHistory] = useState<BoxItem[][]>([]);
  const [redoStack, setRedoStack] = useState<BoxItem[][]>([]);
  const [clipboard, setClipboard] = useState<BoxItem[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/annotator/images`).then((r) => r.json()),
      fetch(`${API_BASE}/annotator/labels`).then((r) => r.json()),
      fetch(`${API_BASE}/annotator/box_types`).then((r) => r.json()),
    ])
      .then(([imgData, lblData, btData]) => {
        const imgs = imgData.images || [];
        setImages(imgs);
        if (imgs.length > 0) setSelectedImage(imgs[0]);
        const lbls = lblData.labels || [];
        setLabels(lbls);
        if (lbls.length > 0) setActiveLabel(lbls[0]);
        setBoxTypes(btData.box_types || []);
      })
      .catch(() => setStatusMsg('Error: Failed to connect to FastAPI annotator backend.'));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    setStatusMsg(`Loading ${selectedImage.file_name}...`);
    fetch(`${API_BASE}/annotator/boxes?file_name=${encodeURIComponent(selectedImage.file_name)}`)
      .then((r) => r.json())
      .then((d) => {
        setBoxes(d.boxes || []);
        setSelectedIdx(null);
        setHistory([]);
        setRedoStack([]);
        setStatusMsg(`Loaded ${selectedImage.file_name} (${(d.boxes || []).length} boxes)`);
      })
      .catch(() => setBoxes([]));
  }, [selectedImage]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = img.naturalWidth * zoom;
    canvas.height = img.naturalHeight * zoom;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (!showBoxes) return;
    boxes.forEach((b, idx) => {
      const isSel = idx === selectedIdx;
      const col = isSel ? '#ef4444' : getClassColor(b.label);
      ctx.strokeStyle = col;
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.strokeRect(b.x * zoom, b.y * zoom, b.w * zoom, b.h * zoom);
      if (showLabels) {
        ctx.fillStyle = col;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(b.label, b.x * zoom, Math.max(12, b.y * zoom - 4));
      }
    });
  };

  useEffect(() => {
    redraw();
  }, [boxes, selectedIdx, zoom, selectedImage, showBoxes, showLabels]);

  const pushHistory = (next: BoxItem[]) => {
    setHistory((h) => [...h, boxes]);
    setRedoStack([]);
    setBoxes(next);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / zoom;
    const cy = (e.clientY - rect.top) / zoom;
    if (mode === 'drag') {
      const hit = boxes.findIndex((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
      setSelectedIdx(hit >= 0 ? hit : null);
      return;
    }
    drawStartRef.current = { x: cx, y: cy };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw' || !drawStartRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x2 = (e.clientX - rect.left) / zoom;
    const y2 = (e.clientY - rect.top) / zoom;
    const x = Math.round(Math.min(drawStartRef.current.x, x2));
    const y = Math.round(Math.min(drawStartRef.current.y, y2));
    const w = Math.round(Math.abs(x2 - drawStartRef.current.x));
    const h = Math.round(Math.abs(y2 - drawStartRef.current.y));
    drawStartRef.current = null;
    if (w > 8 && h > 8) {
      const next = [...boxes, { x, y, w, h, label: activeLabel, box_type: activeBoxType, text: '' }];
      pushHistory(next);
      setSelectedIdx(next.length - 1);
    }
  };

  const handleSave = async () => {
    if (!selectedImage) return;
    setStatusMsg('Saving annotations & exporting CSV...');
    const res = await fetch(`${API_BASE}/annotator/boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: selectedImage.file_name,
        relative_path: selectedImage.relative_path,
        boxes,
        render_jpg: renderJpg,
      }),
    });
    const data = await res.json();
    setStatusMsg(res.ok ? `Saved ${data.saved_boxes} boxes to CSV` : data.detail || 'Save failed');
  };

  const handleAiDetect = async () => {
    if (!selectedImage) return;
    setStatusMsg('Running OpenCV AI Smart Detect...');
    const res = await fetch(`${API_BASE}/annotator/ai_detect_boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relative_path: selectedImage.relative_path }),
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.boxes)) {
      pushHistory([...boxes, ...data.boxes]);
      setStatusMsg(`AI Smart Detect added ${data.boxes.length} boxes`);
    }
  };

  const handleAddClass = async () => {
    const clean = newClassInput.trim();
    if (!clean || labels.includes(clean)) return;
    const next = [...labels, clean];
    setLabels(next);
    setActiveLabel(clean);
    setNewClassInput('');
    await fetch(`${API_BASE}/annotator/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: next }),
    });
  };

  const handleAddBoxType = async () => {
    const clean = newBoxTypeInput.trim();
    if (!clean) return;
    const id = clean.toUpperCase().replace(/\s+/g, '_');
    const next = [...boxTypes, { id, label: clean }];
    setBoxTypes(next);
    setActiveBoxType(id);
    setNewBoxTypeInput('');
    await fetch(`${API_BASE}/annotator/box_types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_types: next }),
    });
  };

  const filteredImages = images.filter((im) => {
    if (categoryFilter !== 'All' && im.category !== categoryFilter) return false;
    if (statusFilter === 'annotated' && !im.is_annotated) return false;
    if (statusFilter === 'unannotated' && im.is_annotated) return false;
    return true;
  });

  const currentImgIdx = selectedImage ? filteredImages.findIndex((i) => i.relative_path === selectedImage.relative_path) : -1;
  const goPrev = () => currentImgIdx > 0 && setSelectedImage(filteredImages[currentImgIdx - 1]);
  const goNext = () => currentImgIdx >= 0 && currentImgIdx < filteredImages.length - 1 && setSelectedImage(filteredImages[currentImgIdx + 1]);

  const filteredLabels = labels.filter((l) => l.toLowerCase().includes(classSearch.toLowerCase()));
  const selectedBox = selectedIdx !== null ? boxes[selectedIdx] : null;

  return (
    <div className="h-screen w-screen bg-[#0b1120] text-slate-200 flex overflow-hidden select-none text-xs">
      {/* Left Sidebar */}
      <aside className="w-[330px] bg-[#0f172a] border-r border-slate-800 flex flex-col h-full shrink-0">
        <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1120]">
          <div>
            <div className="font-bold text-sm text-emerald-400 tracking-tight">OFPHIL Annotator</div>
            <div className="text-[10px] text-slate-400">V2 FastAPI + Canvas Pro</div>
          </div>
          <button onClick={handleAiDetect} className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px]">
            Master AI
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          {/* Category & Status */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Dataset & Filters</div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs">
              <option value="All">All Categories</option>
              <option value="certificate_of_indigency">certificate_of_indigency</option>
              <option value="electricity_bill">electricity_bill</option>
              <option value="government_id">government_id</option>
              <option value="medical_certificate">medical_certificate</option>
              <option value="water_bill">water_bill</option>
            </select>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'annotated', 'unannotated'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`py-1 rounded text-[11px] capitalize border ${statusFilter === st ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  {st === 'annotated' ? 'Saved' : st === 'unannotated' ? 'Pending' : 'All'}
                </button>
              ))}
            </div>
            <select
              value={selectedImage?.relative_path || ''}
              onChange={(e) => {
                const found = filteredImages.find((im) => im.relative_path === e.target.value);
                if (found) setSelectedImage(found);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              {filteredImages.map((im) => (
                <option key={im.relative_path} value={im.relative_path}>
                  {im.file_name} ({im.box_count})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={goPrev} className="py-1 bg-slate-800 hover:bg-slate-700 rounded">← Prev</button>
              <button onClick={goNext} className="py-1 bg-slate-800 hover:bg-slate-700 rounded">Next →</button>
            </div>
          </div>

          {/* Active Label & Classes Palette */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Classes Palette</span>
              <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[160px]">{activeLabel}</span>
            </div>
            <input
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Search classes..."
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            />
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {filteredLabels.slice(0, 40).map((lbl) => (
                <button
                  key={lbl}
                  onClick={() => setActiveLabel(lbl)}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${activeLabel === lbl ? 'bg-emerald-600 border-emerald-400 text-white font-semibold' : 'bg-slate-950 border-slate-800 text-slate-300'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} placeholder="Add new class..." className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" />
              <button onClick={handleAddClass} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded">+</button>
            </div>
          </div>

          {/* Box Types */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Box Type</div>
            <select value={activeBoxType} onChange={(e) => setActiveBoxType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs">
              {boxTypes.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.label}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <input value={newBoxTypeInput} onChange={(e) => setNewBoxTypeInput(e.target.value)} placeholder="Add box type..." className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" />
              <button onClick={handleAddBoxType} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded">+</button>
            </div>
          </div>

          {/* Selected Box OCR */}
          {selectedBox && (
            <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-red-900/60">
              <div className="text-[10px] uppercase font-bold text-red-400">Selected Box #{(selectedIdx ?? 0) + 1}</div>
              <textarea
                value={selectedBox.text}
                onChange={(e) => setBoxes(boxes.map((b, i) => (i === selectedIdx ? { ...b, text: e.target.value } : b)))}
                placeholder="OCR transcription..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                rows={2}
              />
              <button
                onClick={() => {
                  if (selectedIdx === null) return;
                  pushHistory(boxes.filter((_, i) => i !== selectedIdx));
                  setSelectedIdx(null);
                }}
                className="w-full py-1 bg-red-700 hover:bg-red-600 text-white rounded text-[11px]"
              >
                Delete Selected Box
              </button>
            </div>
          )}

          {/* Boxes List */}
          <div className="space-y-1 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Bounding Boxes ({boxes.length})</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {boxes.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] truncate ${selectedIdx === i ? 'bg-red-900/50 text-red-200' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
                >
                  #{i + 1} {b.label} [{b.w}x{b.h}]
                </button>
              ))}
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Export Settings</div>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={renderJpg} onChange={(e) => setRenderJpg(e.target.checked)} />
              Render Annotated Visualization
            </label>
            <button onClick={handleSave} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded">
              Save & Export CSV
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Toolbar */}
        <header className="bg-[#0f172a] border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
          <button onClick={goPrev} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded">Prev</button>
          <button onClick={goNext} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded">Next</button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button onClick={() => setMode('draw')} className={`px-2 py-1 rounded ${mode === 'draw' ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>Draw</button>
          <button onClick={() => setMode('drag')} className={`px-2 py-1 rounded ${mode === 'drag' ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>Select/Move</button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))} className="px-2 py-1 bg-slate-800 rounded">-</button>
          <span className="px-1.5 font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} className="px-2 py-1 bg-slate-800 rounded">+</button>
          <button onClick={() => setZoom(1)} className="px-2 py-1 bg-slate-800 rounded">Reset</button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button onClick={() => setShowBoxes((v) => !v)} className="px-2 py-1 bg-slate-800 rounded">{showBoxes ? 'Hide Boxes' : 'Show Boxes'}</button>
          <button onClick={() => setShowLabels((v) => !v)} className="px-2 py-1 bg-slate-800 rounded">{showLabels ? 'Hide Labels' : 'Show Labels'}</button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={() => {
              if (!history.length) return;
              setRedoStack((r) => [boxes, ...r]);
              setBoxes(history[history.length - 1]);
              setHistory((h) => h.slice(0, -1));
            }}
            className="px-2 py-1 bg-slate-800 rounded"
          >
            Undo
          </button>
          <button
            onClick={() => {
              if (!redoStack.length) return;
              setHistory((h) => [...h, boxes]);
              setBoxes(redoStack[0]);
              setRedoStack((r) => r.slice(1));
            }}
            className="px-2 py-1 bg-slate-800 rounded"
          >
            Redo
          </button>
          <button onClick={() => setClipboard(boxes)} className="px-2 py-1 bg-slate-800 rounded">Copy</button>
          <button onClick={() => clipboard.length && pushHistory([...boxes, ...clipboard])} className="px-2 py-1 bg-slate-800 rounded">Paste</button>
          <div className="flex-1" />
          <button onClick={handleAiDetect} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold">AI Detect</button>
          <button onClick={handleSave} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold">Save</button>
        </header>

        {/* Central Canvas */}
        <main className="flex-1 bg-[#060913] overflow-auto flex items-center justify-center p-4">
          {selectedImage ? (
            <>
              <img
                ref={imgRef}
                src={`${API_BASE}/annotator/image_file?path=${encodeURIComponent(selectedImage.relative_path)}`}
                alt={selectedImage.file_name}
                className="hidden"
                onLoad={redraw}
              />
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                className="cursor-crosshair shadow-2xl border border-slate-800 bg-black"
              />
            </>
          ) : (
            <div className="text-slate-500">Select a document image from the left sidebar.</div>
          )}
        </main>

        {/* Bottom Status Bar */}
        <footer className="bg-[#0f172a] border-t border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div>
            File: <span className="text-slate-200 font-mono">{selectedImage?.file_name || 'None'}</span> | Category:{' '}
            <span className="text-emerald-400">{selectedImage?.category || '-'}</span>
          </div>
          <div className="text-slate-300">{statusMsg}</div>
        </footer>
      </div>
    </div>
  );
}
