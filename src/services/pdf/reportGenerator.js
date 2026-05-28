import { format } from 'date-fns';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getBPStatus } from '../../constants/theme';

const STATUS_COLORS = {
  normal:   '#4CAF93',
  elevated: '#F5A623',
  high:     '#E74C3C',
  crisis:   '#8B0000',
};

// ─── Bilingual labels ─────────────────────────────────────────────────────────
const LABELS = {
  en: {
    reportTitle:    'Blood Pressure Report',
    period:         'Period',
    generated:      'Generated',
    summary:        'Summary',
    averageBP:      'Average BP',
    highestReading: 'Highest Reading',
    lowestReading:  'Lowest Reading',
    averagePulse:   'Average Pulse',
    bpTrend:        'Blood Pressure Trend',
    systolic:       'Systolic',
    diastolic:      'Diastolic',
    normalLimit:    'Normal limit (120 mmHg)',
    highLimit:      'High limit (140 mmHg) — seek care above this',
    allReadings:    'All Readings',
    dateTime:       'Date & Time',
    status:         'Status',
    pulse:          'Pulse',
    notes:          'Notes',
    medications:    'Medications',
    noMeds:         'No active medications recorded.',
    healthRecs:     'Health Recommendations',
    normal:         'Normal',
    elevated:       'Elevated',
    high:           'High',
    crisis:         'Crisis',
    total:          'Total',
    readings:       'readings',
    freq: ['As needed', 'Once daily', 'Twice daily', 'Three times daily', 'Four times daily'],
    disclaimer: 'This report is for informational purposes only and does not replace professional medical advice. Always consult your healthcare provider before making any medical decisions.',
  },
  es: {
    reportTitle:    'Informe de Presión Arterial',
    period:         'Período',
    generated:      'Generado',
    summary:        'Resumen',
    averageBP:      'PA Promedio',
    highestReading: 'Lectura Más Alta',
    lowestReading:  'Lectura Más Baja',
    averagePulse:   'Pulso Promedio',
    bpTrend:        'Tendencia de Presión Arterial',
    systolic:       'Sistólica',
    diastolic:      'Diastólica',
    normalLimit:    'Límite normal (120 mmHg)',
    highLimit:      'Límite alto (140 mmHg) — buscar atención médica',
    allReadings:    'Todas las Lecturas',
    dateTime:       'Fecha y Hora',
    status:         'Estado',
    pulse:          'Pulso',
    notes:          'Notas',
    medications:    'Medicamentos',
    noMeds:         'No hay medicamentos activos registrados.',
    healthRecs:     'Recomendaciones de Salud',
    normal:         'Normal',
    elevated:       'Elevada',
    high:           'Alta',
    crisis:         'Crisis',
    total:          'Total',
    readings:       'lecturas',
    freq: ['Según sea necesario', 'Una vez al día', 'Dos veces al día', 'Tres veces al día', 'Cuatro veces al día'],
    disclaimer: 'Este informe es solo para fines informativos y no reemplaza el consejo médico profesional. Siempre consulte a su proveedor de atención médica antes de tomar decisiones médicas.',
  },
};

const sampleData = (arr, max = 20) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

// ─── SVG chart generator ──────────────────────────────────────────────────────
const generateSVGChart = (readings, L) => {
  if (!readings || readings.length < 2) {
    return `<p style="color:#aaa;font-size:13px;text-align:center;padding:20px">${L.allReadings}: N/A</p>`;
  }

  const sorted  = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sampled = sampleData(sorted, 20);
  const n = sampled.length;

  const W = 680, H = 240;
  const pad = { t: 24, r: 70, b: 50, l: 48 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  const allVals = sampled.flatMap(r => [r.systolic, r.diastolic, 120, 140]);
  const maxV = Math.max(...allVals) + 8;
  const minV = Math.max(40, Math.min(...sampled.flatMap(r => [r.systolic, r.diastolic])) - 10);
  const range = maxV - minV;

  const px = i => (pad.l + (n > 1 ? (i / (n - 1)) * iW : iW / 2)).toFixed(1);
  const py = v => (pad.t + iH - ((v - minV) / range) * iH).toFixed(1);

  const sysPath = sampled.map((r, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(r.systolic)}`).join(' ');
  const diaPath = sampled.map((r, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(r.diastolic)}`).join(' ');

  const t120 = parseFloat(py(120));
  const t140 = parseFloat(py(140));
  const show120 = t120 >= pad.t && t120 <= pad.t + iH;
  const show140 = t140 >= pad.t && t140 <= pad.t + iH;

  const labelStep = Math.max(1, Math.ceil(n / 6));

  const dots = sampled.map((r, i) => {
    const s = getBPStatus(r.systolic, r.diastolic);
    const c = STATUS_COLORS[s] || '#4CAF93';
    return `<circle cx="${px(i)}" cy="${py(r.systolic)}" r="4.5" fill="${c}" stroke="#fff" stroke-width="1"/>` +
           `<circle cx="${px(i)}" cy="${py(r.diastolic)}" r="3.5" fill="#5BA4CF" stroke="#fff" stroke-width="1"/>`;
  }).join('');

  const xLabels = sampled.map((r, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${px(i)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#777" font-family="Arial">${format(new Date(r.timestamp), 'M/d')}</text>`;
  }).join('');

  const yValues = [minV, Math.round((minV + maxV) / 2), maxV];
  const yLabels = yValues.map(v =>
    `<text x="${pad.l - 6}" y="${py(v)}" font-size="10" text-anchor="end" fill="#777" font-family="Arial" dominant-baseline="middle">${v}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%;display:block">
  <rect width="${W}" height="${H}" fill="#f9fbf9" rx="10"/>
  ${show120 ? `
  <line x1="${pad.l}" y1="${t120}" x2="${W - pad.r}" y2="${t120}" stroke="#4CAF93" stroke-width="2" stroke-dasharray="8 4" opacity="0.9"/>
  <text x="${W - pad.r + 6}" y="${t120 + 4}" font-size="11" fill="#4CAF93" font-weight="bold" font-family="Arial">120</text>` : ''}
  ${show140 ? `
  <line x1="${pad.l}" y1="${t140}" x2="${W - pad.r}" y2="${t140}" stroke="#E74C3C" stroke-width="2.5" stroke-dasharray="8 4" opacity="0.9"/>
  <text x="${W - pad.r + 6}" y="${t140 + 4}" font-size="11" fill="#E74C3C" font-weight="bold" font-family="Arial">140</text>` : ''}
  <path d="${diaPath}" fill="none" stroke="#5BA4CF" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${sysPath}" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linejoin="round"/>
  ${dots}
  ${xLabels}
  ${yLabels}
</svg>`;
};

// ─── HTML report builder ──────────────────────────────────────────────────────
const buildHTML = ({ readings, stats, medications = [], recommendations = [], profile, dateRange, language = 'en' }) => {
  const L = LABELS[language] || LABELS.en;
  const statusLabels = { normal: L.normal, elevated: L.elevated, high: L.high, crisis: L.crisis };

  const sorted      = [...readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const patientName = profile?.name || profile?.displayName || 'Patient';
  const startStr    = format(dateRange.start, 'MMM d, yyyy');
  const endStr      = format(dateRange.end,   'MMM d, yyyy');
  const generated   = format(new Date(), 'MMM d, yyyy h:mm a');

  const counts = { normal: 0, elevated: 0, high: 0, crisis: 0 };
  readings.forEach(r => { const s = getBPStatus(r.systolic, r.diastolic); counts[s]++; });

  const activeMeds = medications.filter(m => m.active);

  const rows = sorted.map(r => {
    const s   = getBPStatus(r.systolic, r.diastolic);
    const col = STATUS_COLORS[s];
    return `<tr>
      <td>${format(new Date(r.timestamp), 'MMM d, yyyy · h:mm a')}</td>
      <td style="color:${col};font-weight:bold">${r.systolic}</td>
      <td style="color:#5BA4CF;font-weight:bold">${r.diastolic}</td>
      <td>${r.pulse ? r.pulse + ' bpm' : '–'}</td>
      <td><span style="color:${col};font-weight:bold">${statusLabels[s]}</span></td>
      <td style="color:#666">${r.notes || '–'}</td>
    </tr>`;
  }).join('');

  const medItems = activeMeds.length
    ? activeMeds.map(m => `<div class="med-item">
        <span class="med-name">${m.name}</span>
        <span class="med-detail"> — ${m.dosage} · ${L.freq[m.frequency] || L.freq[1]}</span>
        ${m.doctorNotes ? `<div class="med-detail" style="margin-top:2px">📋 ${m.doctorNotes}</div>` : ''}
      </div>`).join('')
    : `<p style="color:#999">${L.noMeds}</p>`;

  const recItems = recommendations.filter(r => r.category !== 'disclaimer').slice(0, 6).map(r =>
    `<div class="rec-item">
      <strong>${(r.category || 'General').charAt(0).toUpperCase() + (r.category || 'general').slice(1)}:</strong>
      ${r.text || ''}
    </div>`
  ).join('');

  const avgPulseArr = readings.filter(r => r.pulse > 0);
  const avgPulse    = avgPulseArr.length
    ? Math.round(avgPulseArr.reduce((s, r) => s + r.pulse, 0) / avgPulseArr.length)
    : null;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; color:#1A2E25; background:#fff; padding:32px; font-size:13px; line-height:1.6; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #4CAF93; padding-bottom:18px; margin-bottom:26px; }
  .logo { font-size:28px; font-weight:bold; color:#4CAF93; }
  .logo-sub { font-size:13px; color:#666; margin-top:4px; }
  .meta { text-align:right; color:#666; font-size:12px; }
  .meta-name { color:#1A2E25; font-size:15px; font-weight:bold; margin-bottom:4px; }
  h2 { font-size:16px; color:#4CAF93; border-bottom:2px solid #e2ede8; padding-bottom:6px; margin:28px 0 14px; }
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px; }
  .stat-box { background:#f7faf8; border-radius:8px; padding:14px; text-align:center; border-top:4px solid #4CAF93; }
  .stat-box.red  { border-top-color:#E74C3C; }
  .stat-box.blue { border-top-color:#5BA4CF; }
  .stat-box.pink { border-top-color:#F4A7B9; }
  .stat-value { font-size:20px; font-weight:bold; color:#1A2E25; }
  .stat-unit  { font-size:11px; color:#aaa; }
  .stat-label { font-size:11px; color:#666; margin-top:3px; }
  .status-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
  .chip { padding:5px 14px; border-radius:20px; font-size:12px; font-weight:bold; }
  .chip-normal   { background:#E8F5EF; color:#4CAF93; }
  .chip-elevated { background:#FEF6E7; color:#F5A623; }
  .chip-high     { background:#FDECEA; color:#E74C3C; }
  .chip-crisis   { background:#FFE8E8; color:#8B0000; }
  .chip-total    { background:#f0f0f0; color:#666; }
  .chart-wrap { background:#f9fbf9; border-radius:10px; padding:16px; margin-bottom:8px; }
  .chart-legend { display:flex; gap:18px; font-size:11px; margin-top:10px; flex-wrap:wrap; }
  .legend-line { display:inline-block; width:20px; height:3px; margin-right:5px; vertical-align:middle; }
  .threshold-note { background:#FFF8E7; border-left:4px solid #F5A623; padding:10px 14px; border-radius:4px; font-size:12px; color:#666; margin-top:10px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
  th { background:#4CAF93; color:#fff; padding:9px 8px; text-align:left; font-weight:600; }
  td { padding:7px 8px; border-bottom:1px solid #f0f5f2; vertical-align:top; }
  tr:nth-child(even) td { background:#fafcfb; }
  .med-item { padding:8px 0; border-bottom:1px solid #f0f5f2; }
  .med-name   { font-weight:bold; color:#1A2E25; }
  .med-detail { color:#666; font-size:11px; }
  .rec-item { padding:8px 0; border-bottom:1px solid #f0f5f2; font-size:12px; }
  .footer { margin-top:36px; padding:14px; background:#fff8e7; border-radius:8px; font-size:11px; color:#888; text-align:center; line-height:1.7; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">♥ VitaInes</div>
    <div class="logo-sub">${L.reportTitle}</div>
  </div>
  <div class="meta">
    <div class="meta-name">${patientName}</div>
    ${L.period}: ${startStr} – ${endStr}<br>
    ${L.generated}: ${generated}
  </div>
</div>

<h2>${L.summary}</h2>
<div class="stats-grid">
  <div class="stat-box">
    <div class="stat-value">${stats.avgSystolic}/${stats.avgDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">${L.averageBP}</div>
  </div>
  <div class="stat-box red">
    <div class="stat-value">${stats.maxSystolic}/${stats.maxDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">${L.highestReading}</div>
  </div>
  <div class="stat-box blue">
    <div class="stat-value">${stats.minSystolic}/${stats.minDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">${L.lowestReading}</div>
  </div>
  <div class="stat-box pink">
    <div class="stat-value">${avgPulse ? avgPulse + ' bpm' : '–'}</div>
    <div class="stat-unit">&nbsp;</div>
    <div class="stat-label">${L.averagePulse}</div>
  </div>
</div>

<div class="status-row">
  <span class="chip chip-normal">✅ ${L.normal}: ${counts.normal}</span>
  <span class="chip chip-elevated">⚠️ ${L.elevated}: ${counts.elevated}</span>
  <span class="chip chip-high">🔴 ${L.high}: ${counts.high}</span>
  <span class="chip chip-crisis">🚨 ${L.crisis}: ${counts.crisis}</span>
  <span class="chip chip-total">${L.total}: ${readings.length} ${L.readings}</span>
</div>

<h2>📈 ${L.bpTrend}</h2>
<div class="chart-wrap">
  ${generateSVGChart(readings, L)}
  <div class="chart-legend">
    <span><span class="legend-line" style="background:#E74C3C"></span>${L.systolic}</span>
    <span><span class="legend-line" style="background:#5BA4CF"></span>${L.diastolic}</span>
    <span><span class="legend-line" style="background:#4CAF93"></span>${L.normalLimit}</span>
    <span><span class="legend-line" style="background:#E74C3C"></span>${L.highLimit}</span>
  </div>
  <div class="threshold-note">⚠️ ${L.highLimit}</div>
</div>

<h2>${L.allReadings} (${sorted.length})</h2>
<table>
  <thead>
    <tr>
      <th>${L.dateTime}</th>
      <th>${L.systolic}</th>
      <th>${L.diastolic}</th>
      <th>${L.pulse}</th>
      <th>${L.status}</th>
      <th>${L.notes}</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<h2>💊 ${L.medications}</h2>
${medItems}

${recItems ? `<h2>✨ ${L.healthRecs}</h2>${recItems}` : ''}

<div class="footer">
  ⚠️ ${L.disclaimer}<br>
  VitaInes · ${generated}
</div>

</body>
</html>`;
};

// ─── Public export function ───────────────────────────────────────────────────
export const exportPDFReport = async (opts) => {
  const html = buildHTML(opts);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: opts.language === 'es' ? 'Compartir Informe' : 'Share Blood Pressure Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
};
