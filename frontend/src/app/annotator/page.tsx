'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface BoxItem {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  box_type: string;
  text: string;
  notes?: string;
  image_width?: number;
  image_height?: number;
}

interface ImageItem {
  file_name: string;
  relative_path: string;
  category: string;
  mode: string;
  is_annotated: boolean;
  box_count: number;
}

interface CounterpartInfo {
  has_counterpart: boolean;
  direction?: 'scan' | 'physical';
  counterpart_name?: string;
  counterpart_rel_path?: string;
  source_dimensions?: { width: number; height: number };
  target_dimensions?: { width: number; height: number };
}

interface BatchSummary {
  category: string;
  direction: string;
  total_source_files: number;
  annotated_source_files: number;
  total_source_boxes: number;
  matched_counterparts: number;
  transferable_files_count: number;
  already_annotated_targets: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
const MAX_HISTORY = 50;

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

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export default function DocumentAnnotatorPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [boxTypes, setBoxTypes] = useState<{ id: string; label: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'annotated' | 'unannotated'>('all');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [activeLabel, setActiveLabel] = useState('patient_name');
  const [activeBoxType, setActiveBoxType] = useState('FORM_SECTION');
  const [classSearch, setClassSearch] = useState('');
  const [newClassInput, setNewClassInput] = useState('');
  const [newBoxTypeInput, setNewBoxTypeInput] = useState('');

  const [mode, setMode] = useState<'draw' | 'drag'>('draw');
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [exportCsv, setExportCsv] = useState(true);
  const [exportOcr, setExportOcr] = useState(true);
  const [exportImg, setExportImg] = useState(true);
  const [autoOcr, setAutoOcr] = useState(true);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);

  const [zoom, setZoom] = useState(1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [canvasCursor, setCanvasCursor] = useState('crosshair');
  const [statusMsg, setStatusMsg] = useState('Ready');
  const [history, setHistory] = useState<BoxItem[][]>([]);
  const [redoStack, setRedoStack] = useState<BoxItem[][]>([]);
  const [clipboard, setClipboard] = useState<{ boxes: BoxItem[]; srcW: number; srcH: number } | null>(null);

  // Counterpart sync state
  const [counterpart, setCounterpart] = useState<CounterpartInfo>({ has_counterpart: false });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCategory, setBatchCategory] = useState('certificate_of_indigency');
  const [batchDirection, setBatchDirection] = useState<'physical_to_scan' | 'scan_to_physical'>('physical_to_scan');
  const [batchOverwrite, setBatchOverwrite] = useState(false);
  const [batchExportImg, setBatchExportImg] = useState(true);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  // Interaction refs
  const spaceHeldRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawPreviewRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const dragMoveRef = useRef<{ startX: number; startY: number; origBoxes: BoxItem[]; indices: number[] } | null>(null);
  const resizeRef = useRef<{ idx: number; dir: HandleDir; orig: BoxItem; startX: number; startY: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  const primaryIdx = selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : null;
  const selectedBox = primaryIdx !== null ? boxes[primaryIdx] ?? null : null;

  const refreshImages = useCallback(() => {
    fetch(`${API_BASE}/annotator/images`)
      .then((r) => r.json())
      .then((imgData) => {
        const imgs: ImageItem[] = imgData.images || [];
        setImages(imgs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/annotator/images`).then((r) => r.json()),
      fetch(`${API_BASE}/annotator/labels`).then((r) => r.json()),
      fetch(`${API_BASE}/annotator/box_types`).then((r) => r.json()),
    ])
      .then(([imgData, lblData, btData]) => {
        const imgs: ImageItem[] = imgData.images || [];
        setImages(imgs);
        if (imgs.length > 0) setSelectedImage(imgs[0]);
        const lbls: string[] = lblData.labels || [];
        setLabels(lbls);
        if (lbls.length > 0) setActiveLabel(lbls[0]);
        setBoxTypes(btData.box_types || []);
      })
      .catch(() => setStatusMsg('Error: Failed to connect to FastAPI annotator backend.'));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    setStatusMsg(`Loading ${selectedImage.file_name}...`);
    setIsDirty(false);
    fetch(`${API_BASE}/annotator/boxes?file_name=${encodeURIComponent(selectedImage.file_name)}`)
      .then((r) => r.json())
      .then((d) => {
        setBoxes(d.boxes || []);
        setSelectedIndices([]);
        setHistory([]);
        setRedoStack([]);
        setStatusMsg(`Loaded ${selectedImage.file_name} (${(d.boxes || []).length} boxes)`);
      })
      .catch(() => {
        setBoxes([]);
        setStatusMsg(`Error loading boxes for ${selectedImage.file_name}`);
      });

    fetch(`${API_BASE}/annotator/counterpart_info?path=${encodeURIComponent(selectedImage.relative_path)}`)
      .then((r) => r.json())
      .then((cp) => setCounterpart(cp))
      .catch(() => setCounterpart({ has_counterpart: false }));
  }, [selectedImage]);

  const pushHistory = useCallback((next: BoxItem[]) => {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), boxes]);
    setRedoStack([]);
    setBoxes(next);
    setIsDirty(true);
  }, [boxes]);

  const handleUndo = useCallback(() => {
    if (!history.length) return;
    setRedoStack((r) => [boxes, ...r]);
    setBoxes(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setIsDirty(true);
  }, [history, boxes]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), boxes]);
    setBoxes(redoStack[0]);
    setRedoStack((r) => r.slice(1));
    setIsDirty(true);
  }, [redoStack, boxes]);

  const handleCopy = useCallback(() => {
    const toCopy = selectedIndices.length > 0 ? selectedIndices.map((i) => boxes[i]).filter(Boolean) : boxes;
    if (!toCopy.length) return;
    setClipboard({ boxes: toCopy.map((b) => ({ ...b })), srcW: imgDims.w || 1, srcH: imgDims.h || 1 });
    setStatusMsg(`Copied ${toCopy.length} box(es)`);
  }, [selectedIndices, boxes, imgDims]);

  const handlePaste = useCallback(() => {
    if (!clipboard || !clipboard.boxes.length) return;
    const tw = imgDims.w || clipboard.srcW || 1;
    const th = imgDims.h || clipboard.srcH || 1;
    const sx = tw / (clipboard.srcW || tw);
    const sy = th / (clipboard.srcH || th);
    const pasted = clipboard.boxes.map((b) => ({
      ...b,
      x: Math.round(b.x * sx),
      y: Math.round(b.y * sy),
      w: Math.max(5, Math.round(b.w * sx)),
      h: Math.max(5, Math.round(b.h * sy)),
      image_width: tw,
      image_height: th,
    }));
    const startIdx = boxes.length;
    pushHistory([...boxes, ...pasted]);
    setSelectedIndices(pasted.map((_, i) => startIdx + i));
    setStatusMsg(`Pasted ${pasted.length} box(es)`);
  }, [clipboard, imgDims, boxes, pushHistory]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = img.naturalWidth * zoom;
    canvas.height = img.naturalHeight * zoom;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (showBoxes) {
      boxes.forEach((b, idx) => {
        const isSel = selectedIndices.includes(idx);
        const col = isSel ? '#ef4444' : getClassColor(b.label);
        const bx = b.x * zoom;
        const by = b.y * zoom;
        const bw = b.w * zoom;
        const bh = b.h * zoom;

        ctx.strokeStyle = col;
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.strokeRect(bx, by, bw, bh);

        if (isSel) {
          ctx.fillStyle = 'rgba(239,68,68,0.12)';
          ctx.fillRect(bx, by, bw, bh);
          // Draw 8 resize handles
          const hs = 6;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          const pts = [
            [bx, by], [bx + bw / 2, by], [bx + bw, by],
            [bx + bw, by + bh / 2], [bx + bw, by + bh],
            [bx + bw / 2, by + bh], [bx, by + bh], [bx, by + bh / 2],
          ];
          pts.forEach(([hx, hy]) => {
            ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
            ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
          });
        }

        if (showLabels) {
          ctx.fillStyle = col;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(b.label, bx, Math.max(12, by - 4));
        }
      });
    }

    if (marqueeRef.current) {
      const m = marqueeRef.current;
      const mx = Math.min(m.startX, m.curX) * zoom;
      const my = Math.min(m.startY, m.curY) * zoom;
      const mw = Math.abs(m.curX - m.startX) * zoom;
      const mh = Math.abs(m.curY - m.startY) * zoom;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.setLineDash([]);
    }

    if (drawPreviewRef.current) {
      const d = drawPreviewRef.current;
      const dx = Math.min(d.startX, d.curX) * zoom;
      const dy = Math.min(d.startY, d.curY) * zoom;
      const dw = Math.abs(d.curX - d.startX) * zoom;
      const dh = Math.abs(d.curY - d.startY) * zoom;
      const col = getClassColor(activeLabel);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.setLineDash([]);
    }
  }, [boxes, selectedIndices, zoom, showBoxes, showLabels, activeLabel]);

  useEffect(() => {
    redraw();
  }, [redraw, selectedImage]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        spaceHeldRef.current = true;
        setSpaceHeld(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.25, +(z - 0.15).toFixed(2)));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndices.length > 0) {
        e.preventDefault();
        pushHistory(boxes.filter((_, i) => !selectedIndices.includes(i)));
        setSelectedIndices([]);
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIndices.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        pushHistory(
          boxes.map((b, i) =>
            selectedIndices.includes(i) ? { ...b, x: Math.max(0, b.x + dx), y: Math.max(0, b.y + dy) } : b
          )
        );
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const mainEl = mainRef.current;
    const onWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.min(3, Math.max(0.25, +(z + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))));
      }
    };
    if (mainEl) {
      mainEl.addEventListener('wheel', onWheelNative, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (mainEl) {
        mainEl.removeEventListener('wheel', onWheelNative);
      }
    };
  }, [boxes, selectedIndices, handleUndo, handleRedo, handleCopy, handlePaste, pushHistory]);

  const hitTestHandle = (b: BoxItem, cx: number, cy: number): HandleDir | null => {
    const tol = 12 / zoom;
    const pts: [HandleDir, number, number][] = [
      ['nw', b.x, b.y], ['n', b.x + b.w / 2, b.y], ['ne', b.x + b.w, b.y],
      ['e', b.x + b.w, b.y + b.h / 2], ['se', b.x + b.w, b.y + b.h],
      ['s', b.x + b.w / 2, b.y + b.h], ['sw', b.x, b.y + b.h], ['w', b.x, b.y + b.h / 2],
    ];
    for (const [dir, hx, hy] of pts) {
      if (Math.abs(cx - hx) <= tol && Math.abs(cy - hy) <= tol) return dir;
    }
    return null;
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / (rect.width || 1);
    const scaleY = e.currentTarget.height / (rect.height || 1);
    return {
      cx: ((e.clientX - rect.left) * scaleX) / zoom,
      cy: ((e.clientY - rect.top) * scaleY) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spaceHeldRef.current && mainRef.current) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: mainRef.current.scrollLeft,
        scrollTop: mainRef.current.scrollTop,
      };
      return;
    }
    const { cx, cy } = getCanvasCoords(e);

    // 1. Allow resizing the selected box from its 8 handles in any mode
    if (primaryIdx !== null && boxes[primaryIdx]) {
      const hDir = hitTestHandle(boxes[primaryIdx], cx, cy);
      if (hDir) {
        resizeRef.current = { idx: primaryIdx, dir: hDir, orig: { ...boxes[primaryIdx] }, startX: cx, startY: cy };
        return;
      }
    }

    // 2. Check if clicking inside any box
    let hit = -1;
    let bestArea = Infinity;
    boxes.forEach((b, i) => {
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        const area = b.w * b.h;
        if (area < bestArea) {
          bestArea = area;
          hit = i;
        }
      }
    });

    // In Select/Move ('drag') mode: clicking a box immediately selects and drags it;
    // in Draw mode: if user clicks an already selected box or any existing box directly, drag it
    if (mode === 'drag' || hit >= 0) {
      if (hit >= 0) {
        let nextSel = selectedIndices;
        if (e.shiftKey) {
          nextSel = selectedIndices.includes(hit) ? selectedIndices.filter((i) => i !== hit) : [...selectedIndices, hit];
        } else if (!selectedIndices.includes(hit)) {
          nextSel = [hit];
        }
        setSelectedIndices(nextSel);
        const moveIndices = e.altKey ? boxes.map((_, i) => i) : nextSel;
        dragMoveRef.current = { startX: cx, startY: cy, origBoxes: boxes.map((b) => ({ ...b })), indices: moveIndices };
        return;
      }
      if (mode === 'drag') {
        if (!e.shiftKey) setSelectedIndices([]);
        marqueeRef.current = { startX: cx, startY: cy, curX: cx, curY: cy };
        return;
      }
    }

    drawStartRef.current = { x: cx, y: cy };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panStartRef.current && mainRef.current) {
      mainRef.current.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
      mainRef.current.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
      return;
    }
    const { cx, cy } = getCanvasCoords(e);

    if (resizeRef.current) {
      const { idx, dir, orig, startX, startY } = resizeRef.current;
      const dx = Math.round(cx - startX);
      const dy = Math.round(cy - startY);
      let { x, y, w, h } = orig;
      if (dir.includes('w')) { x += dx; w -= dx; }
      if (dir.includes('e')) { w += dx; }
      if (dir.includes('n')) { y += dy; h -= dy; }
      if (dir.includes('s')) { h += dy; }
      if (w < 5) w = 5;
      if (h < 5) h = 5;
      setBoxes((prev) => prev.map((b, i) => (i === idx ? { ...b, x, y, w, h } : b)));
      return;
    }
    if (dragMoveRef.current) {
      const { startX, startY, origBoxes, indices } = dragMoveRef.current;
      const dx = Math.round(cx - startX);
      const dy = Math.round(cy - startY);
      setBoxes(
        origBoxes.map((b, i) =>
          indices.includes(i) ? { ...b, x: Math.max(0, b.x + dx), y: Math.max(0, b.y + dy) } : b
        )
      );
      return;
    }
    if (marqueeRef.current) {
      marqueeRef.current.curX = cx;
      marqueeRef.current.curY = cy;
      redraw();
      return;
    }
    if (mode === 'draw' && drawStartRef.current) {
      drawPreviewRef.current = {
        startX: drawStartRef.current.x,
        startY: drawStartRef.current.y,
        curX: cx,
        curY: cy,
      };
      redraw();
      return;
    }

    // Dynamic hover cursor
    if (spaceHeldRef.current) {
      setCanvasCursor(panStartRef.current ? 'grabbing' : 'grab');
      return;
    }
    if (primaryIdx !== null && boxes[primaryIdx]) {
      const hDir = hitTestHandle(boxes[primaryIdx], cx, cy);
      if (hDir) {
        const map: Record<HandleDir, string> = {
          nw: 'nwse-resize', se: 'nwse-resize',
          ne: 'nesw-resize', sw: 'nesw-resize',
          n: 'ns-resize', s: 'ns-resize',
          e: 'ew-resize', w: 'ew-resize',
        };
        setCanvasCursor(map[hDir]);
        return;
      }
    }
    const overBox = boxes.some((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
    if (overBox) {
      setCanvasCursor('move');
    } else if (mode === 'drag') {
      setCanvasCursor('default');
    } else {
      setCanvasCursor('crosshair');
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panStartRef.current) {
      panStartRef.current = null;
      return;
    }
    if (resizeRef.current) {
      const { orig } = resizeRef.current;
      resizeRef.current = null;
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), boxes.map((b, i) => (i === primaryIdx ? orig : b))]);
      setRedoStack([]);
      setIsDirty(true);
      return;
    }
    if (dragMoveRef.current) {
      const { origBoxes } = dragMoveRef.current;
      dragMoveRef.current = null;
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), origBoxes]);
      setRedoStack([]);
      setIsDirty(true);
      return;
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      marqueeRef.current = null;
      const x1 = Math.min(m.startX, m.curX);
      const y1 = Math.min(m.startY, m.curY);
      const x2 = Math.max(m.startX, m.curX);
      const y2 = Math.max(m.startY, m.curY);
      const hits = boxes
        .map((b, i) => (b.x < x2 && b.x + b.w > x1 && b.y < y2 && b.y + b.h > y1 ? i : -1))
        .filter((i) => i >= 0);
      setSelectedIndices(hits);
      redraw();
      return;
    }
    if (mode !== 'draw' || !drawStartRef.current) return;
    const { cx: x2, cy: y2 } = getCanvasCoords(e);
    const x = Math.round(Math.min(drawStartRef.current.x, x2));
    const y = Math.round(Math.min(drawStartRef.current.y, y2));
    const w = Math.round(Math.abs(x2 - drawStartRef.current.x));
    const h = Math.round(Math.abs(y2 - drawStartRef.current.y));
    drawStartRef.current = null;
    drawPreviewRef.current = null;
    if (w > 8 && h > 8) {
      const newBox: BoxItem = {
        x, y, w, h,
        label: activeLabel,
        box_type: activeBoxType,
        text: '',
        image_width: imgDims.w || undefined,
        image_height: imgDims.h || undefined,
      };
      const next = [...boxes, newBox];
      pushHistory(next);
      const newIdx = next.length - 1;
      setSelectedIndices([newIdx]);

      // If auto-OCR is enabled, immediately extract OCR text from this region
      if (autoOcr && selectedImage) {
        triggerOcrForBox(newBox, newIdx);
      }
    } else {
      // Single click in Draw mode selects the box under the cursor
      let hit = -1;
      let bestArea = Infinity;
      boxes.forEach((b, i) => {
        if (x2 >= b.x && x2 <= b.x + b.w && y2 >= b.y && y2 <= b.y + b.h) {
          const area = b.w * b.h;
          if (area < bestArea) {
            bestArea = area;
            hit = i;
          }
        }
      });
      setSelectedIndices(hit >= 0 ? [hit] : []);
    }
  };

  const triggerOcrForBox = async (targetBox: BoxItem, targetIdx: number) => {
    if (!selectedImage) return;
    setIsOcrLoading(true);
    setStatusMsg(`Running OCR on box #${targetIdx + 1}...`);
    try {
      const res = await fetch(`${API_BASE}/annotator/ocr_extract_box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relative_path: selectedImage.relative_path,
          x: targetBox.x,
          y: targetBox.y,
          w: targetBox.w,
          h: targetBox.h,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok' && data.text) {
        setBoxes((prev) =>
          prev.map((b, i) => (i === targetIdx ? { ...b, text: data.text } : b))
        );
        setIsDirty(true);
        setStatusMsg(`OCR extracted: "${data.text}" (${Math.round((data.confidence || 0) * 100)}%)`);
        toast.success(`OCR Extracted: "${data.text}"`, { duration: 3000 });
      } else {
        setStatusMsg(`OCR finished: ${data.text ? data.text : '(No text found)'}`);
      }
    } catch (err: any) {
      setStatusMsg('OCR extraction failed.');
      toast.error('OCR extraction failed.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!selectedImage) return false;
    setStatusMsg('Saving annotations & exporting CSV...');
    const toastId = toast.loading(`Saving annotations for ${selectedImage.file_name}...`);
    try {
      const res = await fetch(`${API_BASE}/annotator/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: selectedImage.file_name,
          relative_path: selectedImage.relative_path,
          boxes,
          export_csv: exportCsv,
          export_ocr: exportOcr,
          export_img: exportImg,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.detail || 'Unknown error occurred while saving.';
        setStatusMsg(`Save failed: ${errMsg}`);
        toast.error(`Save failed: ${errMsg}`, { id: toastId });
        return false;
      }
      if (data.status === 'warning') {
        setStatusMsg(data.message);
        toast.warning(data.message, { id: toastId, duration: 5000 });
        return false;
      }
      setIsDirty(false);
      const msg = `Saved ${data.saved_boxes} boxes successfully!`;
      setStatusMsg(`${msg}${data.visualization_saved ? ' (JPG generated)' : ''}`);
      toast.success(msg, {
        id: toastId,
        description: `${selectedImage.file_name} · ${data.saved_boxes} box(es) saved to CSV${data.visualization_saved ? ' & visual preview updated' : ''}.`,
        duration: 3500,
      });
      refreshImages();
      return true;
    } catch {
      setStatusMsg('Error: Network failure while saving.');
      toast.error('Network failure: Unable to reach FastAPI backend.', { id: toastId });
      return false;
    }
  };

  const handleAiDetect = async () => {
    if (!selectedImage) return;
    setStatusMsg('Running OpenCV AI Smart Detect...');
    try {
      const res = await fetch(`${API_BASE}/annotator/ai_detect_boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relative_path: selectedImage.relative_path, active_label: activeLabel }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.boxes)) {
        pushHistory([...boxes, ...data.boxes]);
        setStatusMsg(`AI Smart Detect added ${data.boxes.length} boxes`);
      } else {
        setStatusMsg(`AI Detect failed: ${data.detail || 'Error'}`);
      }
    } catch {
      setStatusMsg('AI Detect failed: Network error.');
    }
  };

  const handleSingleCounterpartSync = async () => {
    if (!selectedImage || !counterpart.has_counterpart || !counterpart.counterpart_name || !counterpart.counterpart_rel_path) return;
    if (!confirm(`Transfer ${boxes.length} boxes to ${counterpart.counterpart_name} (${counterpart.direction})?`)) return;
    try {
      const scaleRes = await fetch(`${API_BASE}/annotator/copy_counterpart_boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxes,
          source_width: counterpart.source_dimensions?.width || imgDims.w || 1,
          source_height: counterpart.source_dimensions?.height || imgDims.h || 1,
          target_width: counterpart.target_dimensions?.width || imgDims.w || 1,
          target_height: counterpart.target_dimensions?.height || imgDims.h || 1,
        }),
      });
      const scaled = await scaleRes.json();
      if (!scaleRes.ok) {
        setStatusMsg('Counterpart scaling failed.');
        return;
      }
      const saveRes = await fetch(`${API_BASE}/annotator/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: counterpart.counterpart_name,
          relative_path: counterpart.counterpart_rel_path,
          boxes: scaled.boxes,
          export_csv: true,
          export_ocr: true,
          export_img: exportImg,
        }),
      });
      if (saveRes.ok) {
        setStatusMsg(`Synced ${scaled.boxes.length} boxes to ${counterpart.counterpart_name}`);
        refreshImages();
      } else {
        setStatusMsg('Failed to save counterpart boxes.');
      }
    } catch {
      setStatusMsg('Counterpart sync failed.');
    }
  };

  const loadBatchSummary = async (cat: string, dir: string) => {
    try {
      const res = await fetch(`${API_BASE}/annotator/batch_counterpart_summary?category=${encodeURIComponent(cat)}&direction=${encodeURIComponent(dir)}`);
      if (res.ok) setBatchSummary(await res.json());
    } catch {
      setBatchSummary(null);
    }
  };

  const handleBatchTransfer = async () => {
    if (!confirm(`Run batch ${batchDirection} for ${batchCategory}? Automatic backups will be created.`)) return;
    try {
      const res = await fetch(`${API_BASE}/annotator/batch_copy_counterparts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: batchCategory,
          direction: batchDirection,
          overwrite: batchOverwrite,
          export_img: batchExportImg,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`Batch transfer: ${data.transferred_files} transferred, ${data.skipped_files} skipped`);
        setShowBatchModal(false);
        refreshImages();
      } else {
        setStatusMsg(`Batch transfer failed: ${data.detail || 'Error'}`);
      }
    } catch {
      setStatusMsg('Batch transfer failed.');
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
    if (boxTypes.some((bt) => bt.id === id)) return;
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

  const guardUnsavedChanges = (action: () => void) => {
    if (isDirty) {
      setPendingNavAction(() => action);
      return;
    }
    action();
  };

  const navigateToImage = (target: ImageItem) => {
    if (selectedImage && target.relative_path === selectedImage.relative_path) return;
    guardUnsavedChanges(() => setSelectedImage(target));
  };

  // Warn browser tab close/refresh when there are unsaved annotations
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const categories = Array.from(new Set(images.map((i) => i.category))).sort();
  const catImages = images.filter((im) => categoryFilter === 'All' || im.category === categoryFilter);
  const savedCount = catImages.filter((im) => im.is_annotated).length;
  const pendingCount = catImages.length - savedCount;

  const filteredImages = catImages.filter((im) => {
    if (statusFilter === 'annotated' && !im.is_annotated) return false;
    if (statusFilter === 'unannotated' && im.is_annotated) return false;
    return true;
  });

  const currentImgIdx = selectedImage ? filteredImages.findIndex((i) => i.relative_path === selectedImage.relative_path) : -1;

  // Auto-switch selectedImage when category/status filter excludes the current image
  useEffect(() => {
    if (filteredImages.length > 0 && currentImgIdx === -1) {
      setSelectedImage(filteredImages[0]);
    } else if (filteredImages.length === 0 && selectedImage !== null) {
      setSelectedImage(null);
    }
  }, [categoryFilter, statusFilter, filteredImages, currentImgIdx, selectedImage]);

  const goPrev = () => currentImgIdx > 0 && navigateToImage(filteredImages[currentImgIdx - 1]);
  const goNext = () => currentImgIdx >= 0 && currentImgIdx < filteredImages.length - 1 && navigateToImage(filteredImages[currentImgIdx + 1]);

  const filteredLabels = labels.filter((l) => l.toLowerCase().includes(classSearch.toLowerCase()));

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
            <select value={categoryFilter} onChange={(e) => { const val = e.target.value; guardUnsavedChanges(() => setCategoryFilter(val)); }} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs">
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => guardUnsavedChanges(() => setStatusFilter('all'))} className={`py-1 rounded text-[11px] border ${statusFilter === 'all' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                All ({catImages.length})
              </button>
              <button onClick={() => guardUnsavedChanges(() => setStatusFilter('annotated'))} className={`py-1 rounded text-[11px] border ${statusFilter === 'annotated' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                Saved ({savedCount})
              </button>
              <button onClick={() => guardUnsavedChanges(() => setStatusFilter('unannotated'))} className={`py-1 rounded text-[11px] border ${statusFilter === 'unannotated' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                Pending ({pendingCount})
              </button>
            </div>
            <select
              value={selectedImage?.relative_path || ''}
              onChange={(e) => {
                const found = filteredImages.find((im) => im.relative_path === e.target.value);
                if (found) navigateToImage(found);
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

          {/* Counterpart Sync */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Counterpart Sync</span>
              <button
                onClick={() => {
                  const cat = categoryFilter !== 'All' ? categoryFilter : (categories[0] || 'certificate_of_indigency');
                  setBatchCategory(cat);
                  setShowBatchModal(true);
                  loadBatchSummary(cat, batchDirection);
                }}
                className="text-[10px] text-sky-400 hover:underline"
              >
                Batch Transfer
              </button>
            </div>
            {counterpart.has_counterpart ? (
              <button onClick={handleSingleCounterpartSync} className="w-full py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px]">
                Sync → {counterpart.counterpart_name}
              </button>
            ) : (
              <div className="text-[10px] text-slate-500">No physical/scan counterpart detected</div>
            )}
          </div>

          {/* Active Label & Classes Palette */}
          <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Classes Palette</span>
              <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[160px]">{activeLabel}</span>
            </div>
            <input value={classSearch} onChange={(e) => setClassSearch(e.target.value)} placeholder="Search classes..." className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" />
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {filteredLabels.slice(0, 60).map((lbl) => (
                <button
                  key={lbl}
                  onClick={() => {
                    setActiveLabel(lbl);
                    if (selectedIndices.length > 0) {
                      pushHistory(boxes.map((b, i) => (selectedIndices.includes(i) ? { ...b, label: lbl } : b)));
                    }
                  }}
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

          {/* Selected Box Editor (Class, Box Type, OCR, Notes) */}
          {selectedBox && primaryIdx !== null && (
            <div className="space-y-1.5 bg-slate-900/70 p-2 rounded border border-red-900/60">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-red-400">
                  Selected Box #{primaryIdx + 1} ({selectedBox.w}x{selectedBox.h})
                </span>
                <button
                  onClick={() => {
                    pushHistory(boxes.filter((_, i) => !selectedIndices.includes(i)));
                    setSelectedIndices([]);
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded"
                >
                  Delete ({selectedIndices.length})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={selectedBox.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    pushHistory(boxes.map((b, i) => (i === primaryIdx ? { ...b, label: val } : b)));
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px]"
                >
                  {labels.map((lbl) => (
                    <option key={lbl} value={lbl}>{lbl}</option>
                  ))}
                </select>
                <select
                  value={selectedBox.box_type}
                  onChange={(e) => {
                    const val = e.target.value;
                    pushHistory(boxes.map((b, i) => (i === primaryIdx ? { ...b, box_type: val } : b)));
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px]"
                >
                  {boxTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>{bt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1.5 items-center">
                <textarea
                  value={selectedBox.text}
                  onChange={(e) => {
                    setIsDirty(true);
                    setBoxes(boxes.map((b, i) => (i === primaryIdx ? { ...b, text: e.target.value } : b)));
                  }}
                  placeholder="OCR transcription..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                  rows={2}
                />
                <button
                  type="button"
                  disabled={isOcrLoading}
                  onClick={() => {
                    if (primaryIdx !== null && boxes[primaryIdx]) {
                      triggerOcrForBox(boxes[primaryIdx], primaryIdx);
                    }
                  }}
                  title="Extract text using OCR on this box"
                  className="px-2 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-bold text-xs flex flex-col items-center justify-center shrink-0"
                >
                  <i className={`fa-solid ${isOcrLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} />
                  <span className="text-[9px] mt-0.5">OCR</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {['[✓]', '[ ]', '[signature]', '[seal]'].map((tok) => (
                  <button
                    key={tok}
                    onClick={() => {
                      setIsDirty(true);
                      setBoxes(boxes.map((b, i) => (i === primaryIdx ? { ...b, text: tok } : b)));
                    }}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]"
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Boxes List */}
          <div className="space-y-1 bg-slate-900/70 p-2 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Bounding Boxes ({boxes.length})</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {boxes.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndices([i])}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] truncate ${selectedIndices.includes(i) ? 'bg-red-900/50 text-red-200' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
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
              <input type="checkbox" checked={exportCsv} onChange={(e) => setExportCsv(e.target.checked)} />
              Detection CSV
            </label>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={exportOcr} onChange={(e) => setExportOcr(e.target.checked)} />
              OCR Transcription CSV
            </label>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={exportImg} onChange={(e) => setExportImg(e.target.checked)} />
              Render Annotated Visualization JPG
            </label>
            <div className="space-y-1 text-[10px] text-slate-400 pt-1">
              <div>
                <div className="text-slate-500">Detection CSV:</div>
                <div className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono truncate" title="data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv">
                  data/interim/document_processing/ground_truth_annotations/text_detection_annotations.csv
                </div>
              </div>
              <div>
                <div className="text-slate-500">OCR CSV:</div>
                <div className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono truncate" title="data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv">
                  data/interim/document_processing/ground_truth_annotations/ocr_transcription_annotations.csv
                </div>
              </div>
              <div>
                <div className="text-slate-500">Visualization Folder:</div>
                <div className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono truncate" title="data/interim/document_processing/bounding_box_visualizations">
                  data/interim/document_processing/bounding_box_visualizations
                </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded">
              Save & Export [Ctrl+S]
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Toolbar */}
        <header className="bg-[#0f172a] border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
          <button onClick={() => setToolbarCollapsed((v) => !v)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" title="Collapse/Expand Toolbar">
            {toolbarCollapsed ? '▼' : '▲'}
          </button>
          {!toolbarCollapsed && (
            <>
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
              <button onClick={handleUndo} className="px-2 py-1 bg-slate-800 rounded">Undo</button>
              <button onClick={handleRedo} className="px-2 py-1 bg-slate-800 rounded">Redo</button>
              <button onClick={handleCopy} className="px-2 py-1 bg-slate-800 rounded">Copy</button>
              <button onClick={handlePaste} className="px-2 py-1 bg-slate-800 rounded">Paste</button>
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setAutoOcr((v) => !v)}
            className={`px-2 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
              autoOcr ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-extract text via OCR immediately when a bounding box is drawn"
          >
            <i className="fa-solid fa-bolt text-xs" />
            <span>Auto OCR: {autoOcr ? 'ON' : 'OFF'}</span>
          </button>
          <button onClick={handleAiDetect} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold">AI Detect</button>
          <button onClick={handleSave} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold">
            {isDirty ? 'Save *' : 'Save'}
          </button>
        </header>

        {/* Central Canvas */}
        <main
          ref={mainRef}
          className={`flex-1 bg-[#060913] overflow-auto flex items-center justify-center p-4 ${spaceHeld ? 'cursor-grab' : ''}`}
        >
          {selectedImage ? (
            <>
              <img
                key={selectedImage.relative_path}
                ref={imgRef}
                src={`${API_BASE}/annotator/image_file?path=${encodeURIComponent(selectedImage.relative_path)}`}
                alt={selectedImage.file_name}
                className="hidden"
                onLoad={() => {
                  if (imgRef.current) {
                    setImgDims({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
                  }
                  redraw();
                }}
              />
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: spaceHeld ? 'grab' : canvasCursor }}
                className="shadow-2xl border border-slate-800 bg-black"
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
            <span className="text-emerald-400">{selectedImage?.category || '-'}</span> | Dims:{' '}
            <span className="text-slate-300 font-mono">{imgDims.w}x{imgDims.h}</span>
          </div>
          <div className="text-slate-300">{statusMsg}</div>
        </footer>
      </div>

      {/* Batch Counterpart Transfer Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-700 rounded-lg p-4 w-[420px] space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-sky-400">Batch Counterpart Transfer</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400">Category</label>
              <select
                value={batchCategory}
                onChange={(e) => {
                  setBatchCategory(e.target.value);
                  loadBatchSummary(e.target.value, batchDirection);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="block text-[11px] text-slate-400">Direction</label>
              <select
                value={batchDirection}
                onChange={(e) => {
                  const d = e.target.value as 'physical_to_scan' | 'scan_to_physical';
                  setBatchDirection(d);
                  loadBatchSummary(batchCategory, d);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                <option value="physical_to_scan">Physical → Scan</option>
                <option value="scan_to_physical">Scan → Physical</option>
              </select>
            </div>
            {batchSummary && (
              <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] space-y-1">
                <div>Source files: {batchSummary.total_source_files} ({batchSummary.annotated_source_files} annotated)</div>
                <div>Matched counterparts: {batchSummary.matched_counterparts}</div>
                <div>Transferable files: {batchSummary.transferable_files_count}</div>
                <div>Already annotated targets: {batchSummary.already_annotated_targets}</div>
              </div>
            )}
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={batchOverwrite} onChange={(e) => setBatchOverwrite(e.target.checked)} />
              Overwrite existing target annotations
            </label>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={batchExportImg} onChange={(e) => setBatchExportImg(e.target.checked)} />
              Render visualization JPGs
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBatchModal(false)} className="px-3 py-1 bg-slate-800 rounded">Cancel</button>
              <button onClick={handleBatchTransfer} className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold">Run Batch Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Caution Modal */}
      {pendingNavAction && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-amber-500/60 rounded-lg p-4 w-[400px] shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <i className="fa-solid fa-triangle-exclamation text-base" />
              <h3 className="font-bold text-sm">Unsaved Changes — Save First</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              May mga pagbabago ka pa sa <span className="font-mono text-amber-300">{selectedImage?.file_name}</span> na hindi pa nase-save. I-save muna bago lumipat para hindi mawala ang annotations mo.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingNavAction(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const act = pendingNavAction;
                  setPendingNavAction(null);
                  setIsDirty(false);
                  act();
                }}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold"
              >
                Discard &amp; Switch
              </button>
              <button
                onClick={async () => {
                  const act = pendingNavAction;
                  const ok = await handleSave();
                  if (ok) {
                    setPendingNavAction(null);
                    act();
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
              >
                Save First &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
