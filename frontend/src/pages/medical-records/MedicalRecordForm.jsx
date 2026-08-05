import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ageFromBirthDate, formatCurrency, todayLocalDate } from '@/lib/utils';
import { ODONTOGRAM_ROWS } from '@/components/odontogram/odontogramConfig';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  patient_id: z.coerce.number().int().positive(),
  doctor_id: z.coerce.number().int().positive(),
  complaint: z.string().optional().or(z.literal('')),
  diagnosis: z.string().optional().or(z.literal('')),
  treatment: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  visit_date: z.string().min(1),
});

const tabs = [
  { id: 'anamnesa', label: 'Anamnesa & Pemeriksaan' },
  { id: 'tindakan', label: 'Tindakan' },
  { id: 'lab', label: 'Pemeriksaan Lab.' },
  { id: 'resep', label: 'Resep' },
  { id: 'obat', label: 'Obat' },
  { id: 'odontogram', label: 'Odontogram' },
  { id: 'periochart', label: 'Periochart' },
  { id: 'sefalometri', label: 'Sefalometri' },
];

const bodyExamFields = [
  'Kepala',
  'Mata',
  'Leher',
  'Tenggorokan',
  'Tonsil',
  'Dada',
  'Payudara',
  'Punggung',
  'Perut',
  'Genital',
  'Anus/Dubur',
  'Lengan atas',
  'Lengan bawah',
  'Jari tangan',
  'Kuku tangan',
  'Persendian tangan',
  'Tungkai atas',
  'Tungkai bawah',
  'Jari kaki',
  'Kuku kaki',
  'Persendian kaki',
];

const diagnosisOptions = [
  'K02.0 - Karies Enamel',
  'K02.1 - Karies Dentin',
  'K04.0 - Pulpitis',
  'S02.5 - Fraktur Enamel',
  'K04.1 - Nekrosis Pulpa',
  'K04.7 - Abses Periapikal Tanpa Sinus',
  'K04.6 - Abses Periapikal Dengan Sinus',
  'K08.3 - Sisa Akar / Radix',
  'K00.6 - Persistensi Gigi Sulung',
  'K05.2 - Akut Perikoronitis',
  'K08.1 - Mobility Missing',
  'K01.1 - Impacted Teeth',
  'K08.1 - Gigi Ompong / Full Edentulous Partial',
  'K08.0 - Mobility Karena DM',
  'K05.0 - Gingivitis Akut',
  'K05.1 - Gingivitis Kronis',
  'K05.2 - Periodontitis Akut',
  'K05.3 - Periodontitis Kronis',
  'K06.0 - Resesi Gingiva',
  'K06.1 - Pembesaran Gingiva',
  'K03.6 - Plak dan Kalkulus',
  'K00.0 - Anodontia',
  'K03.1 - Gigi Abrasi',
  'K03.2 - Gigi Erosi',
  'K03.4 - Hipersementosis',
  'K03.5 - Ankilosis',
  'K13.0 - Penyakit Bibir',
  'K13.2 - Leukoplakia dan Gangguan Epitel Lidah',
  'K13.4 - Granuloma dan Lesi Mukosa Oral',
  'K14.0 - Glositis',
  'K14.1 - Geographic Tongue / Geografis Lidah',
  'K12.0 - SAR / Stomatitis Aftosa Rekuren',
  'K12.0 - Traumatic Ulcer',
  'K13.0 - Angular Cheilitis',
  'Oral Ulcer',
  'K13.2 - Stomatitis Nikotina',
  'K11.6 - Mukosel',
  'L30.8 - Bintik Putih',
  'B37.0 - Oral Thrush',
];

function diagnosisIcdCode(value) {
  return String(value || '').match(/^[A-Z]\d{2}(?:\.\d)?/)?.[0] || '';
}

const defaultBodyExam = Object.fromEntries(
  bodyExamFields.map((field) => [field, 'Tidak Ada Kelainan (TAK)'])
);

const defaultAnamnesa = {
  pemeriksaan: '',
  kesadaran: 'Sadar Baik/Alert',
  denyutJantung: '',
  pernapasan: '',
  sistole: '',
  diastole: '',
  suhu: '',
  tinggi: '',
  berat: '',
  dokumentasi: '',
  diagnosisPrimer: 'K05.0 - Gingivitis Akut',
  diagnosisSekunder: '',
  prognosis: '',
  tindakan: '',
  rencanaRawat: '',
  bodyExam: defaultBodyExam,
};

function formatBirthDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function patientGender(gender) {
  if (gender === 'L') return 'Laki-laki';
  if (gender === 'P') return 'Perempuan';
  return '-';
}

function noteLineValue(notes, label) {
  const line = String(notes || '')
    .split('\n')
    .find((item) => item.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : '';
}

function stripSuffix(value, suffix) {
  return String(value || '').replace(suffix, '').trim();
}

const issuedMedicineMarker = 'Pemberian Obat:';

function stripIssuedMedicineNotes(notes) {
  return String(notes || '').split(issuedMedicineMarker)[0].trim();
}

function issuedMedicineLines(rows, catalog) {
  return rows
    .map((row) => {
      const med = catalog.find((item) => String(item.id) === String(row.medicineId));
      const name = med?.name || row.name || '';
      const qty = Number(row.qty) || 0;
      const tariff = Number(row.tariff) || 0;
      const subtotal = qty * tariff;
      if (!name || !qty) return null;
      return `${name}, jumlah ${qty}, tarif ${formatCurrency(tariff)}, subtotal ${formatCurrency(subtotal)}`;
    })
    .filter(Boolean);
}

function notesWithIssuedMedicine(notes, rows, catalog) {
  const base = stripIssuedMedicineNotes(notes);
  const lines = issuedMedicineLines(rows, catalog);
  if (!lines.length) return String(notes || '').trim();
  return [base, '', issuedMedicineMarker, ...lines].filter(Boolean).join('\n');
}

function keepExistingIssuedMedicine(newNotes, oldNotes) {
  const text = String(oldNotes || '');
  const index = text.indexOf(issuedMedicineMarker);
  if (index < 0) return newNotes;
  return [newNotes, '', text.slice(index).trim()].filter(Boolean).join('\n');
}

function treatmentTotal(rows) {
  return rows.reduce((sum, row) => sum + Number(row.price || 0), 0);
}

function treatmentLine(row) {
  return `${row.name} (${row.tooth || '-'}), frekuensi ${row.frequency}, petugas ${row.staff || '-'}, tarif ${formatCurrency(row.price)}`;
}

function VitalRow({ label, unit }) {
  return (
    <div className="grid grid-cols-[180px_16px_1fr] items-center gap-2">
      <span>{label}</span>
      <span>:</span>
      <div className="flex items-center gap-2">
        <Input className="h-8 max-w-[120px] rounded border-slate-300 bg-white dark:bg-slate-950" />
        <span>{unit}</span>
      </div>
    </div>
  );
}

export default function MedicalRecordForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const presetPatient = params.get('patient_id');
  const presetDoctor = params.get('doctor_id');
  const queueNumber = params.get('queue_number');
  const isEdit = Boolean(id);
  const isDoctorRole = user?.role === 'doctor';
  const loggedInDoctorId = user?.doctor_id ? Number(user.doctor_id) : null;

  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [treatmentCatalog, setTreatmentCatalog] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicineRows, setMedicineRows] = useState([
    { item: '', medicineId: '', qty: '', tariff: 0 },
  ]);
  const [treatmentRows, setTreatmentRows] = useState([]);
  const [treatmentDraft, setTreatmentDraft] = useState({
    diagnosis: 'K05.0 - Gingivitis Akut',
    icd: 'K05.0',
    icd9: '',
    tooth: '',
    treatmentId: '',
    frequency: 1,
    staff: '',
    price: '',
  });
  const [activeTab, setActiveTab] = useState('anamnesa');
  const [anamnesaOpen, setAnamnesaOpen] = useState(false);
  const [anamnesa, setAnamnesa] = useState(defaultAnamnesa);
  const [anamnesaSaved, setAnamnesaSaved] = useState(false);
  const [showAnamnesaPreview, setShowAnamnesaPreview] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState(id || null);
  const [savingAnamnesa, setSavingAnamnesa] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      patient_id: presetPatient ? Number(presetPatient) : undefined,
      doctor_id: presetDoctor ? Number(presetDoctor) : undefined,
      complaint: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      visit_date: todayLocalDate(),
    },
  });

  const patientId = watch('patient_id');
  const doctorId = watch('doctor_id');
  const visitDate = watch('visit_date');

  const selectedDoctor = useMemo(
    () => doctors.find((d) => Number(d.id) === Number(doctorId)),
    [doctors, doctorId]
  );

  const noRawat = `${String(visitDate || '').replaceAll('-', '/')}/${String(queueNumber || '1').padStart(4, '0')}`;
  const patientAge = ageFromBirthDate(patient?.birth_date);
  const selectedDoctorName = selectedDoctor?.name || 'drg. Linda Puspitasari';
  const practiceAddress = 'Jl. Batang Hari, RT.036/ Rw004, Purwosari, Kec. Pelepat Ilir, Kabupaten Bungo, Jambi 37252';

  const setAnamnesaField = (key, value) => {
    setAnamnesa((prev) => ({ ...prev, [key]: value }));
  };

  const setBodyExam = (key, value) => {
    setAnamnesa((prev) => ({
      ...prev,
      bodyExam: {
        ...prev.bodyExam,
        [key]: value,
      },
    }));
  };

  const prepareAnamnesaValues = () => {
    const vitalSummary = [
      `Pemeriksaan: ${anamnesa.pemeriksaan || '-'}`,
      `Tingkat Kesadaran: ${anamnesa.kesadaran || '-'}`,
      `Denyut Jantung: ${anamnesa.denyutJantung || '-'} per menit`,
      `Pernapasan: ${anamnesa.pernapasan || '-'} per menit`,
      `Tekanan Darah: ${anamnesa.sistole || '-'}/${anamnesa.diastole || '-'} mmHg`,
      `Suhu Tubuh: ${anamnesa.suhu || '-'} C`,
      `Tinggi/Berat Badan: ${anamnesa.tinggi || '-'} cm / ${anamnesa.berat || '-'} kg`,
      '',
      'Pemeriksaan Fisik:',
      ...Object.entries(anamnesa.bodyExam).map(([key, value]) => `${key}: ${value || '-'}`),
      '',
      `Dokumentasi: ${anamnesa.dokumentasi || '-'}`,
      `Diagnosis Sekunder: ${anamnesa.diagnosisSekunder || '-'}`,
      `Prognosis: ${anamnesa.prognosis || '-'}`,
      `Rencana Rawat Pasien: ${anamnesa.rencanaRawat || '-'}`,
    ].join('\n');

    const preparedNotes = keepExistingIssuedMedicine(vitalSummary, watch('notes'));
    const prepared = {
      complaint: anamnesa.pemeriksaan || '',
      diagnosis: anamnesa.diagnosisPrimer || '',
      treatment: anamnesa.tindakan || anamnesa.rencanaRawat || '',
      notes: preparedNotes,
    };

    setValue('complaint', prepared.complaint);
    setValue('diagnosis', prepared.diagnosis);
    setValue('treatment', prepared.treatment);
    setValue('notes', prepared.notes);
    return prepared;
  };

  const saveAnamnesa = async ({ closeDialog = true, showToast = true } = {}) => {
    const values = {
      patient_id: Number(watch('patient_id')),
      doctor_id: Number(watch('doctor_id')),
      visit_date: watch('visit_date'),
      ...prepareAnamnesaValues(),
    };

    if (!values.patient_id || !values.doctor_id || !values.visit_date) {
      toast.error('Pilih pasien, dokter, dan tanggal kunjungan terlebih dahulu');
      return;
    }

    setSavingAnamnesa(true);
    try {
      const payload = {
        ...values,
        complaint: values.complaint || null,
        diagnosis: values.diagnosis || null,
        treatment: values.treatment || null,
        notes: values.notes || null,
        odontograms: [],
        prescriptions: prescriptions.filter((x) => x.medicine_name?.trim()),
      };
      const recordId = savedRecordId || id;
      const { data } = recordId
        ? await api.put(`/api/v1/medical-records/${recordId}`, payload)
        : await api.post('/api/v1/medical-records', payload);
      const nextId = data.data?.id || recordId;
      if (nextId) setSavedRecordId(String(nextId));
      if (!id && nextId) {
        window.history.replaceState(null, '', `/medical-records/${nextId}/edit`);
      }
      if (data.data?.prescriptions) {
        setPrescriptions(
          (data.data.prescriptions || []).map((rx) => ({
            medicine_name: rx.medicine_name,
            dosage: rx.dosage || '',
            instruction: rx.instruction || '',
          }))
        );
      }
      setAnamnesaSaved(true);
      setShowAnamnesaPreview(true);
      if (closeDialog) setAnamnesaOpen(false);
      if (showToast) toast.success(recordId ? 'Anamnesa diperbarui' : 'Anamnesa tersimpan');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan anamnesa');
    } finally {
      setSavingAnamnesa(false);
    }
  };

  const prepareAnamnesaOnly = ({ closeDialog = true, showToast = true } = {}) => {
    prepareAnamnesaValues();
    setAnamnesaSaved(true);
    setShowAnamnesaPreview(true);
    if (closeDialog) setAnamnesaOpen(false);
    if (showToast) toast.success('Anamnesa disiapkan');
  };

  useEffect(() => {
    (async () => {
      try {
        const [d, p, m, n] = await Promise.all([
          api.get('/api/v1/doctors'),
          api.get('/api/v1/patients?limit=100&page=1'),
          api.get('/api/v1/medicines?active_only=true'),
          api.get('/api/v1/users/nurses'),
        ]);
        api
          .get('/api/v1/treatments?active_only=true')
          .then(({ data }) => setTreatmentCatalog(data.data || []))
          .catch(() => setTreatmentCatalog([]));
        let loadedPatients = p.data.data || [];
        if (presetPatient && !loadedPatients.some((item) => String(item.id) === presetPatient)) {
          const selected = await api.get(`/api/v1/patients/${presetPatient}`);
          loadedPatients = [selected.data.data, ...loadedPatients];
        }
        setDoctors(d.data.data || []);
        setNurses(n.data.data || []);
        const firstNurse = n.data.data?.[0];
        if (firstNurse) {
          setTreatmentDraft((prev) => (prev.staff ? prev : { ...prev, staff: firstNurse.name }));
        }
        setPatients(loadedPatients);
        setCatalog(m.data.data || []);
        if (isDoctorRole && loggedInDoctorId) {
          setValue('doctor_id', loggedInDoctorId);
        } else if (presetDoctor) {
          setValue('doctor_id', Number(presetDoctor));
        } else if (!doctorId && d.data.data[0]) {
          setValue('doctor_id', d.data.data[0].id);
        }
        if (presetPatient) {
          setValue('patient_id', Number(presetPatient));
          const selectedPatient =
            loadedPatients.find((item) => String(item.id) === presetPatient) || null;
          setPatient(selectedPatient);
        }
      } catch {
        toast.error('Gagal memuat referensi pemeriksaan');
      }
    })();
  }, [doctorId, isDoctorRole, loggedInDoctorId, presetPatient, presetDoctor, setValue]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/medical-records/${id}`);
        const mr = data.data;
        setSavedRecordId(String(mr.id));
        setValue('patient_id', Number(mr.patient_id));
        setValue('doctor_id', isDoctorRole && loggedInDoctorId ? loggedInDoctorId : Number(mr.doctor_id));
        setValue('complaint', mr.complaint || '');
        setValue('diagnosis', mr.diagnosis || '');
        setValue('treatment', mr.treatment || '');
        setValue('notes', mr.notes || '');
        setValue('visit_date', String(mr.visit_date || '').slice(0, 10));
        const oldNotes = mr.notes || '';
        const bloodPressure = stripSuffix(noteLineValue(oldNotes, 'Tekanan Darah'), 'mmHg');
        const [oldSistole = '', oldDiastole = ''] = bloodPressure.split('/').map((part) => part.trim());
        const bodyExam = { ...defaultBodyExam };
        Object.keys(bodyExam).forEach((field) => {
          const value = noteLineValue(oldNotes, field);
          if (value) bodyExam[field] = value;
        });
        setAnamnesa((prev) => ({
          ...prev,
          pemeriksaan: mr.complaint || stripSuffix(noteLineValue(oldNotes, 'Pemeriksaan'), '-'),
          diagnosisPrimer: mr.diagnosis || prev.diagnosisPrimer,
          tindakan: mr.treatment || '',
          denyutJantung: stripSuffix(noteLineValue(oldNotes, 'Denyut Jantung'), 'per menit').replace('-', ''),
          pernapasan: stripSuffix(noteLineValue(oldNotes, 'Pernapasan'), 'per menit').replace('-', ''),
          sistole: oldSistole.replace('-', ''),
          diastole: oldDiastole.replace('-', ''),
          suhu: stripSuffix(noteLineValue(oldNotes, 'Suhu Tubuh'), 'C').replace('-', ''),
          dokumentasi: stripSuffix(noteLineValue(oldNotes, 'Dokumentasi'), '-'),
          diagnosisSekunder: stripSuffix(noteLineValue(oldNotes, 'Diagnosis Sekunder'), '-'),
          prognosis: stripSuffix(noteLineValue(oldNotes, 'Prognosis'), '-'),
          rencanaRawat: stripSuffix(noteLineValue(oldNotes, 'Rencana Rawat Pasien'), '-'),
          bodyExam,
        }));
        setAnamnesaSaved(Boolean(mr.complaint || mr.diagnosis || mr.treatment || mr.notes));
        setShowAnamnesaPreview(Boolean(mr.complaint || mr.diagnosis || mr.treatment || mr.notes));
        setPrescriptions(
          (mr.prescriptions || []).map((rx) => ({
            medicine_name: rx.medicine_name,
            dosage: rx.dosage || '',
            instruction: rx.instruction || '',
          }))
        );
      } catch {
        toast.error('Gagal memuat rekam medis');
        navigate('/medical-records');
      }
    })();
  }, [id, isDoctorRole, isEdit, loggedInDoctorId, navigate, setValue]);

  useEffect(() => {
    const found = patients.find((item) => Number(item.id) === Number(patientId));
    setPatient(found || null);
  }, [patientId, patients]);

  const selectedTreatment = treatmentCatalog.find(
    (item) => String(item.id) === String(treatmentDraft.treatmentId)
  );
  const treatmentPrice = Number(treatmentDraft.price) || 0;

  const applyTreatmentDiagnosis = (diagnosis) => {
    setTreatmentDraft((prev) => ({
      ...prev,
      diagnosis,
      icd: diagnosisIcdCode(diagnosis),
    }));
  };

  const applyTreatmentDefaults = (id) => {
    const selected = treatmentCatalog.find((item) => String(item.id) === String(id));
    const frequency = Math.max(1, Number(treatmentDraft.frequency) || 1);
    setTreatmentDraft((prev) => ({
      ...prev,
      treatmentId: id,
      icd: selected?.icd_code || prev.icd,
      icd9: selected?.icd9_code || '',
      tooth: selected?.tooth_element || prev.tooth,
      price: selected ? String((Number(selected.price) || 0) * frequency) : '',
    }));
  };

  const saveTreatmentRow = () => {
    if (!selectedTreatment) {
      toast.error('Pilih jenis tindakan terlebih dahulu');
      return;
    }
    if (!treatmentDraft.staff) {
      toast.error('Pilih perawat/petugas terlebih dahulu');
      return;
    }
    const row = {
      id: `${selectedTreatment.id}-${Date.now()}`,
      diagnosis: treatmentDraft.diagnosis || '-',
      name: selectedTreatment.name,
      icd: treatmentDraft.icd || selectedTreatment.icd_code || '-',
      icd9: treatmentDraft.icd9 || selectedTreatment.icd9_code || '-',
      tooth: treatmentDraft.tooth || selectedTreatment.tooth_element || '-',
      frequency: Math.max(1, Number(treatmentDraft.frequency) || 1),
      doctor: selectedDoctor?.name || '-',
      staff: treatmentDraft.staff || '-',
      price: Number(treatmentDraft.price) || 0,
    };
    setTreatmentRows((prev) => [...prev, row]);
    setValue(
      'treatment',
      [...treatmentRows, row].map(treatmentLine).join('\n')
    );
    toast.success('Tindakan ditambahkan');
  };

  const setPrescriptionLine = (idx, patch) => {
    setPrescriptions((prev) => {
      const base = prev.length ? prev : [{ medicine_name: '', dosage: '', instruction: '', days: '', total: '' }];
      return base.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    });
  };

  const addPrescriptionLine = () => {
    setPrescriptions((prev) => [
      ...(prev.length ? prev : [{ medicine_name: '', dosage: '', instruction: '', days: '', total: '' }]),
      { medicine_name: '', dosage: '', instruction: '', days: '', total: '' },
    ]);
  };

  const applyPrescriptionMedicine = (idx, medId) => {
    const med = catalog.find((item) => String(item.id) === String(medId));
    if (!med) return;
    setPrescriptionLine(idx, {
      medicine_name: med.name,
      dosage: [med.strength, med.form].filter(Boolean).join(' - '),
    });
  };

  const setMedicineRow = (idx, patch) => {
    setMedicineRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const applyIssuedMedicine = (idx, medId) => {
    const med = catalog.find((item) => String(item.id) === String(medId));
    setMedicineRow(idx, {
      medicineId: medId,
      tariff: Number(med?.price || med?.tariff || 0),
    });
  };

  const addMedicineRow = () => {
    setMedicineRows((prev) => [...prev, { item: '', medicineId: '', qty: '', tariff: 0 }]);
  };

  const medicineTotal = medicineRows.reduce(
    (sum, row) => sum + (Number(row.qty) || 0) * (Number(row.tariff) || 0),
    0
  );
  const billingTotal = treatmentTotal(treatmentRows) + medicineTotal;

  const syncPayment = async (medicalRecordId, total) => {
    if (!medicalRecordId || total <= 0) return;
    const { data } = await api.get(`/api/v1/medical-records/${medicalRecordId}`);
    const existing = data.data?.payments?.[0];
    const body = {
      total_price: total,
      payment_method: existing?.payment_method || 'tunai',
      payment_status: existing?.payment_status || 'belum_bayar',
    };
    if (existing?.id) {
      await api.put(`/api/v1/payments/${existing.id}`, body);
    } else {
      await api.post('/api/v1/payments', {
        medical_record_id: Number(medicalRecordId),
        ...body,
      });
    }
  };

  const onSubmit = async (values) => {
    const treatmentText =
      treatmentRows.length > 0
        ? treatmentRows
            .map(treatmentLine)
            .join('\n')
        : values.treatment || null;
    const notesText = notesWithIssuedMedicine(values.notes || '', medicineRows, catalog);
    const payload = {
      ...values,
      complaint: values.complaint || null,
      diagnosis: values.diagnosis || null,
      treatment: treatmentText,
      notes: notesText || null,
      odontograms: [],
      prescriptions: prescriptions.filter((x) => x.medicine_name?.trim()),
    };
    try {
      const recordId = savedRecordId || id;
      const { data } = recordId
        ? await api.put(`/api/v1/medical-records/${recordId}`, payload)
        : await api.post('/api/v1/medical-records', payload);
      const nextId = data.data?.id || recordId;
      if (nextId) setSavedRecordId(String(nextId));
      await syncPayment(nextId, billingTotal);
      toast.success(recordId ? 'Rekam medis diperbarui' : 'Rekam medis dibuat');
      navigate(`/medical-records/${data.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="text-sm">
        <Link to="/appointments" className="text-teal-600 hover:underline">
          Antrian Pasien
        </Link>
        <span className="mx-1 text-slate-500">&gt;</span>
        <span>Anamnesa</span>
      </div>

      <Card className="rounded border-slate-200 bg-white shadow-md shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 sm:p-5">
          <h1 className="mb-4 text-2xl font-medium uppercase tracking-normal text-slate-900 dark:text-slate-50 sm:text-3xl">
            {isEdit ? 'EDIT REKAM MEDIS' : 'PERIKSA PASIEN'}
          </h1>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-sm">
              <tbody>
                <tr>
                  <InfoCell label="Nama Pasien" value={patient?.name || '-'} />
                  <InfoCell label="No Rawat" value={noRawat} />
                </tr>
                <tr>
                  <InfoCell label="No Rekam Medis" value={patient?.patient_code || '-'} />
                  <InfoCell label="Poli/Ruang Tindakan" value="Poliklinik 1" />
                </tr>
                <tr>
                  <InfoCell label="Jenis Kelamin" value={patientGender(patient?.gender)} />
                  <InfoCell label="Rujukan" value="-" />
                </tr>
                <tr>
                  <InfoCell label="Tanggal Lahir" value={formatBirthDate(patient?.birth_date)} />
                  <InfoCell label="Riwayat Alergi" value="-" />
                </tr>
                <tr>
                  <InfoCell
                    label="Umur"
                    value={
                      ageFromBirthDate(patient?.birth_date) != null
                        ? `${ageFromBirthDate(patient?.birth_date)} Tahun`
                        : '-'
                    }
                  />
                  <InfoCell label="Dokter" value={selectedDoctor?.name || '-'} />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="flex min-w-max gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-10 rounded border px-5 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-slate-300 bg-white text-teal-600 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Pasien</Label>
                <select
                  value={patientId ? String(patientId) : ''}
                  onChange={(e) => setValue('patient_id', Number(e.target.value))}
                  className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-950"
                  disabled={Boolean(presetPatient)}
                  required
                >
                  <option value="">Pilih pasien</option>
                  {patients.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.patient_code} - {p.name}
                    </option>
                  ))}
                </select>
                {errors.patient_id && (
                  <p className="text-xs text-red-600">{errors.patient_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Dokter</Label>
                <select
                  value={doctorId ? String(doctorId) : ''}
                  onChange={(e) => setValue('doctor_id', Number(e.target.value))}
                  className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-600 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  disabled={isDoctorRole}
                  required
                >
                  <option value="">Pilih dokter</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <p className="text-xs text-red-600">{errors.doctor_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="visit_date">Tanggal kunjungan</Label>
                <Input
                  id="visit_date"
                  type="date"
                  className="rounded border-slate-300 bg-white dark:bg-slate-950"
                  {...register('visit_date')}
                />
              </div>
            </div>

            {activeTab === 'anamnesa' && (
              <div className="space-y-5 rounded border border-slate-200 p-5 dark:border-slate-800">
                {showAnamnesaPreview && (
                  <section className="rounded border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20">
                    <h2 className="mb-4 text-lg font-medium">Data Anamnesa dan Pemeriksaan Tersimpan</h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-3">
                        <SummaryRow label="Pemeriksaan" value={anamnesa.pemeriksaan} />
                        <SummaryRow label="Kesadaran" value={anamnesa.kesadaran} />
                        <SummaryRow label="Diagnosis Primer" value={anamnesa.diagnosisPrimer} />
                        <SummaryRow label="Diagnosis Sekunder" value={anamnesa.diagnosisSekunder} />
                        <SummaryRow label="Prognosis" value={anamnesa.prognosis} />
                        <SummaryRow label="Tindakan" value={anamnesa.tindakan} />
                        <SummaryRow label="Rencana Rawat" value={anamnesa.rencanaRawat} />
                      </div>
                      <div className="space-y-3">
                        <SummaryRow label="Denyut Jantung" value={anamnesa.denyutJantung ? `${anamnesa.denyutJantung} per menit` : '-'} />
                        <SummaryRow label="Pernapasan" value={anamnesa.pernapasan ? `${anamnesa.pernapasan} per menit` : '-'} />
                        <SummaryRow label="Tekanan Darah" value={`${anamnesa.sistole || '-'}/${anamnesa.diastole || '-'} mmHg`} />
                        <SummaryRow label="Suhu Tubuh" value={anamnesa.suhu ? `${anamnesa.suhu} C` : '-'} />
                        <SummaryRow label="Tinggi/Berat" value={`${anamnesa.tinggi || '-'} cm / ${anamnesa.berat || '-'} kg`} />
                        <SummaryRow label="Dokumentasi" value={anamnesa.dokumentasi} />
                      </div>
                    </div>
                  </section>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h2 className="text-xl font-medium">Keadaan Umum</h2>
                    <ModalTextarea
                      label="Pemeriksaan"
                      value={anamnesa.pemeriksaan}
                      onChange={(value) => setAnamnesaField('pemeriksaan', value)}
                      placeholder="Keluhan utama dan hasil pemeriksaan awal"
                    />
                    <ModalSelect
                      label="Tingkat Kesadaran"
                      value={anamnesa.kesadaran}
                      onChange={(value) => setAnamnesaField('kesadaran', value)}
                      options={[
                        'Sadar Baik/Alert',
                        'Verbal',
                        'Pain',
                        'Unresponsive',
                      ]}
                    />
                    <Textarea
                      value={anamnesa.dokumentasi}
                      onChange={(e) => setAnamnesaField('dokumentasi', e.target.value)}
                      className="min-h-20 rounded border-slate-300 bg-white dark:bg-slate-950"
                      placeholder="Catatan dokumentasi"
                    />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-medium">Vital Sign</h2>
                    <ModalInput
                      label="Denyut Jantung"
                      value={anamnesa.denyutJantung}
                      onChange={(value) => setAnamnesaField('denyutJantung', value)}
                      suffix="per menit"
                    />
                    <ModalInput
                      label="Pernapasan"
                      value={anamnesa.pernapasan}
                      onChange={(value) => setAnamnesaField('pernapasan', value)}
                      suffix="per menit"
                    />
                    <ModalInput
                      label="Sistole"
                      value={anamnesa.sistole}
                      onChange={(value) => setAnamnesaField('sistole', value)}
                      suffix="mmHg"
                    />
                    <ModalInput
                      label="Diastole"
                      value={anamnesa.diastole}
                      onChange={(value) => setAnamnesaField('diastole', value)}
                      suffix="mmHg"
                    />
                    <ModalInput
                      label="Suhu Tubuh"
                      value={anamnesa.suhu}
                      onChange={(value) => setAnamnesaField('suhu', value)}
                      suffix="C"
                    />
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="space-y-3 rounded border border-slate-200 p-4 dark:border-slate-800">
                    <h2 className="text-lg font-medium">Penilaian (Assesment)</h2>
                    <ModalSelect
                      label="Diagnosis Primer"
                      value={anamnesa.diagnosisPrimer}
                      onChange={(value) => setAnamnesaField('diagnosisPrimer', value)}
                      options={diagnosisOptions}
                    />
                    <ModalSelect
                      label="Diagnosis Sekunder"
                      value={anamnesa.diagnosisSekunder}
                      onChange={(value) => setAnamnesaField('diagnosisSekunder', value)}
                      options={['', ...diagnosisOptions]}
                    />
                    <ModalSelect
                      label="Prognosis"
                      value={anamnesa.prognosis}
                      onChange={(value) => setAnamnesaField('prognosis', value)}
                      options={['', 'Baik', 'Sedang', 'Buruk']}
                    />
                  </section>

                  <section className="space-y-3 rounded border border-slate-200 p-4 dark:border-slate-800">
                    <h2 className="text-lg font-medium">Rencana Perawatan (Plan)</h2>
                    <ModalTextarea
                      label="Tindakan"
                      placeholder="Rencana tindakan"
                      value={anamnesa.tindakan}
                      onChange={(value) => setAnamnesaField('tindakan', value)}
                    />
                    <ModalTextarea
                      label="Rencana Rawat"
                      placeholder="Rencana rawat pasien"
                      value={anamnesa.rencanaRawat}
                      onChange={(value) => setAnamnesaField('rencanaRawat', value)}
                    />
                  </section>
                </div>

                <section className="rounded border border-slate-200 p-4 dark:border-slate-800">
                  <h2 className="mb-3 text-lg font-medium">Pemeriksaan Fisik</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {bodyExamFields.map((field) => (
                      <ModalInput
                        key={field}
                        label={field}
                        value={anamnesa.bodyExam[field] || ''}
                        onChange={(value) => setBodyExam(field, value)}
                      />
                    ))}
                  </div>
                </section>

              </div>
            )}

            {activeTab === 'tindakan' && (
              <div className="grid gap-8 rounded border border-slate-200 p-5 dark:border-slate-800 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="font-bold">Diagnosa</Label>
                      <select
                        value={treatmentDraft.diagnosis}
                        onChange={(e) => applyTreatmentDiagnosis(e.target.value)}
                        className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-950"
                      >
                        {diagnosisOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                        i
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">ICD-X</Label>
                      <Input
                        value={treatmentDraft.icd}
                        onChange={(e) => setTreatmentDraft((prev) => ({ ...prev, icd: e.target.value }))}
                        className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Elemen Gigi</Label>
                      <Input
                        value={treatmentDraft.tooth}
                        onChange={(e) => setTreatmentDraft((prev) => ({ ...prev, tooth: e.target.value }))}
                        className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                        placeholder="Contoh: 11, 12"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="font-bold">Tindakan</Label>
                      <select
                        value={treatmentDraft.treatmentId}
                        onChange={(e) => applyTreatmentDefaults(e.target.value)}
                        className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-950"
                      >
                        <option value="">Pilih Tindakan</option>
                        {treatmentCatalog.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.name} - {formatCurrency(item.price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">ICD-IX CM</Label>
                      <Input
                        value={treatmentDraft.icd9}
                        onChange={(e) => setTreatmentDraft((prev) => ({ ...prev, icd9: e.target.value }))}
                        className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Frekuensi</Label>
                      <Input
                        type="number"
                        min={1}
                        value={treatmentDraft.frequency}
                        onChange={(e) => {
                          const frequency = Math.max(1, Number(e.target.value) || 1);
                          setTreatmentDraft((prev) => ({
                            ...prev,
                            frequency: e.target.value,
                            price: selectedTreatment
                              ? String((Number(selectedTreatment.price) || 0) * frequency)
                              : prev.price,
                          }));
                        }}
                        className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-400 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-bold">Nama Dokter</Label>
                        <select
                          value={doctorId ? String(doctorId) : ''}
                          onChange={(e) => setValue('doctor_id', Number(e.target.value))}
                          className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-600 dark:bg-slate-950 dark:disabled:bg-slate-900"
                          disabled={isDoctorRole}
                        >
                          {doctors.map((d) => (
                            <option key={d.id} value={String(d.id)}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold">Nama Petugas</Label>
                        <select
                          value={treatmentDraft.staff}
                          onChange={(e) => setTreatmentDraft((prev) => ({ ...prev, staff: e.target.value }))}
                          className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-950"
                        >
                          <option value="">Pilih perawat</option>
                          {nurses.map((nurse) => (
                            <option key={nurse.id} value={nurse.name}>
                              {nurse.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr] sm:items-end">
                      <Button
                        type="button"
                        className="h-10 rounded bg-blue-500 px-3 text-sm shadow-none hover:bg-blue-600"
                        onClick={() => toast.info(`Simulasi harga: ${formatCurrency(treatmentPrice)}`)}
                      >
                        Simulasi Harga
                      </Button>
                      <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                        <Label className="font-bold">Tarif:</Label>
                        <Input
                          type="number"
                          min={0}
                          value={treatmentDraft.price}
                          onChange={(e) => setTreatmentDraft((prev) => ({ ...prev, price: e.target.value }))}
                          className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-4">
                      <Button
                        type="button"
                        className="w-28 rounded bg-teal-500 shadow-none hover:bg-teal-600"
                        onClick={saveTreatmentRow}
                      >
                        Lengkapi
                      </Button>
                      <Button
                        type="button"
                        className="w-28 rounded bg-blue-600 shadow-none hover:bg-blue-700"
                        onClick={saveTreatmentRow}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 font-semibold">Review Tindakan</h2>
                  <div className="min-h-[260px] overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
                    <table className="w-full min-w-[360px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900">
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">No.</th>
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">Elemen Gigi</th>
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">Riwayat Tindakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {treatmentRows.map((row, index) => (
                          <tr key={row.id}>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{index + 1}</td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.tooth}</td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <p className="font-semibold">{row.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.doctor} - {row.staff}
                              </p>
                              <p className="text-xs text-muted-foreground">Diagnosa: {row.diagnosis}</p>
                              <p className="text-xs text-muted-foreground">
                                ICD-X: {row.icd} - ICD-IX CM: {row.icd9}
                              </p>
                              <p className="text-xs text-muted-foreground">Tarif: {formatCurrency(row.price)}</p>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border border-slate-200 px-3 py-3 dark:border-slate-800" />
                          <td className="border border-slate-200 px-3 py-3 text-right font-bold dark:border-slate-800">
                            Tarif:
                          </td>
                          <td className="border border-slate-200 px-3 py-3 font-bold dark:border-slate-800">
                            {formatCurrency(treatmentRows.reduce((sum, row) => sum + Number(row.price || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lab' && (
              <TabPanel title="Pemeriksaan Lab.">
                <p className="text-sm text-muted-foreground">Input pemeriksaan lab belum terhubung ke database.</p>
              </TabPanel>
            )}

            {activeTab === 'resep' && (
              <div className="space-y-8">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <tbody>
                      <PrescriptionInfoRow label="Nama Dokter" value={selectedDoctorName} />
                      <PrescriptionInfoRow label="No Izin Praktek" value={selectedDoctor?.sip_number || '0'} />
                      <PrescriptionInfoRow label="Nama Pasien" value={patient?.name || '-'} />
                      <PrescriptionInfoRow
                        label="Umur Pasien"
                        value={patientAge != null ? `${patientAge} Tahun` : '-'}
                      />
                      <PrescriptionInfoRow label="Alamat Pasien" value={patient?.address || '-'} />
                      <PrescriptionInfoRow label="Lokasi Praktek" value={practiceAddress} />
                    </tbody>
                  </table>
                </div>

                <div>
                  <h2 className="mb-3 text-2xl font-medium uppercase">Resep Obat</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-white dark:bg-slate-950">
                          <th className="w-12 border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            No
                          </th>
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            Obat
                          </th>
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            Dosis
                          </th>
                          <th className="w-20 border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            Hari
                          </th>
                          <th className="w-[90px] border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            Total Obat
                          </th>
                          <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                            Instruksi
                          </th>
                          <th className="w-12 border border-slate-200 px-3 py-3 dark:border-slate-800" />
                        </tr>
                      </thead>
                      <tbody>
                        {(prescriptions.length
                          ? prescriptions
                          : [{ medicine_name: '', dosage: '', instruction: '', days: '', total: '' }]
                        ).map((row, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <select
                                value=""
                                onChange={(e) => applyPrescriptionMedicine(idx, e.target.value)}
                                className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm dark:bg-slate-950"
                              >
                                <option value="">--Pilih Obat--</option>
                                {catalog.map((med) => (
                                  <option key={med.id} value={String(med.id)}>
                                    {med.name}
                                  </option>
                                ))}
                              </select>
                              {row.medicine_name && (
                                <Input
                                  value={row.medicine_name}
                                  onChange={(e) => setPrescriptionLine(idx, { medicine_name: e.target.value })}
                                  className="mt-2 h-8 rounded border-slate-300 bg-white dark:bg-slate-950"
                                />
                              )}
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <div className="flex gap-2">
                                <Input
                                  value={row.dose_qty || '1'}
                                  onChange={(e) => setPrescriptionLine(idx, { dose_qty: e.target.value })}
                                  className="h-9 w-12 rounded border-slate-300 bg-white dark:bg-slate-950"
                                />
                                <Input
                                  value={row.dosage || ''}
                                  onChange={(e) => setPrescriptionLine(idx, { dosage: e.target.value })}
                                  className="h-9 rounded border-slate-300 bg-white dark:bg-slate-950"
                                />
                              </div>
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <Input
                                value={row.days || ''}
                                onChange={(e) => setPrescriptionLine(idx, { days: e.target.value })}
                                className="h-9 rounded border-slate-300 bg-white dark:bg-slate-950"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <Input
                                value={row.total || ''}
                                onChange={(e) => setPrescriptionLine(idx, { total: e.target.value })}
                                className="h-9 rounded border-slate-300 bg-white dark:bg-slate-950"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <Textarea
                                value={row.instruction || ''}
                                onChange={(e) => setPrescriptionLine(idx, { instruction: e.target.value })}
                                className="min-h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-800">
                              <Button
                                type="button"
                                size="icon"
                                className="h-8 w-8 rounded bg-blue-500 shadow-none hover:bg-blue-600"
                                onClick={addPrescriptionLine}
                              >
                                +
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'obat' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-medium uppercase">Riwayat Pemberian Obat</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="w-14 border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          NO
                        </th>
                        <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Item Resep
                        </th>
                        <th className="border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Nama Obat Dan Alkes
                        </th>
                        <th className="w-[90px] border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Jumlah
                        </th>
                        <th className="w-[90px] border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Tarif
                        </th>
                        <th className="w-[110px] border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Subtotal
                        </th>
                        <th className="w-[110px] border border-slate-200 px-3 py-3 text-left dark:border-slate-800">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineRows.map((row, idx) => {
                        const subtotal = (Number(row.qty) || 0) * (Number(row.tariff) || 0);
                        return (
                          <tr key={idx}>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-200 px-3 py-3 align-top dark:border-slate-800">
                              <select
                                value={row.item}
                                onChange={(e) => setMedicineRow(idx, { item: e.target.value })}
                                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm dark:bg-slate-950"
                              >
                                <option value="">-Pilih Item Resep-</option>
                                <option value="obat">Obat</option>
                                <option value="alkes">Alkes</option>
                              </select>
                              <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-300">
                                *wajib diisi jika ingin mengirim pemberian obat ke satu sehat
                              </p>
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <select
                                value={row.medicineId}
                                onChange={(e) => applyIssuedMedicine(idx, e.target.value)}
                                className="h-10 w-full rounded border border-slate-300 bg-white px-2 text-sm dark:bg-slate-950"
                              >
                                <option value="">-- Pilih Obat --</option>
                                {catalog.map((med) => (
                                  <option key={med.id} value={String(med.id)}>
                                    {med.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <Input
                                value={row.qty}
                                onChange={(e) => setMedicineRow(idx, { qty: e.target.value })}
                                placeholder="Qty"
                                className="h-10 rounded border-slate-300 bg-white dark:bg-slate-950"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              {formatCurrency(row.tariff || 0)}
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded bg-blue-500 shadow-none hover:bg-blue-600"
                                onClick={addMedicineRow}
                              >
                                + Simpan
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td colSpan={4} className="border border-slate-200 px-3 py-3 dark:border-slate-800" />
                        <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-800">
                          Total
                        </td>
                        <td className="border border-slate-200 px-3 py-3 font-bold dark:border-slate-800">
                          {formatCurrency(medicineTotal)}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'odontogram' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" className="rounded-full bg-teal-500 shadow-none hover:bg-teal-600">
                    Undo
                  </Button>
                  <Button type="button" size="sm" className="rounded-full bg-teal-500 shadow-none hover:bg-teal-600">
                    Redo
                  </Button>
                  <Button type="button" size="sm" className="rounded-full bg-teal-500 shadow-none hover:bg-teal-600">
                    Cetak
                  </Button>
                  <Button type="button" size="sm" className="rounded-full bg-blue-600 shadow-none hover:bg-blue-700">
                    Simpan
                  </Button>
                  <span className="ml-auto rounded bg-red-500 px-3 py-1 text-xs font-bold text-white">
                    Data Tidak Tersimpan
                  </span>
                </div>
                <div className="overflow-x-auto py-4">
                  <div className="min-w-[760px] space-y-7">
                    {ODONTOGRAM_ROWS.map((row) => (
                      <div key={row.key} className="flex justify-center">
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
                          {row.teeth.map((number) => (
                            <div key={number} className="flex flex-col items-center">
                              <div className="grid h-9 w-9 grid-cols-3 grid-rows-3 border border-slate-700 bg-white">
                                <span className="col-span-3 border-b border-slate-700" />
                                <span className="border-r border-slate-700" />
                                <span />
                                <span className="border-l border-slate-700" />
                                <span className="col-span-3 border-t border-slate-700" />
                              </div>
                              <span className="mt-1 text-xs font-bold">{number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold">kdf</p>
                    <div className="mt-2 h-3 w-14 rounded-full bg-amber-300" />
                  </div>
                  <Input className="h-9 w-20 rounded border-slate-300 bg-white dark:bg-slate-950" />
                  <div className="flex flex-wrap gap-2 text-xs text-white">
                    {['non - No Information', 'M.ver - Mesio version', 'eru - Erupting', 'D.ver - Disto version'].map((label) => (
                      <span key={label} className="rounded-full bg-teal-500 px-5 py-1">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {['periochart', 'sefalometri'].includes(activeTab) && (
              <TabPanel title={tabs.find((tab) => tab.id === activeTab)?.label}>
                <p className="text-sm text-muted-foreground">
                  Simpan rekam medis terlebih dahulu, lalu fitur ini dapat dibuka dari detail rekam medis.
                </p>
              </TabPanel>
            )}

            {activeTab === 'anamnesa' && (
              <div className="mt-6">
                <Button
                  type="button"
                  disabled={savingAnamnesa}
                  onClick={() => saveAnamnesa({ closeDialog: false })}
                  className="h-11 w-full rounded bg-teal-500 text-base shadow-none hover:bg-teal-600"
                >
                  {savingAnamnesa ? 'Menyimpan...' : 'Simpan Anamnesa dan Pemeriksaan'}
                </Button>
              </div>
            )}
            {activeTab !== 'anamnesa' && (
              <>
                <p className="mt-8 text-sm italic text-red-500">*Tindakan Belum Disimpan</p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 h-11 w-full rounded bg-blue-500 text-base shadow-none hover:bg-blue-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Rekam Medis'
                  )}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={anamnesaOpen} onOpenChange={setAnamnesaOpen}>
        <DialogContent className="max-w-4xl rounded bg-white p-0 dark:bg-slate-950">
          <DialogHeader className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <DialogTitle className="text-2xl font-medium">Edit Anamnesa</DialogTitle>
          </DialogHeader>

          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 pb-5">
            <section className="space-y-3 py-4">
              <h2 className="text-xl font-medium">Keadaan Umum</h2>
              <div className="grid gap-2">
                <ModalTextarea
                  label="Pemeriksaan"
                  value={anamnesa.pemeriksaan}
                  onChange={(value) => setAnamnesaField('pemeriksaan', value)}
                />
                <ModalSelect
                  label="Tingkat Kesadaran"
                  value={anamnesa.kesadaran}
                  onChange={(value) => setAnamnesaField('kesadaran', value)}
                  options={[
                    'Sadar Baik/Alert',
                    'Respon Suara/Voice',
                    'Respon Nyeri/Pain',
                    'Tidak Sadar/Unresponsive',
                  ]}
                />
              </div>
            </section>

            <section className="space-y-3 py-4">
              <h2 className="text-xl font-medium">Vital Sign</h2>
              <div className="grid gap-2">
                <ModalInput
                  label="Denyut Jantung"
                  placeholder="Denyut Jantung"
                  suffix="per menit"
                  value={anamnesa.denyutJantung}
                  onChange={(value) => setAnamnesaField('denyutJantung', value)}
                />
                <ModalInput
                  label="Pernapasan"
                  placeholder="Pernapasan"
                  suffix="per menit"
                  value={anamnesa.pernapasan}
                  onChange={(value) => setAnamnesaField('pernapasan', value)}
                />
                <ModalInput
                  label="Tekanan Darah Sistole"
                  placeholder="Tekanan Darah Sistole"
                  suffix="per mmHg"
                  value={anamnesa.sistole}
                  onChange={(value) => setAnamnesaField('sistole', value)}
                />
                <ModalInput
                  label="Tekanan Darah Diastole"
                  placeholder="Tekanan Darah Diastole"
                  suffix="per mmHg"
                  value={anamnesa.diastole}
                  onChange={(value) => setAnamnesaField('diastole', value)}
                />
                <ModalInput
                  label="Suhu Tubuh"
                  placeholder="Suhu Tubuh"
                  suffix="C"
                  value={anamnesa.suhu}
                  onChange={(value) => setAnamnesaField('suhu', value)}
                />
                <ModalInput
                  label="Tinggi Badan"
                  placeholder="Tinggi Badan"
                  suffix="cm"
                  value={anamnesa.tinggi}
                  onChange={(value) => setAnamnesaField('tinggi', value)}
                />
                <ModalInput
                  label="Berat Badan"
                  placeholder="Berat Badan"
                  suffix="kg"
                  value={anamnesa.berat}
                  onChange={(value) => setAnamnesaField('berat', value)}
                />

                {bodyExamFields.map((field) => (
                  <ModalInput
                    key={field}
                    label={field}
                    value={anamnesa.bodyExam[field] || ''}
                    onChange={(value) => setBodyExam(field, value)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <span>Dokumentasi</span>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 rounded bg-teal-500 shadow-none hover:bg-teal-600"
                  onClick={() => toast.info('Upload dokumentasi belum tersedia.')}
                >
                  +
                </Button>
              </div>
              <Textarea
                value={anamnesa.dokumentasi}
                onChange={(e) => setAnamnesaField('dokumentasi', e.target.value)}
                className="mt-3 min-h-20 rounded border-slate-300 bg-white dark:bg-slate-950"
                placeholder="Catatan dokumentasi"
              />
            </section>

            <section className="mt-4 rounded border border-slate-200 p-4 dark:border-slate-800">
              <h2 className="mb-3 text-lg font-medium">Penilaian (Assesment)</h2>
              <div className="grid gap-3">
                <ModalSelect
                  label={
                    <>
                      Diagnosis Primer <span className="text-xs font-bold text-red-600">[wajib]</span>
                    </>
                  }
                  value={anamnesa.diagnosisPrimer}
                  onChange={(value) => setAnamnesaField('diagnosisPrimer', value)}
                  options={diagnosisOptions}
                />
                <ModalSelect
                  label="Diagnosis Sekunder"
                  value={anamnesa.diagnosisSekunder}
                  onChange={(value) => setAnamnesaField('diagnosisSekunder', value)}
                  options={['', ...diagnosisOptions]}
                />
                <ModalSelect
                  label="Prognosis"
                  value={anamnesa.prognosis}
                  onChange={(value) => setAnamnesaField('prognosis', value)}
                  options={[
                    '',
                    '-- Pilih Prognosis terhadap Diagnosa Primer --',
                    'Baik',
                    'Sedang',
                    'Buruk',
                  ]}
                />
              </div>
            </section>

            <section className="mt-4 rounded border border-slate-200 p-4 dark:border-slate-800">
              <h2 className="mb-3 text-lg font-medium">Rencana Perawatan (Plan)</h2>
              <div className="grid gap-3">
                <ModalTextarea
                  label="Tindakan"
                  placeholder="Pilih Tindakan"
                  value={anamnesa.tindakan}
                  onChange={(value) => setAnamnesaField('tindakan', value)}
                />
                <ModalTextarea
                  label=""
                  placeholder="Rencana Rawat Pasien"
                  value={anamnesa.rencanaRawat}
                  onChange={(value) => setAnamnesaField('rencanaRawat', value)}
                />
              </div>
            </section>

            <div className="sticky bottom-0 mt-4 flex justify-end border-t border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-950">
              <Button type="button" className="rounded bg-blue-500 shadow-none hover:bg-blue-600" onClick={saveAnamnesa}>
                Simpan Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <>
      <th className="w-[150px] border border-slate-200 px-3 py-2 text-left font-bold dark:border-slate-800">
        {label}
      </th>
      <td className="border border-slate-200 px-3 py-2 dark:border-slate-800">{value}</td>
    </>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="grid grid-cols-[160px_16px_1fr] items-start gap-2 text-sm">
      <span className="font-bold">{label}</span>
      <span>:</span>
      <span>{value || '-'}</span>
    </div>
  );
}

function PrescriptionInfoRow({ label, value }) {
  return (
    <tr>
      <th className="w-[280px] border border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-800">
        {label}
      </th>
      <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
        <Input
          value={value || '-'}
          readOnly
          className="h-9 rounded border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </td>
    </tr>
  );
}

function InlineTextarea({ label, id, register }) {
  return (
    <div className="grid grid-cols-[160px_16px_1fr] items-start gap-2 text-sm">
      <Label htmlFor={id} className="pt-2 font-bold">
        {label}
      </Label>
      <span className="pt-2">:</span>
      <Textarea
        id={id}
        className="min-h-12 rounded border-slate-300 bg-white dark:bg-slate-950"
        {...register}
      />
    </div>
  );
}

function ModalInput({ label, value, onChange, placeholder, suffix }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
      <Label className="font-bold">{label}</Label>
      <div className="flex">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="h-10 rounded-r-none border-slate-300 bg-white dark:bg-slate-950"
        />
        {suffix && (
          <span className="inline-flex min-w-[92px] items-center justify-center rounded-r border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ModalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start">
      <Label className="pt-2 font-bold">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-28 rounded border-slate-300 bg-white dark:bg-slate-950"
      />
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
      <Label className="font-bold">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:bg-slate-950"
      >
        {options.map((option) => (
          <option key={option || 'empty'} value={option}>
            {option || 'Pilih'}
          </option>
        ))}
      </select>
    </div>
  );
}

function TabPanel({ title, children }) {
  return (
    <div className="rounded border border-slate-200 p-5 dark:border-slate-800">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
