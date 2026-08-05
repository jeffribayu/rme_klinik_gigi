import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const emptyLine = () => ({
  medicine_name: '',
  dosage: '',
  instruction: '',
});

/** Baris resep: pilih dari master obat atau isi manual. */
export function PrescriptionFields({ lines, onChange, catalog, readOnly }) {
  const setLine = (idx, patch) => {
    const next = lines.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    onChange(next);
  };

  const applyCatalog = (idx, medId) => {
    if (!medId || medId === '__manual') {
      return;
    }
    const m = catalog.find((x) => String(x.id) === medId);
    if (!m) return;
    const dosage = [m.strength, m.form].filter(Boolean).join(' · ') || '';
    setLine(idx, {
      medicine_name: m.name,
      dosage: dosage || lines[idx]?.dosage || '',
    });
  };

  const addRow = () => onChange([...(lines || []), emptyLine()]);
  const removeRow = (idx) => onChange(lines.filter((_, i) => i !== idx));

  if (readOnly) {
    return null;
  }

  return (
    <div className="space-y-4">
      {(lines || []).map((row, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Pilih dari master obat</Label>
              <Select onValueChange={(v) => applyCatalog(idx, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tambah dari master…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual">— Isi manual di bawah —</SelectItem>
                  {catalog.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                      {m.strength ? ` (${m.strength})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nama obat *</Label>
              <Input
                value={row.medicine_name}
                onChange={(e) => setLine(idx, { medicine_name: e.target.value })}
                placeholder="Contoh: Amoxicillin"
              />
            </div>
            <div className="space-y-2">
              <Label>Dosis / bentuk</Label>
              <Input
                value={row.dosage || ''}
                onChange={(e) => setLine(idx, { dosage: e.target.value })}
                placeholder="500 mg, 3x1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Aturan pakai</Label>
              <Textarea
                value={row.instruction || ''}
                onChange={(e) => setLine(idx, { instruction: e.target.value })}
                placeholder="Sesudah makan, 5 hari"
                rows={2}
              />
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(idx)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus baris
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        Tambah obat
      </Button>
    </div>
  );
}
