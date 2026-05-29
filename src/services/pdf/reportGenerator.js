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
    patient:        'Patient',
    period:         'Report Period',
    generated:      'Generated',
    summary:        'Summary',
    totalReadings:  'Total Readings',
    averageBP:      'Average BP',
    highestBP:      'Highest Reading',
    lowestBP:       'Lowest Reading',
    averagePulse:   'Average Pulse',
    bpTrend:        'Blood Pressure Trend',
    pulseTrend:     'Pulse Trend',
    systolic:       'Systolic',
    diastolic:      'Diastolic',
    pulseLabel:     'Pulse',
    normalLine:     'Normal Limit: 120 mmHg',
    highLine:       'High Alert: 140 mmHg — seek care above this',
    pulseLimit:     'Elevated Limit: 100 bpm',
    allReadings:    'All Readings',
    dateTime:       'Date & Time',
    status:         'Status',
    notes:          'Notes',
    medications:    'Medications',
    dosage:         'Dosage',
    frequency:      'Frequency',
    noMeds:         'No active medications recorded.',
    healthRecs:     'Health Recommendations',
    normal:         'Normal',
    elevated:       'Elevated',
    high:           'High',
    crisis:         'Crisis — See Doctor',
    bpm:            'bpm',
    noData:         'Not enough data to display chart (need at least 2 readings)',
    freqLabels:     ['As needed', 'Once daily', 'Twice daily', 'Three times daily', 'Four times daily'],
    disclaimer:     'This report is for informational purposes only and does not replace professional medical advice. Always consult your healthcare provider before making any medical decisions.',
  },
  es: {
    reportTitle:    'Informe de Presión Arterial',
    patient:        'Paciente',
    period:         'Período del Informe',
    generated:      'Generado',
    summary:        'Resumen',
    totalReadings:  'Total de Lecturas',
    averageBP:      'PA Promedio',
    highestBP:      'Lectura Más Alta',
    lowestBP:       'Lectura Más Baja',
    averagePulse:   'Pulso Promedio',
    bpTrend:        'Tendencia de Presión Arterial',
    pulseTrend:     'Tendencia de Pulso',
    systolic:       'Sistólica',
    diastolic:      'Diastólica',
    pulseLabel:     'Pulso',
    normalLine:     'Límite Normal: 120 mmHg',
    highLine:       'Alerta Alta: 140 mmHg — buscar atención médica',
    pulseLimit:     'Límite Elevado: 100 lpm',
    allReadings:    'Todas las Lecturas',
    dateTime:       'Fecha y Hora',
    status:         'Estado',
    notes:          'Notas',
    medications:    'Medicamentos',
    dosage:         'Dosis',
    frequency:      'Frecuencia',
    noMeds:         'No hay medicamentos activos registrados.',
    healthRecs:     'Recomendaciones de Salud',
    normal:         'Normal',
    elevated:       'Elevada',
    high:           'Alta',
    crisis:         'Crisis — Consultar Médico',
    bpm:            'lpm',
    noData:         'Datos insuficientes para mostrar el gráfico (se necesitan al menos 2 lecturas)',
    freqLabels:     ['Según sea necesario', 'Una vez al día', 'Dos veces al día', 'Tres veces al día', 'Cuatro veces al día'],
    disclaimer:     'Este informe es solo para fines informativos y no reemplaza el consejo médico profesional. Siempre consulte a su proveedor de atención médica antes de tomar decisiones médicas.',
  },
};

const statusLabel = (status, L) =>
  ({ normal: L.normal, elevated: L.elevated, high: L.high, crisis: L.crisis })[status] || status;

const sampleDown = (arr, max = 24) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

// ─── SVG: Blood Pressure chart ────────────────────────────────────────────────
const buildBPChart = (readings, L) => {
  const sorted   = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sampled  = sampleDown(sorted, 24);
  const n        = sampled.length;

  if (n < 2) {
    return `<div style="padding:28px;text-align:center;color:#aaa;font-style:italic;font-size:12px;">${L.noData}</div>`;
  }

  const W = 700, H = 260;
  const pl = 52, pr = 64, pt = 18, pb = 48;
  const iW = W - pl - pr;
  const iH = H - pt - pb;

  const allV  = sampled.flatMap(r => [r.systolic, r.diastolic]);
  const maxV  = Math.max(...allV, 150) + 12;
  const minV  = Math.max(40, Math.min(...allV) - 12);
  const range = maxV - minV || 1;

  const px = i => (pl + (n > 1 ? (i / (n - 1)) * iW : iW / 2)).toFixed(1);
  const py = v => (pt + iH - ((v - minV) / range) * iH).toFixed(1);

  const sysPoints = sampled.map((r, i) => `${px(i)},${py(r.systolic)}`).join(' ');
  const diaPoints = sampled.map((r, i) => `${px(i)},${py(r.diastolic)}`).join(' ');

  const y120 = parseFloat(py(120));
  const y140 = parseFloat(py(140));
  const show120 = y120 >= pt && y120 <= pt + iH;
  const show140 = y140 >= pt && y140 <= pt + iH;

  const labelStep = Math.max(1, Math.ceil(n / 7));
  const xLabels   = sampled.map((r, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${px(i)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#888" font-family="Arial,sans-serif">${format(new Date(r.timestamp), 'M/d')}</text>`;
  }).join('');

  const yGrid = Array.from({ length: 6 }, (_, i) => {
    const v = minV + (range * i) / 5;
    const y = parseFloat(py(v)).toFixed(1);
    return `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="#e8eeeb" stroke-width="1"/>` +
           `<text x="${pl - 6}" y="${y}" font-size="10" text-anchor="end" fill="#888" font-family="Arial,sans-serif" dominant-baseline="middle">${Math.round(v)}</text>`;
  }).join('');

  const dots = sampled.map((r, i) => {
    const c = STATUS_COLORS[getBPStatus(r.systolic, r.diastolic)] || '#4CAF93';
    return `<circle cx="${px(i)}" cy="${py(r.systolic)}" r="4" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:block;max-width:100%;">
  <rect width="${W}" height="${H}" fill="#f9fbf9" rx="8"/>
  ${yGrid}
  ${show140 ? `<line x1="${pl}" y1="${y140.toFixed(1)}" x2="${W - pr}" y2="${y140.toFixed(1)}" stroke="#E74C3C" stroke-width="2.5" stroke-dasharray="8,4" opacity="0.95"/>
  <text x="${W - pr + 5}" y="${y140.toFixed(1)}" font-size="11" fill="#E74C3C" font-weight="bold" font-family="Arial,sans-serif" dominant-baseline="middle">140</text>` : ''}
  ${show120 ? `<line x1="${pl}" y1="${y120.toFixed(1)}" x2="${W - pr}" y2="${y120.toFixed(1)}" stroke="#4CAF93" stroke-width="2" stroke-dasharray="6,3" opacity="0.85"/>
  <text x="${W - pr + 5}" y="${y120.toFixed(1)}" font-size="11" fill="#4CAF93" font-weight="bold" font-family="Arial,sans-serif" dominant-baseline="middle">120</text>` : ''}
  <polyline points="${diaPoints}" fill="none" stroke="#5BA4CF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline points="${sysPoints}" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}
  ${xLabels}
</svg>`;
};

// ─── SVG: Pulse chart ─────────────────────────────────────────────────────────
const buildPulseChart = (readings, L) => {
  const withPulse = readings.filter(r => r.pulse > 0);
  const sorted    = [...withPulse].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sampled   = sampleDown(sorted, 24);
  const n         = sampled.length;

  if (n < 2) {
    return `<div style="padding:28px;text-align:center;color:#aaa;font-style:italic;font-size:12px;">${L.noData}</div>`;
  }

  const W = 700, H = 210;
  const pl = 52, pr = 64, pt = 18, pb = 48;
  const iW = W - pl - pr;
  const iH = H - pt - pb;

  const pulses = sampled.map(r => r.pulse);
  const maxV   = Math.max(...pulses, 110) + 12;
  const minV   = Math.max(40, Math.min(...pulses) - 12);
  const range  = maxV - minV || 1;

  const px = i => (pl + (n > 1 ? (i / (n - 1)) * iW : iW / 2)).toFixed(1);
  const py = v => (pt + iH - ((v - minV) / range) * iH).toFixed(1);

  const points = sampled.map((r, i) => `${px(i)},${py(r.pulse)}`).join(' ');
  const y100   = parseFloat(py(100));
  const show100 = y100 >= pt && y100 <= pt + iH;

  const labelStep = Math.max(1, Math.ceil(n / 7));
  const xLabels   = sampled.map((r, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${px(i)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#888" font-family="Arial,sans-serif">${format(new Date(r.timestamp), 'M/d')}</text>`;
  }).join('');

  const yGrid = Array.from({ length: 5 }, (_, i) => {
    const v = minV + (range * i) / 4;
    const y = parseFloat(py(v)).toFixed(1);
    return `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="#ede8f0" stroke-width="1"/>` +
           `<text x="${pl - 6}" y="${y}" font-size="10" text-anchor="end" fill="#888" font-family="Arial,sans-serif" dominant-baseline="middle">${Math.round(v)}</text>`;
  }).join('');

  const dots = sampled.map((r, i) =>
    `<circle cx="${px(i)}" cy="${py(r.pulse)}" r="4" fill="#F4A7B9" stroke="#fff" stroke-width="1.5"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:block;max-width:100%;">
  <rect width="${W}" height="${H}" fill="#fff9fb" rx="8"/>
  ${yGrid}
  ${show100 ? `<line x1="${pl}" y1="${y100.toFixed(1)}" x2="${W - pr}" y2="${y100.toFixed(1)}" stroke="#E74C3C" stroke-width="2" stroke-dasharray="7,3" opacity="0.9"/>
  <text x="${W - pr + 5}" y="${y100.toFixed(1)}" font-size="11" fill="#E74C3C" font-weight="bold" font-family="Arial,sans-serif" dominant-baseline="middle">100</text>` : ''}
  <polyline points="${points}" fill="none" stroke="#F4A7B9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}
  ${xLabels}
</svg>`;
};

// ─── HTML report builder ──────────────────────────────────────────────────────
const buildHTML = ({ readings, stats, medications = [], recommendations = [], profile, dateRange, language = 'en' }) => {
  const L = LABELS[language] || LABELS.en;

  const sorted      = [...readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const patientName = profile?.name || profile?.displayName || '—';
  const startStr    = format(dateRange.start, 'MMMM d, yyyy');
  const endStr      = format(dateRange.end, 'MMMM d, yyyy');
  const generated   = format(new Date(), 'MMMM d, yyyy · h:mm a');

  const counts = { normal: 0, elevated: 0, high: 0, crisis: 0 };
  readings.forEach(r => { counts[getBPStatus(r.systolic, r.diastolic)]++; });

  const pulseArr = readings.filter(r => r.pulse > 0);
  const avgPulse = pulseArr.length
    ? Math.round(pulseArr.reduce((s, r) => s + r.pulse, 0) / pulseArr.length)
    : null;

  const activeMeds = medications.filter(m => m.active !== false);
  const hasPulseChart = pulseArr.length >= 2;

  // ── Reading rows (all readings, not sampled) ────────────────────────────────
  const readingRows = sorted.map((r, idx) => {
    const s  = getBPStatus(r.systolic, r.diastolic);
    const c  = STATUS_COLORS[s];
    const bg = idx % 2 === 0 ? '#ffffff' : '#fafcfb';
    const ts = r.timestamp ? format(new Date(r.timestamp), 'MMM d, yyyy · h:mm a') : '—';
    return `<tr style="background:${bg};">
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:12px;">${ts}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:13px;font-weight:bold;color:${c};">${r.systolic}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:13px;font-weight:bold;color:#5BA4CF;">${r.diastolic}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:12px;">${r.pulse ? r.pulse + ' ' + L.bpm : '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;"><span style="color:${c};font-weight:bold;font-size:12px;">${statusLabel(s, L)}</span></td>
      <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:11px;color:#666;">${r.notes || '—'}</td>
    </tr>`;
  }).join('');

  // ── Medication rows ─────────────────────────────────────────────────────────
  const medRows = activeMeds.length
    ? activeMeds.map((m, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#fafcfb';
        return `<tr style="background:${bg};">
          <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-weight:bold;font-size:12px;">${m.name || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:12px;">${m.dosage || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:12px;">${L.freqLabels[m.frequency] ?? L.freqLabels[1]}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #edf2ef;font-size:11px;color:#666;">${m.doctorNotes || '—'}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#aaa;font-size:12px;">${L.noMeds}</td></tr>`;

  // ── Recommendation items ────────────────────────────────────────────────────
  const recHTML = recommendations
    .filter(r => r.category !== 'disclaimer')
    .slice(0, 8)
    .map(r => {
      const cat = (r.category || 'general');
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `<div style="padding:10px 0;border-bottom:1px solid #edf2ef;">
        <strong style="color:#4CAF93;font-size:12px;">${catLabel}:</strong>
        <span style="color:#444;font-size:12px;margin-left:6px;">${r.text || ''}</span>
      </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=794px, initial-scale=1">
<style>
  @page { size: A4 portrait; margin: 16mm 18mm 16mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1A2E25;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.6;
    width: 100%;
  }
  h2 {
    font-size: 16px;
    color: #4CAF93;
    border-bottom: 2.5px solid #c8e6d8;
    padding-bottom: 8px;
    margin: 28px 0 16px 0;
    page-break-after: avoid;
    break-after: avoid;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #4CAF93;
    color: #ffffff;
    padding: 10px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
  }
  tr { page-break-inside: avoid; break-inside: avoid; }
  svg { page-break-inside: avoid; break-inside: avoid; display: block; max-width: 100%; }
  .chart-section { page-break-inside: avoid; break-inside: avoid; }
  .page-break { page-break-before: always; break-before: page; padding-top: 0; }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
  }
</style>
</head>
<body>

<!-- ══ HEADER ═══════════════════════════════════════════════ -->
<table style="width:100%;border-bottom:3px solid #4CAF93;padding-bottom:18px;margin-bottom:24px;">
  <tr>
    <td style="vertical-align:top;width:55%;">
      <div style="font-size:28px;font-weight:bold;color:#4CAF93;">&#9829; VitaInes</div>
      <div style="font-size:14px;color:#888;margin-top:4px;">${L.reportTitle}</div>
    </td>
    <td style="text-align:right;vertical-align:top;color:#666;font-size:12px;">
      <div style="font-size:15px;font-weight:bold;color:#1A2E25;margin-bottom:5px;">${patientName}</div>
      <div>${L.period}: ${startStr} &#8211; ${endStr}</div>
      <div>${L.generated}: ${generated}</div>
      <div style="margin-top:4px;color:#4CAF93;font-weight:bold;">${readings.length} ${L.totalReadings}</div>
    </td>
  </tr>
</table>

<!-- ══ SUMMARY ══════════════════════════════════════════════ -->
<h2>&#128202; ${L.summary}</h2>

<!-- Stats: 4-cell table — compatible with all WebView renderers -->
<table style="width:100%;margin-bottom:14px;">
  <tr>
    <td style="width:25%;padding:4px;">
      <div style="background:#f7faf8;border-radius:8px;padding:14px 10px;text-align:center;border-top:4px solid #4CAF93;">
        <div style="font-size:21px;font-weight:bold;color:#1A2E25;">${stats.avgSystolic || '&#8212;'}/${stats.avgDiastolic || '&#8212;'}</div>
        <div style="font-size:11px;color:#aaa;">mmHg</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">${L.averageBP}</div>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#fef8f7;border-radius:8px;padding:14px 10px;text-align:center;border-top:4px solid #E74C3C;">
        <div style="font-size:21px;font-weight:bold;color:#1A2E25;">${stats.maxSystolic || '&#8212;'}/${stats.maxDiastolic || '&#8212;'}</div>
        <div style="font-size:11px;color:#aaa;">mmHg</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">${L.highestBP}</div>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#f7f9fe;border-radius:8px;padding:14px 10px;text-align:center;border-top:4px solid #5BA4CF;">
        <div style="font-size:21px;font-weight:bold;color:#1A2E25;">${stats.minSystolic || '&#8212;'}/${stats.minDiastolic || '&#8212;'}</div>
        <div style="font-size:11px;color:#aaa;">mmHg</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">${L.lowestBP}</div>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#fff8fb;border-radius:8px;padding:14px 10px;text-align:center;border-top:4px solid #F4A7B9;">
        <div style="font-size:21px;font-weight:bold;color:#1A2E25;">${avgPulse ? avgPulse + ' ' + L.bpm : '&#8212;'}</div>
        <div style="font-size:11px;color:#aaa;">&nbsp;</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">${L.averagePulse}</div>
      </div>
    </td>
  </tr>
</table>

<!-- Status breakdown -->
<table style="width:100%;margin-bottom:22px;">
  <tr>
    <td style="width:25%;padding:4px;">
      <div style="background:#E8F5EF;border-radius:20px;padding:8px 12px;text-align:center;">
        <span style="font-weight:bold;color:#4CAF93;font-size:13px;">&#10003; ${L.normal}: ${counts.normal}</span>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#FEF6E7;border-radius:20px;padding:8px 12px;text-align:center;">
        <span style="font-weight:bold;color:#F5A623;font-size:13px;">&#9888; ${L.elevated}: ${counts.elevated}</span>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#FDECEA;border-radius:20px;padding:8px 12px;text-align:center;">
        <span style="font-weight:bold;color:#E74C3C;font-size:13px;">&#128308; ${L.high}: ${counts.high}</span>
      </div>
    </td>
    <td style="width:25%;padding:4px;">
      <div style="background:#FFE8E8;border-radius:20px;padding:8px 12px;text-align:center;">
        <span style="font-weight:bold;color:#8B0000;font-size:13px;">&#128680; ${L.crisis}: ${counts.crisis}</span>
      </div>
    </td>
  </tr>
</table>

<!-- ══ BP TREND CHART ════════════════════════════════════════ -->
<h2>&#128200; ${L.bpTrend}</h2>
<div class="chart-section" style="background:#f9fbf9;border-radius:10px;padding:16px;margin-bottom:10px;">
  ${buildBPChart(readings, L)}
  <table style="width:100%;margin-top:12px;">
    <tr>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:3px;background:#E74C3C;vertical-align:middle;margin-right:5px;"></span>${L.systolic}
      </td>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:3px;background:#5BA4CF;vertical-align:middle;margin-right:5px;"></span>${L.diastolic}
      </td>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:2px;background:#4CAF93;vertical-align:middle;margin-right:5px;"></span>${L.normalLine}
      </td>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:2px;background:#E74C3C;vertical-align:middle;margin-right:5px;"></span>High Alert: 140 mmHg
      </td>
    </tr>
  </table>
  <div style="background:#FFF8E7;border-left:4px solid #F5A623;border-radius:4px;padding:10px 14px;margin-top:12px;font-size:12px;color:#7a5d00;">
    &#9888; ${L.highLine}
  </div>
</div>

${hasPulseChart ? `
<!-- ══ PULSE TREND CHART ═════════════════════════════════════ -->
<h2>&#9829; ${L.pulseTrend}</h2>
<div class="chart-section" style="background:#fff9fb;border-radius:10px;padding:16px;margin-bottom:10px;">
  ${buildPulseChart(readings, L)}
  <table style="width:100%;margin-top:12px;">
    <tr>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:3px;background:#F4A7B9;vertical-align:middle;margin-right:5px;"></span>${L.pulseLabel}
      </td>
      <td style="padding:3px 8px;font-size:11px;color:#555;">
        <span style="display:inline-block;width:18px;height:2px;background:#E74C3C;vertical-align:middle;margin-right:5px;"></span>${L.pulseLimit}
      </td>
    </tr>
  </table>
  <div style="background:#FFF8E7;border-left:4px solid #F5A623;border-radius:4px;padding:10px 14px;margin-top:12px;font-size:12px;color:#7a5d00;">
    &#9888; ${L.pulseLimit}
  </div>
</div>
` : ''}

<!-- ══ ALL READINGS TABLE ════════════════════════════════════ -->
<div class="page-break"></div>
<h2>${L.allReadings} (${sorted.length})</h2>
<table>
  <thead>
    <tr>
      <th style="width:22%;">${L.dateTime}</th>
      <th style="width:13%;">${L.systolic} (mmHg)</th>
      <th style="width:14%;">${L.diastolic} (mmHg)</th>
      <th style="width:11%;">${L.pulseLabel}</th>
      <th style="width:13%;">${L.status}</th>
      <th>${L.notes}</th>
    </tr>
  </thead>
  <tbody>${readingRows}</tbody>
</table>

<!-- ══ MEDICATIONS ═══════════════════════════════════════════ -->
<h2>&#128138; ${L.medications}</h2>
<table>
  <thead>
    <tr>
      <th style="width:28%;">${L.medications}</th>
      <th style="width:20%;">${L.dosage}</th>
      <th style="width:24%;">${L.frequency}</th>
      <th>${L.notes}</th>
    </tr>
  </thead>
  <tbody>${medRows}</tbody>
</table>

${recHTML ? `
<!-- ══ HEALTH RECOMMENDATIONS ═══════════════════════════════ -->
<h2>&#10024; ${L.healthRecs}</h2>
<div style="background:#f9fbf9;border-radius:8px;padding:14px 18px;">
  ${recHTML}
</div>
` : ''}

<!-- ══ FOOTER ════════════════════════════════════════════════ -->
<div style="margin-top:36px;padding:14px 18px;background:#fff8e7;border-radius:8px;font-size:11px;color:#888;text-align:center;line-height:1.8;">
  &#9888; ${L.disclaimer}<br>
  <strong style="color:#4CAF93;">VitaInes</strong> &#183; ${generated}
</div>

</body>
</html>`;
};

// ─── Public export ────────────────────────────────────────────────────────────
export const exportPDFReport = async (opts) => {
  const html = buildHTML(opts);

  if (Platform.OS === 'web') {
    // Open a real browser window so the full document renders before print —
    // expo-print's iframe approach clips to the iframe viewport height.
    const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      // Wait for all content (SVGs, fonts) to finish rendering before printing
      win.addEventListener('load', () => {
        setTimeout(() => { win.focus(); win.print(); }, 400);
      });
      // Fallback: if 'load' already fired (document.write is synchronous)
      if (win.document.readyState === 'complete') {
        setTimeout(() => { win.focus(); win.print(); }, 400);
      }
    } else {
      // Popup blocked — download the report as a self-contained HTML file
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `vitaines-report-${format(new Date(), 'yyyy-MM-dd')}.html`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return;
  }

  // Native (iOS / Android): generate a real PDF file and share it
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: opts.language === 'es' ? 'Compartir Informe de Salud' : 'Share Health Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
};
