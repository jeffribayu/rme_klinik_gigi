import { createPortal } from 'react-dom';
import { useEffect, useId, useRef } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';

/**
 * Video getUserMedia sering tampil HITAM di Chrome jika elemen <video>
 * berada di bawah ancestor yang memakai CSS `transform` (mis. Radix Dialog).
 * Overlay ini memusatkan konten dengan flex tanpa transform.
 */
const DIALOG_LAYOUT_MS = 200;

async function startHtml5Camera(html5, Html5Qrcode, onFrame, onScanError) {
  const cfg = {
    fps: 10,
    qrbox: { width: 200, height: 200 },
  };

  const cameras = await Html5Qrcode.getCameras();
  const candidates = [];

  if (cameras.length > 0) {
    const back = cameras.find((c) =>
      /back|rear|environment|belakang|wide/i.test(c.label || '')
    );
    const ordered = back
      ? [back, ...cameras.filter((c) => c.id !== back.id)]
      : cameras;
    for (const c of ordered) {
      candidates.push(c.id);
    }
  }

  candidates.push({ facingMode: 'user' });
  candidates.push({ facingMode: 'environment' });

  let lastErr;
  for (const cam of candidates) {
    try {
      await html5.start(cam, cfg, onFrame, onScanError);
      return;
    } catch (e) {
      lastErr = e;
      try {
        await html5.stop();
      } catch {
        /* */
      }
      try {
        html5.clear();
      } catch {
        /* */
      }
    }
  }
  throw lastErr || new Error('Kamera tidak dapat dimulai');
}

export default function DoctorAttendanceScannerDialog({ open, mode, onClose, onDecoded }) {
  const reactId = useId().replace(/:/g, '');
  const mountId = `doc-att-scan-${reactId}`;
  const instRef = useRef(null);
  const firedRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);
  const modeRef = useRef(mode);
  onDecodedRef.current = onDecoded;
  modeRef.current = mode;

  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return undefined;
    }
    firedRef.current = false;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let cancelled = false;
    let timer;

    const run = async () => {
      await new Promise((r) => {
        timer = window.setTimeout(r, DIALOG_LAYOUT_MS);
      });
      if (cancelled) return;

      const mountEl = document.getElementById(mountId);
      if (!mountEl || cancelled) return;

      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      if (w < 80 || h < 80) {
        if (!cancelled) toast.error('Area kamera belum siap. Tutup dan buka lagi.');
        onClose();
        return;
      }

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5 = new Html5Qrcode(mountId, { verbose: false });
        instRef.current = html5;

        const onFrame = async (decodedText) => {
          if (firedRef.current || cancelled) return;
          firedRef.current = true;
          try {
            await html5.stop();
          } catch {
            /* */
          }
          try {
            html5.clear();
          } catch {
            /* */
          }
          instRef.current = null;
          onDecodedRef.current(decodedText.trim(), modeRef.current);
        };

        await startHtml5Camera(html5, Html5Qrcode, onFrame, () => {});
      } catch {
        if (!cancelled) {
          toast.error('Kamera tidak tersedia atau izin ditolak');
        }
        onClose();
      }
    };

    run();

    return () => {
      cancelled = true;
      document.body.style.overflow = prevOverflow;
      if (timer) window.clearTimeout(timer);
      const h = instRef.current;
      instRef.current = null;
      if (h) {
        h.stop().then(() => h.clear()).catch(() => {});
      }
    };
  }, [open, mode, onClose, mountId]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${mountId}-title`}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      style={{ transform: 'none' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-lg"
        style={{ transform: 'none' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground opacity-80 hover:bg-muted hover:opacity-100"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id={`${mountId}-title`} className="pr-8 text-lg font-semibold leading-tight">
          {mode === 'in' ? 'Scan QR masuk' : 'Scan QR pulang'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Arahkan kamera ke QR absensi di klinik. Jika layar masih hitam, pastikan tidak ada
          filter/ekstensi yang memblokir kamera.
        </p>
        <div className="attendance-qr-root relative mx-auto mt-4 h-[280px] w-[280px] overflow-hidden rounded-lg bg-black">
          <div id={mountId} className="relative h-full w-full" />
        </div>
      </div>
    </div>,
    document.body
  );
}
