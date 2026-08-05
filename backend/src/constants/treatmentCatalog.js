function inferIcd9Cm(name) {
  const text = name.toLowerCase();
  if (text.includes('rontgen')) return '87.12';
  if (text.includes('scaling') || text.includes('dental spa')) return '96.54';
  if (text.includes('gingivectomy') || text.includes('operculectomy')) return '24.31';
  if (text.includes('hecting') || text.includes('jahit') || text.includes('splinting')) return '24.32';
  if (text.includes('odontektomi') || text.includes('penyulit')) return '23.19';
  if (text.includes('pencabutan')) return '23.09';
  if (text.includes('exo topikal')) return '23.01';
  if (text.includes('perawatan saluran akar') || text.includes('psa') || text.includes('obturasi')) {
    return '23.70';
  }
  if (text.includes('tambal') || text.includes('tambalan') || text.includes('bap gigi')) return '23.2';
  if (text.includes('crown')) return '23.41';
  if (text.includes('bridge')) return '23.42';
  if (text.includes('gigi tiruan') || text.includes('plat gigi tiruan')) return '23.43';
  if (text.includes('behel') || text.includes('breket') || text.includes('retainer')) return '24.7';
  if (text.includes('pindah kontrol') || text.includes('ganti kawat')) return '24.8';
  if (text.includes('cetak')) return '24.19';
  if (text.includes('bongkar')) return '23.49';
  if (text.includes('veneer') || text.includes('pasak') || text.includes('pin fiber')) return '23.49';
  return '';
}

const rawTreatmentCatalog = [
  { name: 'Konservasi Gigi - Pulp capping/GIC lining + TS cavit', price: 150000 },
  { name: 'Konservasi Gigi - Tambalan komposit kecil', price: 300000 },
  { name: 'Konservasi Gigi - Tambalan komposit besar', price: 400000 },
  { name: 'Konservasi Gigi - Perawatan saluran akar anterior', price: 1500000 },
  { name: 'Konservasi Gigi - PSA gigi anterior per kunjungan', price: 250000 },
  { name: 'Konservasi Gigi - Perawatan saluran akar posterior', price: 1800000 },
  { name: 'Konservasi Gigi - PSA gigi posterior per kunjungan', price: 300000 },
  { name: 'Konservasi Gigi - Devitek', price: 150000 },
  { name: 'Konservasi Gigi - Dressing', price: 150000 },
  { name: 'Konservasi Gigi - BAP gigi', price: 400000 },
  { name: 'Konservasi Gigi - Obturasi gigi', price: 400000 },
  { name: 'Konservasi Gigi - Veneer komposit sederhana', price: 500000 },
  { name: 'Konservasi Gigi - Veneer komposit kompleks', price: 800000 },
  { name: 'Konservasi Gigi - Pasak/pin fiber biasa', price: 600000 },
  { name: 'Konservasi Gigi - Pasak/pin fiber premium', price: 850000 },
  { name: 'Konservasi Gigi - Bleaching', price: 2500000 },
  { name: 'Konservasi Gigi - Rontgen periapikal per gigi', price: 100000 },

  { name: 'Perawatan Gigi Anak - Aplikasi topikal flour', price: 200000 },
  { name: 'Perawatan Gigi Anak - Pulpotomi anak', price: 200000 },
  { name: 'Perawatan Gigi Anak - BAP/trepanasi', price: 150000 },
  { name: 'Perawatan Gigi Anak - Devitec', price: 150000 },
  { name: 'Perawatan Gigi Anak - Dressing/medical', price: 150000 },
  { name: 'Perawatan Gigi Anak - Scaling gigi anak', price: 150000 },
  { name: 'Perawatan Gigi Anak - Tambalan sementara gigi anak', price: 150000 },
  { name: 'Perawatan Gigi Anak - Exo topikal tanpa penyulit', price: 150000 },
  { name: 'Perawatan Gigi Anak - Exo topikal dengan penyulit', price: 200000 },
  { name: 'Perawatan Gigi Anak - Injeksi tanpa penyulit', price: 250000 },
  { name: 'Perawatan Gigi Anak - Injeksi dengan penyulit', price: 300000 },
  { name: 'Perawatan Gigi Anak - Tambal GIC', price: 250000 },
  { name: 'Perawatan Gigi Anak - Tambal gigi komposit', price: 300000 },

  { name: 'Tindakan Orthodonsia - Behel cekat standar', price: 4500000 },
  { name: 'Tindakan Orthodonsia - Behel cekat USA', price: 6000000 },
  { name: 'Tindakan Orthodonsia - Behel cekat keramik', price: 6500000 },
  { name: 'Tindakan Orthodonsia - Behel cekat self ligating', price: 8000000 },
  { name: 'Tindakan Orthodonsia - Retainer/night guard per rahang', price: 600000 },
  { name: 'Tindakan Orthodonsia - Penjepit gigitan', price: 150000 },
  { name: 'Tindakan Orthodonsia - Breket lepas metal', price: 50000 },
  { name: 'Tindakan Orthodonsia - Breket hilang metal', price: 70000 },
  { name: 'Tindakan Orthodonsia - Breket lepas keramik', price: 50000 },
  { name: 'Tindakan Orthodonsia - Breket hilang keramik', price: 200000 },
  { name: 'Tindakan Orthodonsia - Ganti kawat per rahang', price: 50000 },
  { name: 'Tindakan Orthodonsia - Pindah kontrol', price: 600000 },
  { name: 'Tindakan Orthodonsia - Lepas behel/debanding', price: 500000 },

  { name: 'Tindakan Prostodonti - Crown/bridge PFM', price: 2500000 },
  { name: 'Tindakan Prostodonti - Crown/bridge/veneer emax', price: 3800000 },
  { name: 'Tindakan Prostodonti - Crown/bridge/veneer zirconia', price: 3600000 },
  { name: 'Tindakan Prostodonti - Gigi tiruan lengkap akrilik RA dan RB', price: 5500000 },
  { name: 'Tindakan Prostodonti - Gigi tiruan lengkap akrilik RA/RB', price: 3200000 },
  { name: 'Tindakan Prostodonti - Gigi tiruan lengkap thermosen RA dan RB', price: 7000000 },
  { name: 'Tindakan Prostodonti - Gigi tiruan lengkap thermosen RA/RB', price: 5000000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 1 unilateral', price: 500000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 1 bilateral', price: 800000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 2 unilateral', price: 1300000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan akrilik tipe 2 bilateral', price: 1500000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan thermosen unilateral', price: 500000 },
  { name: 'Tindakan Prostodonti - Plat gigi tiruan bahan thermosen bilateral', price: 1600000 },
  { name: 'Tindakan Prostodonti - Setiap pergigi tiruan valplast/thermosen', price: 200000 },
  { name: 'Tindakan Prostodonti - Setiap pergigi tiruan akrilik', price: 200000 },
  { name: 'Tindakan Prostodonti - Cetak alginate', price: 150000 },
  { name: 'Tindakan Prostodonti - Cetak double impression', price: 300000 },
  { name: 'Tindakan Prostodonti - Bongkar crown', price: 350000 },
  { name: 'Tindakan Prostodonti - Crown sementara', price: 350000 },

  { name: 'Tindakan Bedah Mulut - Pencabutan gigi anterior sederhana', price: 250000 },
  { name: 'Tindakan Bedah Mulut - Pencabutan gigi anterior kompleks', price: 300000 },
  { name: 'Tindakan Bedah Mulut - Pencabutan gigi posterior sederhana', price: 350000 },
  { name: 'Tindakan Bedah Mulut - Pencabutan gigi posterior kompleks', price: 450000 },
  { name: 'Tindakan Bedah Mulut - Pencabutan gigi dengan penyulit', price: 500000 },
  { name: 'Tindakan Bedah Mulut - Odontektomi RA ringan', price: 550000 },
  { name: 'Tindakan Bedah Mulut - Odontektomi RA berat', price: 1000000 },
  { name: 'Tindakan Bedah Mulut - Odontektomi RB ringan', price: 1500000 },
  { name: 'Tindakan Bedah Mulut - Odontektomi RB berat', price: 3000000 },
  { name: 'Tindakan Bedah Mulut - Operculectomy', price: 500000 },
  { name: 'Tindakan Bedah Mulut - Perawatan dry socket', price: 200000 },
  { name: 'Tindakan Bedah Mulut - Control buka jahitan', price: 100000 },
  { name: 'Tindakan Bedah Mulut - Hecting/jahit', price: 150000 },

  { name: 'Tindakan Periodonsia - Scaling RA/RB sedikit', price: 300000 },
  { name: 'Tindakan Periodonsia - Scaling RA/RB banyak', price: 500000 },
  { name: 'Tindakan Periodonsia - Gingivectomy per gigi', price: 200000 },
  { name: 'Tindakan Periodonsia - Occlusal adjustment/grinding per gigi', price: 100000 },
  { name: 'Tindakan Periodonsia - Dental spa', price: 500000 },
  { name: 'Tindakan Periodonsia - Splinting kawat per gigi', price: 150000 },
  { name: 'Tindakan Periodonsia - Splinting fiber per gigi', price: 250000 },
];

export const treatmentCatalog = rawTreatmentCatalog.map((item) => ({
  ...item,
  icd9_code: item.icd9_code || inferIcd9Cm(item.name),
}));
