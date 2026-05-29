import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  G, Defs, LinearGradient, Stop, Rect,
  Path, Polyline, Line, Circle,
  Text as SvgText,
} from 'react-native-svg';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const HEIGHT = 190;
const PAD    = { top: 20, right: 56, bottom: 50, left: 46 };

const getPulseColor = (bpm) => {
  if (bpm >= 100) return COLORS.high;     // tachycardia
  if (bpm <= 50)  return COLORS.elevated; // bradycardia
  return COLORS.normal;                   // normal
};

const sampleDown = (arr, max = 26) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
};

export default function PulseChart({ readings, width, language = 'en' }) {
  const [active, setActive] = useState(null);

  const derived = useMemo(() => {
    if (!readings) return null;
    const withPulse = readings.filter(r => r.pulse > 0);
    if (withPulse.length < 2) return null;

    const sorted  = [...withPulse].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sampled = sampleDown(sorted, 26);
    const n       = sampled.length;

    const iW = width - PAD.left - PAD.right;
    const iH = HEIGHT - PAD.top  - PAD.bottom;

    const pulses = sampled.map(r => r.pulse);
    const minV   = Math.max(30, Math.min(...pulses) - 12);
    const maxV   = Math.max(...pulses, 105) + 12;
    const range  = maxV - minV || 1;

    const toX = i  => PAD.left + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
    const toY = val => PAD.top  + iH - ((val - minV) / range) * iH;

    const y100   = toY(100);
    const show100 = y100 >= PAD.top && y100 <= PAD.top + iH;

    const linePath = sampled.map((r, i) => `${toX(i).toFixed(1)},${toY(r.pulse).toFixed(1)}`).join(' ');

    const areaPath = [
      `M ${toX(0).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      ...sampled.map((r, i) => `L ${toX(i).toFixed(1)} ${toY(r.pulse).toFixed(1)}`),
      `L ${toX(n - 1).toFixed(1)} ${(PAD.top + iH).toFixed(1)}`,
      'Z',
    ].join(' ');

    const step   = (maxV - minV) / 4;
    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(minV + step * i));

    const labelStep = Math.max(1, Math.ceil(n / 7));
    const xLabels   = sampled.map((r, i) => ({
      show: i % labelStep === 0 || i === n - 1,
      x:    toX(i),
      text: format(new Date(r.timestamp), 'M/d'),
    }));

    return { sampled, n, toX, toY, linePath, areaPath, y100, show100, yTicks, xLabels, iW, iH };
  }, [readings, width]);

  if (!derived) {
    return (
      <View style={[styles.placeholder, { width, height: HEIGHT }]}>
        <Text style={styles.placeholderText}>Need at least 2 pulse readings</Text>
      </View>
    );
  }

  const { sampled, toX, toY, linePath, areaPath, y100, show100, yTicks, xLabels, iW, iH } = derived;

  const TT_W = 148, TT_H = 96;
  let ttLeft = 0, ttTop = 0;
  if (active) {
    ttLeft = Math.max(2, Math.min(active.x - TT_W / 2, width - TT_W - 2));
    ttTop  = active.y - TT_H - 14;
    if (ttTop < 0) ttTop = active.y + 18;
  }

  const dismiss = () => setActive(null);

  return (
    <View style={{ width }}>
      <View style={{ position: 'relative' }}>
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="pulseAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#F4A7B9" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#F4A7B9" stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Background */}
          <Rect
            x={PAD.left} y={PAD.top}
            width={iW} height={iH}
            fill="#FFF9FB" rx="6"
          />

          {/* Elevated zone (above 100 bpm) */}
          {show100 && (
            <Rect
              x={PAD.left} y={PAD.top}
              width={iW} height={Math.max(0, y100 - PAD.top)}
              fill="rgba(231,76,60,0.04)"
            />
          )}

          {/* Grid lines + Y labels */}
          {yTicks.map(v => {
            const gy = toY(v);
            if (gy < PAD.top || gy > PAD.top + iH) return null;
            return (
              <G key={`pg-${v}`}>
                <Line
                  x1={PAD.left} y1={gy.toFixed(1)}
                  x2={PAD.left + iW} y2={gy.toFixed(1)}
                  stroke="#EDE8F0" strokeWidth="1"
                />
                <SvgText
                  x={PAD.left - 6} y={(gy + 4).toFixed(1)}
                  fontSize="11" textAnchor="end" fill="#A8B8B1"
                  fontFamily="Arial,sans-serif"
                >{v}</SvgText>
              </G>
            );
          })}

          {/* Threshold line at 100 bpm */}
          {show100 && (
            <G>
              <Line
                x1={PAD.left} y1={y100.toFixed(1)}
                x2={PAD.left + iW} y2={y100.toFixed(1)}
                stroke="#E74C3C" strokeWidth="1.5" strokeDasharray="7,4"
              />
              <SvgText
                x={PAD.left + iW + 5} y={(y100 + 4).toFixed(1)}
                fontSize="11" fill="#E74C3C" fontWeight="bold"
                fontFamily="Arial,sans-serif"
              >100</SvgText>
            </G>
          )}

          {/* X labels */}
          {xLabels.map((lbl, i) => lbl.show ? (
            <SvgText
              key={`pxl-${i}`}
              x={lbl.x.toFixed(1)} y={(PAD.top + iH + 18).toFixed(1)}
              fontSize="11" textAnchor="middle" fill="#A8B8B1"
              fontFamily="Arial,sans-serif"
            >{lbl.text}</SvgText>
          ) : null)}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#pulseAreaGrad)" />

          {/* Pulse line */}
          <Polyline
            points={linePath}
            fill="none" stroke="#E8618C" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
          />

          {/* Active indicator */}
          {active && (
            <Line
              x1={active.x.toFixed(1)} y1={PAD.top}
              x2={active.x.toFixed(1)} y2={PAD.top + iH}
              stroke={COLORS.primary} strokeWidth="1" strokeDasharray="3,3" opacity="0.7"
            />
          )}

          {/* Dismiss rect — drawn before dots so dots are on top */}
          <Rect
            x={PAD.left} y={PAD.top} width={iW} height={iH}
            fill="transparent" onPress={dismiss}
          />

          {/* Interactive dots — drawn last (topmost z-order) */}
          {sampled.map((r, i) => {
            const col = getPulseColor(r.pulse);
            const cx  = toX(i);
            const cy  = toY(r.pulse);
            const sel = active?.reading === r;
            return (
              <G
                key={`pdot-${i}`}
                onPress={() => setActive(sel ? null : { reading: r, x: cx, y: cy })}
              >
                <Circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="18" fill="transparent" />
                {sel && (
                  <Circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="11" fill={col} opacity="0.2" />
                )}
                <Circle
                  cx={cx.toFixed(1)} cy={cy.toFixed(1)}
                  r={sel ? '8' : '6'} fill={col} stroke="#fff" strokeWidth="2"
                />
              </G>
            );
          })}
        </Svg>

        {/* Tooltip */}
        {active && (() => {
          const r   = active.reading;
          const col = getPulseColor(r.pulse);
          const elevated = r.pulse >= 100;
          return (
            <View style={[styles.tooltip, { left: ttLeft, top: ttTop }]} pointerEvents="none">
              <Text style={styles.ttDate}>{format(new Date(r.timestamp), 'EEE, MMM d, yyyy')}</Text>
              <Text style={styles.ttTime}>{format(new Date(r.timestamp), 'h:mm a')}</Text>
              <View style={styles.ttDivider} />
              <Text style={[styles.ttPulse, { color: col }]}>
                {r.pulse}
                <Text style={styles.ttUnit}> bpm</Text>
              </Text>
              {elevated && (
                <View style={[styles.ttBadge, { backgroundColor: col + '22', borderColor: col + '44' }]}>
                  <Text style={[styles.ttBadgeText, { color: col }]}>Elevated</Text>
                </View>
              )}
            </View>
          );
        })()}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#E8618C' }]} />
          <Text style={styles.legendText}>Pulse (bpm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderColor: '#E74C3C' }]} />
          <Text style={styles.legendText}>100 bpm limit</Text>
        </View>
      </View>
      <Text style={styles.hint}>Tap any point to see details</Text>
      <View style={styles.warning}>
        <Text style={styles.warningText}>⚠️ Readings above 100 bpm may indicate elevated heart rate</Text>
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

  tooltip: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    width: 148,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    zIndex: 100,
  },
  ttDate:  { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  ttTime:  { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  ttDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 6 },
  ttPulse: { fontSize: 22, fontWeight: '700' },
  ttUnit:  { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  ttBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  ttBadgeText: { fontSize: 11, fontWeight: '600' },

  legend: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.xs, marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDash: {
    width: 16, height: 0,
    borderTopWidth: 2, borderStyle: 'dashed',
  },
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
