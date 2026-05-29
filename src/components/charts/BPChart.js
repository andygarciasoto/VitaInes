import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  G, Defs, LinearGradient, Stop, Rect,
  Path, Polyline, Line, Circle,
  Text as SvgText,
} from 'react-native-svg';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, getBPStatus } from '../../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const HEIGHT = 240;
const PAD    = { top: 20, right: 56, bottom: 50, left: 46 };

const DOT_COLORS = {
  normal:   COLORS.normal,   // green
  elevated: COLORS.elevated, // amber
  high:     COLORS.high,     // red
  crisis:   '#8B0000',       // dark red
};

const STATUS_LABEL = {
  en: { normal: 'Normal', elevated: 'Elevated', high: 'High', crisis: 'Crisis' },
  es: { normal: 'Normal', elevated: 'Elevada',  high: 'Alta', crisis: 'Crisis' },
};

const sampleDown = (arr, max = 26) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function BPChart({ readings, width, language = 'en' }) {
  const [active, setActive] = useState(null); // { reading, x, y }

  const { sampled, toX, toY, sysPath, diaPath, areaPath, y120, y140, show120, show140, yTicks, xLabels } = useMemo(() => {
    if (!readings || readings.length < 2) return {};

    const sorted  = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sampled = sampleDown(sorted, 26);
    const n       = sampled.length;

    const iW = width - PAD.left - PAD.right;
    const iH = HEIGHT - PAD.top  - PAD.bottom;

    // Value range — pad beyond thresholds so lines never touch the edge
    const vals = sampled.flatMap(r => [r.systolic, r.diastolic]);
    const minV = Math.max(40, Math.min(...vals) - 14);
    const maxV = Math.max(...vals, 145) + 14;
    const range = maxV - minV || 1;

    const toX = i  => PAD.left + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
    const toY = val => PAD.top  + iH - ((val - minV) / range) * iH;

    // Threshold positions
    const y120   = toY(120);
    const y140   = toY(140);
    const show120 = y120 >= PAD.top && y120 <= PAD.top + iH;
    const show140 = y140 >= PAD.top && y140 <= PAD.top + iH;

    // Polyline strings
    const sysPath = sampled.map((r, i) => `${toX(i).toFixed(1)},${toY(r.systolic).toFixed(1)}`).join(' ');
    const diaPath = sampled.map((r, i) => `${toX(i).toFixed(1)},${toY(r.diastolic).toFixed(1)}`).join(' ');

    // Area fill under systolic line
    const areaPath = [
      `M ${toX(0).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      ...sampled.map((r, i) => `L ${toX(i).toFixed(1)} ${toY(r.systolic).toFixed(1)}`),
      `L ${toX(n - 1).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      'Z',
    ].join(' ');

    // Y-axis ticks (5 evenly spaced)
    const step  = (maxV - minV) / 4;
    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(minV + step * i));

    // X-axis labels (≤ 7 labels)
    const labelStep = Math.max(1, Math.ceil(n / 7));
    const xLabels   = sampled.map((r, i) => ({
      show: i % labelStep === 0 || i === n - 1,
      x:    toX(i),
      text: format(new Date(r.timestamp), 'M/d'),
    }));

    return { sampled, n, toX, toY, sysPath, diaPath, areaPath, y120, y140, show120, show140, yTicks, xLabels };
  }, [readings, width]);

  if (!sampled) {
    return (
      <View style={[styles.placeholder, { width, height: HEIGHT }]}>
        <Text style={styles.placeholderText}>Need at least 2 readings</Text>
      </View>
    );
  }

  const iW = width - PAD.left - PAD.right;
  const iH = HEIGHT - PAD.top  - PAD.bottom;

  // ── Tooltip positioning ───────────────────────────────────────────────────
  const TT_W = 162, TT_H = 122;
  let ttLeft = 0, ttTop = 0;
  if (active) {
    ttLeft = Math.max(2, Math.min(active.x - TT_W / 2, width - TT_W - 2));
    ttTop  = active.y - TT_H - 14;
    if (ttTop < 0) ttTop = active.y + 18;
  }

  const dismiss = () => setActive(null);

  return (
    <View style={{ width }}>

      {/* ── SVG canvas ─────────────────────────────────────────────────────── */}
      <View style={{ position: 'relative' }}>
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="bpAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#E74C3C" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#E74C3C" stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* ── Background ───────────────────────────────────────────────── */}
          <Rect
            x={PAD.left} y={PAD.top}
            width={iW} height={iH}
            fill="#FAFCFB" rx="6"
          />

          {/* Subtle zone fills */}
          {show140 && (
            <Rect
              x={PAD.left} y={PAD.top}
              width={iW} height={Math.max(0, y140 - PAD.top)}
              fill="rgba(231,76,60,0.05)"
            />
          )}
          {show120 && show140 && (
            <Rect
              x={PAD.left} y={y140}
              width={iW} height={Math.max(0, y120 - y140)}
              fill="rgba(245,166,35,0.05)"
            />
          )}

          {/* ── Horizontal grid lines ────────────────────────────────────── */}
          {yTicks.map(v => {
            const gy = toY(v);
            if (gy < PAD.top || gy > PAD.top + iH) return null;
            return (
              <G key={`grid-${v}`}>
                <Line
                  x1={PAD.left} y1={gy.toFixed(1)}
                  x2={PAD.left + iW} y2={gy.toFixed(1)}
                  stroke="#E2EDE8" strokeWidth="1"
                />
                <SvgText
                  x={PAD.left - 6} y={(gy + 4).toFixed(1)}
                  fontSize="11" textAnchor="end" fill="#A8B8B1"
                  fontFamily="Arial,sans-serif"
                >{v}</SvgText>
              </G>
            );
          })}

          {/* ── Threshold lines ───────────────────────────────────────────── */}
          {show140 && (
            <G>
              <Line
                x1={PAD.left} y1={y140.toFixed(1)}
                x2={PAD.left + iW} y2={y140.toFixed(1)}
                stroke="#E74C3C" strokeWidth="1.5" strokeDasharray="7,4"
              />
              <SvgText
                x={PAD.left + iW + 5} y={(y140 + 4).toFixed(1)}
                fontSize="11" fill="#E74C3C" fontWeight="bold"
                fontFamily="Arial,sans-serif"
              >140</SvgText>
            </G>
          )}
          {show120 && (
            <G>
              <Line
                x1={PAD.left} y1={y120.toFixed(1)}
                x2={PAD.left + iW} y2={y120.toFixed(1)}
                stroke="#4CAF93" strokeWidth="1.5" strokeDasharray="7,4"
              />
              <SvgText
                x={PAD.left + iW + 5} y={(y120 + 4).toFixed(1)}
                fontSize="11" fill="#4CAF93" fontWeight="bold"
                fontFamily="Arial,sans-serif"
              >120</SvgText>
            </G>
          )}

          {/* ── X-axis labels ─────────────────────────────────────────────── */}
          {xLabels.map((lbl, i) => lbl.show ? (
            <SvgText
              key={`xl-${i}`}
              x={lbl.x.toFixed(1)} y={(PAD.top + iH + 18).toFixed(1)}
              fontSize="11" textAnchor="middle" fill="#A8B8B1"
              fontFamily="Arial,sans-serif"
            >{lbl.text}</SvgText>
          ) : null)}

          {/* ── Area fill under systolic ──────────────────────────────────── */}
          <Path d={areaPath} fill="url(#bpAreaGrad)" />

          {/* ── Lines ─────────────────────────────────────────────────────── */}
          <Polyline
            points={diaPath}
            fill="none" stroke="#5BA4CF" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
          />
          <Polyline
            points={sysPath}
            fill="none" stroke="#E74C3C" strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round"
          />

          {/* ── Active point vertical indicator ───────────────────────────── */}
          {active && (
            <Line
              x1={active.x.toFixed(1)} y1={PAD.top}
              x2={active.x.toFixed(1)} y2={PAD.top + iH}
              stroke={COLORS.primary} strokeWidth="1" strokeDasharray="3,3"
              opacity="0.7"
            />
          )}

          {/* ── Diastolic dots (non-interactive visual) ───────────────────── */}
          {sampled.map((r, i) => (
            <Circle
              key={`dia-dot-${i}`}
              cx={toX(i).toFixed(1)} cy={toY(r.diastolic).toFixed(1)}
              r="4" fill="#5BA4CF" stroke="#fff" strokeWidth="1.5"
            />
          ))}

          {/* ── Full-area dismiss (drawn before dots so dots are on top) ──── */}
          <Rect
            x={PAD.left} y={PAD.top} width={iW} height={iH}
            fill="transparent"
            onPress={dismiss}
          />

          {/* ── Systolic dots — pressable, colored by status ──────────────── */}
          {sampled.map((r, i) => {
            const s   = getBPStatus(r.systolic, r.diastolic);
            const col = DOT_COLORS[s];
            const cx  = toX(i);
            const cy  = toY(r.systolic);
            const sel = active?.reading === r;
            return (
              <G
                key={`sys-dot-${i}`}
                onPress={() => setActive(sel ? null : { reading: r, x: cx, y: cy })}
              >
                {/* Expanded hit area */}
                <Circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="18" fill="transparent" />
                {/* Glow ring when selected */}
                {sel && (
                  <Circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="12" fill={col} opacity="0.22" />
                )}
                {/* Dot */}
                <Circle
                  cx={cx.toFixed(1)} cy={cy.toFixed(1)}
                  r={sel ? '8' : '6'} fill={col} stroke="#fff" strokeWidth="2"
                />
              </G>
            );
          })}
        </Svg>

        {/* ── Tooltip ──────────────────────────────────────────────────────── */}
        {active && (() => {
          const r  = active.reading;
          const s  = getBPStatus(r.systolic, r.diastolic);
          const col = DOT_COLORS[s];
          const lbl = (STATUS_LABEL[language] || STATUS_LABEL.en)[s];
          return (
            <View style={[styles.tooltip, { left: ttLeft, top: ttTop }]} pointerEvents="none">
              <Text style={styles.ttDate}>{format(new Date(r.timestamp), 'EEE, MMM d, yyyy')}</Text>
              <Text style={styles.ttTime}>{format(new Date(r.timestamp), 'h:mm a')}</Text>
              <View style={styles.ttDivider} />
              <Text style={[styles.ttBP, { color: col }]}>
                {r.systolic}
                <Text style={styles.ttSlash}>/</Text>
                {r.diastolic}
                <Text style={styles.ttUnit}> mmHg</Text>
              </Text>
              {r.pulse > 0 && (
                <Text style={styles.ttPulse}>♥ {r.pulse} bpm</Text>
              )}
              <View style={[styles.ttBadge, { backgroundColor: col + '22', borderColor: col + '44' }]}>
                <Text style={[styles.ttBadgeText, { color: col }]}>{lbl}</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>Systolic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#5BA4CF' }]} />
          <Text style={styles.legendText}>Diastolic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderColor: '#4CAF93' }]} />
          <Text style={styles.legendText}>120</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>140</Text>
        </View>
      </View>

      {/* ── Hint ─────────────────────────────────────────────────────────────── */}
      <Text style={styles.hint}>Tap any point to see details</Text>

      {/* ── Threshold warning ────────────────────────────────────────────────── */}
      <View style={styles.warning}>
        <Text style={styles.warningText}>⚠️ Readings above 140 mmHg may require medical attention</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.borderLight, borderRadius: RADIUS.md,
  },
  placeholderText: { fontSize: FONTS.sm, color: COLORS.textLight },

  // Tooltip
  tooltip: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    width: 162,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    zIndex: 100,
  },
  ttDate:  { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  ttTime:  { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  ttDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 6 },
  ttBP:    { fontSize: 20, fontWeight: '700' },
  ttSlash: { color: COLORS.textLight },
  ttUnit:  { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  ttPulse: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  ttBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  ttBadgeText: { fontSize: 11, fontWeight: '600' },

  // Legend
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md,
    paddingHorizontal: SPACING.xs, marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDash: {
    width: 16, height: 0,
    borderTopWidth: 2, borderStyle: 'dashed',
  },
  legendText: { fontSize: 12, color: COLORS.textSecondary },

  // Hint
  hint: {
    fontSize: 11, color: COLORS.textLight, textAlign: 'center',
    marginTop: SPACING.xs, fontStyle: 'italic',
  },

  // Warning
  warning: {
    backgroundColor: '#FFF3CD', borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: '#F5A623',
  },
  warningText: { fontSize: 12, color: '#856404', lineHeight: 18 },
});
