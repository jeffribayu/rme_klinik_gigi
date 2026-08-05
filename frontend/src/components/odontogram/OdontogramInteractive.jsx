import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  Plus,
  Printer,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ALL_CHART_TOOTH_NUMBERS,
  CONDITION_COLORS,
  CONDITION_LABELS,
  ODONTOGRAM_ROWS,
} from './odontogramConfig';

function toothCondition(entry) {
  if (!entry) return 'sehat';
  return entry.condition_type || entry.conditionType || entry.condition || 'sehat';
}

function clonePatch(p) {
  const o = {};
  for (const [k, v] of Object.entries(p)) {
    o[k] = { condition_type: v.condition_type, notes: v.notes || '' };
  }
  return o;
}

/** Gigi lima bidang: atas, kiri, tengah, kanan, bawah */
function FiveSegmentTooth({ number, condition, onClick, readOnly, compact }) {
  const fill = CONDITION_COLORS[condition] || CONDITION_COLORS.sehat;
  const w = compact ? 'w-[34px]' : 'w-[38px]';

  return (
    <motion.button
      type="button"
      disabled={readOnly}
      whileHover={readOnly ? {} : { scale: 1.04, y: -1 }}
      whileTap={readOnly ? {} : { scale: 0.97 }}
      onClick={() => !readOnly && onClick(number)}
      className={cn(
        'group flex flex-col items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        readOnly && 'cursor-default opacity-90'
      )}
    >
      <div
        className={cn(
          'rounded-xl bg-gradient-to-b from-white/95 to-slate-100/90 p-0.5 shadow-md ring-1 ring-slate-200/90 dark:from-slate-800/95 dark:to-slate-900/90 dark:ring-slate-600/80',
          w
        )}
      >
        <div
          className={cn(
            'grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/60 p-px dark:bg-slate-950/40',
            compact ? 'grid-rows-[9px_26px_9px]' : 'grid-rows-[10px_30px_10px]'
          )}
        >
          <div className="col-span-3 rounded-t-sm" style={{ backgroundColor: fill }} title="oklusal" />
          <div className="rounded-sm" style={{ backgroundColor: fill, opacity: 0.92 }} title="bukal/mesial" />
          <div className="rounded-sm" style={{ backgroundColor: fill }} title="tengah" />
          <div className="rounded-sm" style={{ backgroundColor: fill, opacity: 0.92 }} title="palatal/distal" />
          <div className="col-span-3 rounded-b-sm" style={{ backgroundColor: fill, opacity: 0.88 }} title="servikal" />
        </div>
      </div>
      <span className="mt-1 text-[10px] font-bold tabular-nums tracking-tight text-slate-600 dark:text-slate-300">
        {number}
      </span>
    </motion.button>
  );
}

export default function OdontogramInteractive({
  medicalRecordId,
  odontograms = [],
  readOnly,
  onAfterSave,
  detailHref,
  embedded = false,
}) {
  const printRef = useRef(null);

  const [hist, setHist] = useState({ past: [], cur: {}, future: [] });
  const local = hist.cur;

  useEffect(() => {
    setHist({ past: [], cur: {}, future: [] });
  }, [medicalRecordId]);

  const serverMap = useMemo(() => {
    const map = {};
    odontograms.forEach((o) => {
      map[o.tooth_number] = {
        condition_type: toothCondition(o),
        notes: o.notes || '',
      };
    });
    return map;
  }, [odontograms]);

  const merged = useMemo(() => ({ ...serverMap, ...local }), [serverMap, local]);

  const isDirty = useMemo(() => {
    for (const [k, v] of Object.entries(local)) {
      const n = Number(k);
      const orig = odontograms.find((o) => o.tooth_number === n);
      const oC = orig ? toothCondition(orig) : 'sehat';
      const oN = orig?.notes || '';
      if (v.condition_type !== oC || (v.notes || '') !== oN) return true;
    }
    return false;
  }, [local, odontograms]);

  const filledCount = useMemo(() => {
    return ALL_CHART_TOOTH_NUMBERS.filter((n) => {
      const c = merged[n]?.condition_type || 'sehat';
      const nts = merged[n]?.notes || '';
      return c !== 'sehat' || (nts && nts.trim().length > 0);
    }).length;
  }, [merged]);

  const progress = Math.round((filledCount / ALL_CHART_TOOTH_NUMBERS.length) * 100);

  const applyLocal = useCallback((updater) => {
    setHist((h) => {
      const next =
        typeof updater === 'function' ? updater(h.cur) : updater;
      return {
        past: [...h.past, clonePatch(h.cur)].slice(-45),
        cur: clonePatch(next),
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHist((h) => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        cur: prev,
        future: [clonePatch(h.cur), ...h.future].slice(0, 45),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHist((h) => {
      if (!h.future.length) return h;
      const [next, ...rest] = h.future;
      return {
        past: [...h.past, clonePatch(h.cur)].slice(-45),
        cur: next,
        future: rest,
      };
    });
  }, []);

  const resetCanvas = useCallback(() => {
    if (
      Object.keys(local).length > 0 &&
      !window.confirm('Hapus semua perubahan lokal pada odontogram? Data tersimpan di server tidak diubah.')
    ) {
      return;
    }
    setHist({ past: [], cur: {}, future: [] });
    toast.message('Tampilan direset', {
      description: 'Perubahan lokal dibersihkan. Data tersimpan tetap di server.',
    });
  }, [local]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [cond, setCond] = useState('sehat');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openTooth = (num) => {
    if (readOnly) return;
    setSelectedTooth(num);
    const cur = merged[num]?.condition_type || 'sehat';
    setCond(cur);
    setNotes(merged[num]?.notes || '');
    setModalOpen(true);
  };

  const save = async () => {
    if (!selectedTooth || !medicalRecordId || readOnly) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/medical-records/${medicalRecordId}/teeth`, {
        tooth_number: selectedTooth,
        condition_type: cond,
        notes: notes || null,
      });
      applyLocal((cur) => ({
        ...cur,
        [selectedTooth]: { condition_type: cond, notes },
      }));
      toast.success('Gigi disimpan');
      setModalOpen(false);
      onAfterSave?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const syncAll = async () => {
    if (!onAfterSave) {
      toast.info('Gunakan tombol Simpan pada dialog gigi setelah mengubah kondisi.');
      return;
    }
    setSyncing(true);
    try {
      await onAfterSave();
      toast.success('Data disegarkan dari server');
    } catch {
      toast.error('Gagal memuat ulang');
    } finally {
      setSyncing(false);
    }
  };

  const printChart = () => {
    window.print();
  };

  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
            disabled={readOnly}
            onClick={resetCanvas}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Baru
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            disabled={readOnly || !canUndo}
            onClick={undo}
          >
            <Undo2 className="mr-1.5 h-4 w-4" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            disabled={readOnly || !canRedo}
            onClick={redo}
          >
            <Redo2 className="mr-1.5 h-4 w-4" />
            Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            onClick={printChart}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Cetak
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-sky-600 text-white hover:bg-sky-700"
            disabled={readOnly || syncing}
            onClick={syncAll}
          >
            {syncing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Simpan
          </Button>
        </div>
        <Badge
          variant={isDirty ? 'destructive' : 'success'}
          className="shrink-0 px-3 py-1 text-xs font-medium"
        >
          {isDirty ? 'Data belum tersimpan (undo/redo lokal)' : 'Data selaras dengan server'}
        </Badge>
      </div>

      <div
        ref={printRef}
        className="odontogram-print-scope relative overflow-hidden rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/40 to-sky-50/50 p-4 shadow-lg dark:border-cyan-900/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950/90 md:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />

        <div className="relative space-y-5">
          {ODONTOGRAM_ROWS.map((row) => (
            <div key={row.key}>
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-cyan-800/80 dark:text-cyan-200/80">
                {row.shortLabel}
              </p>
              <div className="flex justify-center overflow-x-auto pb-1">
                <div className="flex flex-nowrap justify-center gap-1 px-1 sm:gap-1.5 md:gap-2">
                  {row.teeth.map((n) => (
                    <FiveSegmentTooth
                      key={n}
                      number={n}
                      condition={merged[n]?.condition_type || 'sehat'}
                      onClick={openTooth}
                      readOnly={readOnly}
                      compact={row.teeth.length > 12}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-6 space-y-3 border-t border-cyan-200/40 pt-4 dark:border-cyan-900/40">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Status pengisian</span>
              <span>
                {filledCount} / {ALL_CHART_TOOTH_NUMBERS.length} gigi dicatat
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          {!readOnly && !embedded && detailHref && (
            <Button
              asChild
              className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md hover:from-sky-700 hover:to-cyan-700"
            >
              <Link to={detailHref}>Proses selanjutnya — kembali ke rekam medis</Link>
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Keadaan gigi (legenda)
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-100"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/50"
                style={{ backgroundColor: CONDITION_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Klik gigi untuk mengubah kondisi. Susunan mengikuti notasi FDI (tetap + susu).{' '}
          {readOnly && 'Mode baca saja.'}
        </p>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gigi {selectedTooth}</DialogTitle>
            <DialogDescription>Pilih kondisi sesuai pemeriksaan klinis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Select value={cond} onValueChange={setCond}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([k, lab]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-6 rounded"
                          style={{ backgroundColor: CONDITION_COLORS[k] }}
                        />
                        {lab}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="odo-notes">Catatan</Label>
              <Textarea
                id="odo-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Tutup
            </Button>
            <Button onClick={save} disabled={saving || readOnly}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan gigi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
