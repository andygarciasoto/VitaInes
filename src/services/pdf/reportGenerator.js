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

const STATUS_LABELS = {
  normal: 'Normal', elevated: 'Elevated', high: 'High', crisis: 'Crisis',
};

const FREQ_LABELS = [
  'As needed', 'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
];

const sampleData = (arr, max = 20) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

// ─── SVG chart generator ─────────────────────────────────────────────────────
const generateSVGChart = (readings) => {
  if (!readings || readings.length < 2) {
    return '<p style="color:#aaa;font-size:13px;text-align:center;padding:20px">Not enough data for chart</p>';
  }

  const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sampled = sampleData(sorted, 20);
  const n = sampled.length;

  const W = 680, H = 220;
  const pad = { t: 20, r: 55, b: 50, l: 45 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  const allVals = sampled.flatMap(r => [r.systolic, r.diastolic]);
  const maxV = Math.max(...allVals, 160) + 10;
  const minV = Math.max(40, Math.min(...allVals) - 10);
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
    return `<circle cx="${px(i)}" cy="${py(r.systolic)}" r="4" fill="${c}"/>` +
           `<circle cx="${px(i)}" cy="${py(r.diastolic)}" r="3" fill="#5BA4CF"/>`;
  }).join('');

  const labels = sampled.map((r, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${px(i)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#888" font-family="Arial">${format(new Date(r.timestamp), 'M/d')}</text>`;
  }).join('');

  const yLabels = [minV, Math.round((minV + maxV) / 2), maxV].map(v =>
    `<text x="${pad.l - 5}" y="${py(v)}" font-size="10" text-anchor="end" fill="#888" font-family="Arial" dominant-baseline="middle">${v}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%">
  <rect width="${W}" height="${H}" fill="#f8faf9" rx="8"/>
  ${show120 ? `<line x1="${pad.l}" y1="${t120.toFixed(1)}" x2="${W - pad.r}" y2="${t120.toFixed(1)}" stroke="#4CAF93" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.8"/>
  <text x="${W - pad.r + 4}" y="${(t120 + 4).toFixed(1)}" font-size="11" fill="#4CAF93" font-family="Arial">120</text>` : ''}
  ${show140 ? `<line x1="${pad.l}" y1="${t140.toFixed(1)}" x2="${W - pad.r}" y2="${t140.toFixed(1)}" stroke="#E74C3C" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.7"/>
  <text x="${W - pad.r + 4}" y="${(t140 + 4).toFixed(1)}" font-size="11" fill="#E74C3C" font-family="Arial">140</text>` : ''}
  <path d="${diaPath}" fill="none" stroke="#5BA4CF" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${sysPath}" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linejoin="round"/>
  ${dots}
  ${labels}
  ${yLabels}
</svg>`;
};

// ─── HTML report builder ──────────────────────────────────────────────────────
const buildHTML = ({ readings, stats, medications = [], recommendations = [], profile, dateRange }) => {
  const sorted = [...readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const patientName = profile?.name || 'Patient';
  const startStr  = format(dateRange.start, 'MMM d, yyyy');
  const endStr    = format(dateRange.end, 'MMM d, yyyy');
  const generated = format(new Date(), 'MMM d, yyyy h:mm a');

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
      <td style="color:${col};font-weight:bold">${STATUS_LABELS[s]}</td>
      <td style="color:#666">${r.notes || '–'}</td>
    </tr>`;
  }).join('');

  const medItems = activeMeds.length
    ? activeMeds.map(m => `<div class="med-item">
        <span class="med-name">${m.name}</span>
        <span class="med-detail"> — ${m.dosage} · ${FREQ_LABELS[m.frequency] || 'Once daily'}</span>
        ${m.doctorNotes ? `<div class="med-detail" style="margin-top:2px">📋 ${m.doctorNotes}</div>` : ''}
      </div>`).join('')
    : '<p style="color:#999">No active medications recorded.</p>';

  const recItems = recommendations.filter(r => r.category !== 'disclaimer').slice(0, 6).map(r =>
    `<div class="rec-item">
      <strong>${(r.category || 'General').charAt(0).toUpperCase() + (r.category || 'general').slice(1)}:</strong>
      ${r.text || ''}
    </div>`
  ).join('');

  const avgPulseArr = readings.filter(r => r.pulse > 0);
  const avgPulse = avgPulseArr.length
    ? Math.round(avgPulseArr.reduce((s, r) => s + r.pulse, 0) / avgPulseArr.length)
    : null;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; color:#1A2E25; background:#fff; padding:32px; font-size:13px; line-height:1.6; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #4CAF93; padding-bottom:18px; margin-bottom:26px; }
  .logo { font-size:26px; font-weight:bold; color:#4CAF93; }
  .meta { text-align:right; color:#666; font-size:12px; }
  .meta-name { color:#1A2E25; font-size:15px; font-weight:bold; margin-bottom:4px; }
  h2 { font-size:16px; color:#4CAF93; border-bottom:1px solid #e2ede8; padding-bottom:6px; margin:24px 0 14px; }
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px; }
  .stat-box { background:#f7faf8; border-radius:8px; padding:12px; text-align:center; border-top:4px solid #4CAF93; }
  .stat-box.red { border-top-color:#E74C3C; }
  .stat-box.blue { border-top-color:#5BA4CF; }
  .stat-box.pink { border-top-color:#F4A7B9; }
  .stat-value { font-size:20px; font-weight:bold; color:#1A2E25; }
  .stat-unit  { font-size:11px; color:#aaa; }
  .stat-label { font-size:11px; color:#666; margin-top:2px; }
  .status-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  .chip { padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; }
  .chip-normal   { background:#E8F5EF; color:#4CAF93; }
  .chip-elevated { background:#FEF6E7; color:#F5A623; }
  .chip-high     { background:#FDECEA; color:#E74C3C; }
  .chip-crisis   { background:#FFE8E8; color:#8B0000; }
  .chip-total    { background:#f0f0f0; color:#666; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
  th { background:#4CAF93; color:#fff; padding:9px 8px; text-align:left; font-weight:600; }
  td { padding:7px 8px; border-bottom:1px solid #f0f5f2; vertical-align:top; }
  tr:nth-child(even) td { background:#fafcfb; }
  .med-item { padding:7px 0; border-bottom:1px solid #f0f5f2; }
  .med-name   { font-weight:bold; }
  .med-detail { color:#666; font-size:11px; }
  .rec-item { padding:8px 0; border-bottom:1px solid #f0f5f2; }
  .chart-legend { display:flex; gap:20px; font-size:11px; margin-top:8px; flex-wrap:wrap; }
  .legend-swatch { display:inline-block; width:18px; height:3px; margin-right:5px; vertical-align:middle; }
  .footer { margin-top:36px; padding:12px; background:#fff8e7; border-radius:6px; font-size:11px; color:#888; text-align:center; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">♥ VitaInes</div>
    <div style="color:#666;font-size:13px;margin-top:4px">Blood Pressure Report</div>
  </div>
  <div class="meta">
    <div class="meta-name">${patientName}</div>
    Period: ${startStr} – ${endStr}<br>
    Generated: ${generated}
  </div>
</div>

<h2>Summary</h2>
<div class="stats-grid">
  <div class="stat-box">
    <div class="stat-value">${stats.avgSystolic}/${stats.avgDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">Average BP</div>
  </div>
  <div class="stat-box red">
    <div class="stat-value">${stats.maxSystolic}/${stats.maxDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">Highest Reading</div>
  </div>
  <div class="stat-box blue">
    <div class="stat-value">${stats.minSystolic}/${stats.minDiastolic}</div>
    <div class="stat-unit">mmHg</div>
    <div class="stat-label">Lowest Reading</div>
  </div>
  <div class="stat-box pink">
    <div class="stat-value">${avgPulse ? avgPulse + ' bpm' : '–'}</div>
    <div class="stat-unit">&nbsp;</div>
    <div class="stat-label">Average Pulse</div>
  </div>
</div>

<div class="status-row">
  <span class="chip chip-normal">✅ Normal: ${counts.normal}</span>
  <span class="chip chip-elevated">⚠️ Elevated: ${counts.elevated}</span>
  <span class="chip chip-high">🔴 High: ${counts.high}</span>
  <span class="chip chip-crisis">🚨 Crisis: ${counts.crisis}</span>
  <span class="chip chip-total">Total: ${readings.length} readings</span>
</div>

<h2>Blood Pressure Trend</h2>
${generateSVGChart(readings)}
<div class="chart-legend">
  <span><span class="legend-swatch" style="background:#E74C3C"></span>Systolic</span>
  <span><span class="legend-swatch" style="background:#5BA4CF"></span>Diastolic</span>
  <span><span class="legend-swatch" style="background:#4CAF93;border-top:2px dashed #4CAF93;height:0"></span>Normal limit (120)</span>
  <span><span class="legend-swatch" style="border-top:2px dashed #E74C3C;height:0;opacity:0.7"></span>High limit (140)</span>
</div>

<h2>All Readings (${sorted.length})</h2>
<table>
  <thead>
    <tr>
      <th>Date &amp; Time</th>
      <th>Systolic</th>
      <th>Diastolic</th>
      <th>Pulse</th>
      <th>Status</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<h2>Medications</h2>
${medItems}

${recItems ? `<h2>Health Recommendations</h2>${recItems}` : ''}

<div class="footer">
  ⚠️ This report is for informational purposes only and does not replace professional medical advice.<br>
  Always consult your healthcare provider before making any medical decisions.<br>
  Generated by VitaInes · ${generated}
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
      dialogTitle: 'Share Blood Pressure Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
};
