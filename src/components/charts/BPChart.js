import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, {
  G, Defs, LinearGradient, Stop, Rect,
  Path, Polyline, Line, Circle,
  Text as SvgText,
} from 'react-native-svg';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, getBPStatus } from '../../constants/theme';

const HEIGHT = 240;
const PAD    = { top: 20, right: 56, bottom: 50, left: 46 };
const HIT_RADIUS = 36; // px — generous tap target

const STATUS_COLORS = {
  normal:   COLORS.normal,
  elevated: COLORS.elevated,
  high:     COLORS.high,
  crisis:   '#8B0000',
};
const STATUS_LABEL = {
  en: { normal: 'Normal', elevated: 'Elevated', high: 'High', crisis: 'Crisis' },
  es: { normal: 'Normal', elevated: 'Elevada',  high: 'Alta', crisis: 'Crisis' },
};

const sampleDown = (arr, max = 24) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

export default function BPChart({ readings, width, language = 'en' }) {
  const [active, setActive] = useState(null); // { reading, x, y }

  // ── All chart geometry computed once ───────────────────────────────────────
  const computed = useMemo(() => {
    if (!readings || readings.length < 2) return null;

    const sorted  = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sampled = sampleDown(sorted, 24);
    const n       = sampled.length;

    const iW = width - PAD.left - PAD.right;
    const iH = HEIGHT - PAD.top  - PAD.bottom;

    const vals = sampled.flatMap(r => [r.systolic, r.diastolic]);
    const minV = Math.max(40, Math.min(...vals) - 14);
    const maxV = Math.max(...vals, 145) + 14;
    const rng  = maxV - minV || 1;

    const toX = i   => PAD.left + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
    const toY = val => PAD.top  + iH - ((val - minV) / rng) * iH;

    const y120    = toY(120);
    const y140    = toY(140);
    const show120 = y120 >= PAD.top && y120 <= PAD.top + iH;
    const show140 = y140 >= PAD.top && y140 <= PAD.top + iH;

    const sysPoints = sampled.map((r, i) => `${toX(i).toFixed(1)},${toY(r.systolic).toFixed(1)}`).join(' ');
    const diaPoints = sampled.map((r, i) => `${toX(i).toFixed(1)},${toY(r.diastolic).toFixed(1)}`).join(' ');

    const areaPath = [
      `M ${toX(0).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      ...sampled.map((r, i) => `L ${toX(i).toFixed(1)} ${toY(r.systolic).toFixed(1)}`),
      `L ${toX(n - 1).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      'Z',
    ].join(' ');

    const step    = (maxV - minV) / 4;
    const yTicks  = Array.from({ length: 5 }, (_, i) => Math.round(minV + step * i));
    const labelStep = Math.max(1, Math.ceil(n / 7));
    const xLabels   = sampled.map((r, i) => ({
      show: i % labelStep === 0 || i === n - 1,
      x: toX(i), text: format(new Date(r.timestamp), 'M/d'),
    }));

    return { sampled, n, toX, toY, iW, iH,
             sysPoints, diaPoints, areaPath,
             y120, y140, show120, show140, yTicks, xLabels };
  }, [readings, width]);

  // ── Nearest-point finder — used by the Pressable overlay ───────────────────
  const findNearest = useCallback((touchX, touchY) => {
    if (!computed) return null;
    const { sampled, toX, toY } = computed;
    let best = null, bestDist = HIT_RADIUS;
    sampled.forEach((r, i) => {
      const px   = toX(i);
      const pSys = toY(r.systolic);
      const pDia = toY(r.diastolic);
      const dSys = Math.hypot(touchX - px, touchY - pSys);
      const dDia = Math.hypot(touchX - px, touchY - pDia);
      const d    = Math.min(dSys, dDia);
      if (d < bestDist) {
        bestDist = d;
        best = { reading: r, x: px, y: dSys < dDia ? pSys : pDia };
      }
    });
    return best;
  }, [computed]);

  const handlePress = useCallback((evt) => {
    // locationX works on native; offsetX works on web (React Native Web)
    const x = evt.nativeEvent.locationX ?? evt.nativeEvent.offsetX ?? 0;
    const y = evt.nativeEvent.locationY ?? evt.nativeEvent.offsetY ?? 0;
    const nearest = findNearest(x, y);
    setActive(prev => {
      if (!nearest) return null;                    // tap empty area → dismiss
      if (prev?.reading === nearest.reading) return null; // same dot → toggle off
      return nearest;
    });
  }, [findNearest]);

  if (!computed) {
    return (
      <View style={[styles.placeholder, { width, height: HEIGHT }]}>
        <Text style={styles.placeholderText}>Need at least 2 readings to display chart</Text>
      </View>
    );
  }

  const { sampled, toX, toY, iW, iH,
          sysPoints, diaPoints, areaPath,
          y120, y140, show120, show140, yTicks, xLabels } = computed;

  // ── Tooltip position ───────────────────────────────────────────────────────
  const TT_W = 164;
  const TT_H = active?.reading?.pulse > 0 ? 128 : 108;
  let ttLeft = 0, ttTop = 0;
  if (active) {
    ttLeft = Math.max(4, Math.min(active.x - TT_W / 2, width - TT_W - 4));
    ttTop  = active.y - TT_H - 14;
    if (ttTop < 2) ttTop = active.y + 14;
  }

  return (
    <View style={{ width }}>

      {/* ── Chart area: SVG visuals + Pressable overlay ──────────────────── */}
      <View style={{ position: 'relative', width, height: HEIGHT }}>

        {/* Pure-visual SVG — no touch handlers anywhere inside */}
        <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#E74C3C" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#E74C3C" stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* Background */}
          <Rect x={PAD.left} y={PAD.top} width={iW} height={iH} fill="#FAFCFB" rx="6" />

          {/* Zone fills */}
          {show140 && (
            <Rect x={PAD.left} y={PAD.top} width={iW}
              height={Math.max(0, y140 - PAD.top)} fill="rgba(231,76,60,0.05)" />
          )}
          {show120 && show140 && (
            <Rect x={PAD.left} y={y140} width={iW}
              height={Math.max(0, y120 - y140)} fill="rgba(245,166,35,0.05)" />
          )}

          {/* Grid + Y labels */}
          {yTicks.map(v => {
            const gy = toY(v);
            if (gy < PAD.top || gy > PAD.top + iH) return null;
            return (
              <G key={`g${v}`}>
                <Line x1={PAD.left} y1={gy.toFixed(1)} x2={PAD.left + iW} y2={gy.toFixed(1)}
                  stroke="#E2EDE8" strokeWidth="1" />
                <SvgText x={PAD.left - 6} y={(gy + 4).toFixed(1)}
                  fontSize="11" textAnchor="end" fill="#A8B8B1" fontFamily="Arial,sans-serif"
                >{v}</SvgText>
              </G>
            );
          })}

          {/* Threshold lines */}
          {show140 && (
            <G>
              <Line x1={PAD.left} y1={y140.toFixed(1)} x2={PAD.left + iW} y2={y140.toFixed(1)}
                stroke="#E74C3C" strokeWidth="1.5" strokeDasharray="7,4" />
              <SvgText x={PAD.left + iW + 5} y={(y140 + 4).toFixed(1)}
                fontSize="11" fill="#E74C3C" fontWeight="bold" fontFamily="Arial,sans-serif"
              >140</SvgText>
            </G>
          )}
          {show120 && (
            <G>
              <Line x1={PAD.left} y1={y120.toFixed(1)} x2={PAD.left + iW} y2={y120.toFixed(1)}
                stroke="#4CAF93" strokeWidth="1.5" strokeDasharray="7,4" />
              <SvgText x={PAD.left + iW + 5} y={(y120 + 4).toFixed(1)}
                fontSize="11" fill="#4CAF93" fontWeight="bold" fontFamily="Arial,sans-serif"
              >120</SvgText>
            </G>
          )}

          {/* X labels */}
          {xLabels.map((lbl, i) => lbl.show ? (
            <SvgText key={`xl${i}`} x={lbl.x.toFixed(1)} y={(PAD.top + iH + 18).toFixed(1)}
              fontSize="11" textAnchor="middle" fill="#A8B8B1" fontFamily="Arial,sans-serif"
            >{lbl.text}</SvgText>
          ) : null)}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#bpGrad)" />

          {/* Lines */}
          <Polyline points={diaPoints} fill="none" stroke="#5BA4CF" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
          <Polyline points={sysPoints} fill="none" stroke="#E74C3C" strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round" />

          {/* Active vertical indicator */}
          {active && (
            <Line x1={active.x.toFixed(1)} y1={PAD.top}
              x2={active.x.toFixed(1)} y2={PAD.top + iH}
              stroke={COLORS.primary} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
          )}

          {/* Diastolic dots */}
          {sampled.map((r, i) => (
            <Circle key={`d${i}`}
              cx={toX(i).toFixed(1)} cy={toY(r.diastolic).toFixed(1)}
              r="4" fill="#5BA4CF" stroke="#fff" strokeWidth="1.5" />
          ))}

          {/* Systolic dots — colored by status; active dot larger */}
          {sampled.map((r, i) => {
            const col = STATUS_COLORS[getBPStatus(r.systolic, r.diastolic)];
            const sel = active?.reading === r;
            const cx  = toX(i).toFixed(1);
            const cy  = toY(r.systolic).toFixed(1);
            return (
              <G key={`s${i}`}>
                {sel && <Circle cx={cx} cy={cy} r="12" fill={col} opacity="0.2" />}
                <Circle cx={cx} cy={cy} r={sel ? '8' : '6'} fill={col} stroke="#fff" strokeWidth="2" />
              </G>
            );
          })}
        </Svg>

        {/* Pressable overlay — captures all taps, positioned absolutely over the SVG */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />

        {/* Tooltip — on top of Pressable, pointerEvents none so taps pass through */}
        {active && (() => {
          const r   = active.reading;
          const s   = getBPStatus(r.systolic, r.diastolic);
          const col = STATUS_COLORS[s];
          const lbl = (STATUS_LABEL[language] || STATUS_LABEL.en)[s];
          return (
            <View
              style={[styles.tooltip, { left: ttLeft, top: ttTop }]}
              pointerEvents="none"
            >
              <Text style={styles.ttDate}>
                {format(new Date(r.timestamp), 'EEE, MMM d, yyyy')}
              </Text>
              <Text style={styles.ttTime}>
                {format(new Date(r.timestamp), 'h:mm a')}
              </Text>
              <View style={styles.ttDivider} />
              <Text style={[styles.ttBP, { color: col }]}>
                {r.systolic}
                <Text style={styles.ttSlash}>/</Text>
                {r.diastolic}
                <Text style={styles.ttUnit}> mmHg</Text>
              </Text>
              {r.pulse > 0 && (
                <Text style={styles.ttExtra}>♥ {r.pulse} bpm</Text>
              )}
              <View style={[styles.ttBadge, { backgroundColor: col + '20', borderColor: col + '50' }]}>
                <Text style={[styles.ttBadgeText, { color: col }]}>{lbl}</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
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
          <Text style={styles.legendText}>120 (normal)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>140 (high)</Text>
        </View>
      </View>

      <Text style={styles.hint}>Tap any point to see details</Text>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          ⚠️ Readings above 140 mmHg may require medical attention
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.borderLight, borderRadius: RADIUS.md,
  },
  placeholderText: { fontSize: FONTS.sm, color: COLORS.textLight, textAlign: 'center' },

  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    width: 164,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    zIndex: 999,
  },
  ttDate:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  ttTime:    { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  ttDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 7 },
  ttBP:      { fontSize: 22, fontWeight: '700' },
  ttSlash:   { color: COLORS.textLight },
  ttUnit:    { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  ttExtra:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  ttBadge: {
    alignSelf: 'flex-start', marginTop: 7,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  ttBadgeText: { fontSize: 11, fontWeight: '600' },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md,
    paddingHorizontal: SPACING.xs, marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  legendText: { fontSize: 12, color: COLORS.textSecondary },

  hint: {
    fontSize: 11, color: COLORS.textLight, textAlign: 'center',
    marginTop: SPACING.xs, fontStyle: 'italic',
  },
  warning: {
    backgroundColor: '#FFF3CD', borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: '#F5A623',
  },
  warningText: { fontSize: 12, color: '#856404', lineHeight: 18 },
});
