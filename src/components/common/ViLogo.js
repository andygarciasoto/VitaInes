import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

// Match the icon image: teal letters, pastel pink heart, sage green smile
const TEAL  = '#4CAF93';
const PINK  = '#F08090';
const SMILE = '#8BB87A';

/**
 * Vi brand logo — 220×220 viewBox, square so size={n} scales without distortion.
 *
 * Heart construction: two overlapping circles (top humps) + triangle (bottom tip).
 * This guarantees a recognisable classic heart regardless of renderer.
 *
 * Key measurements (SVG units → physical pixels at size=100):
 *   Heart circles r=12 at (148,40) & (168,40)   top y=28, bottom of circles y=52
 *   Triangle tip at (158,68)                     heart bottom y=68
 *   Gap heart → i stem (y=80):                  12 SVG → 5.5 px  ✓
 *   Gap V right arm (x=116) → heart left (x=136): 20 SVG → 9 px   ✓
 *   V tip at (80,170), smile at y=186:            16 SVG → 7 px    ✓
 */
const ViLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 220 220">

    {/* ── Thick teal V ─────────────────────────────────────── */}
    <Path
      d="M18,80 L80,170 L116,80"
      fill="none"
      stroke={TEAL}
      strokeWidth={22}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* ── Teal i stem ──────────────────────────────────────── */}
    <Rect x={146} y={80} width={22} height={82} rx={11} fill={TEAL} />

    {/* ── Pastel pink heart (two circles + bottom triangle) ── *
     *  Circles give perfectly rounded humps. Triangle fills the *
     *  lower V. Both are pink so they blend seamlessly.         */}
    <Circle cx={147} cy={40} r={12} fill={PINK} />
    <Circle cx={169} cy={40} r={12} fill={PINK} />
    <Path d="M135,44 L158,68 L181,44 Z" fill={PINK} />

    {/* ── Sage green smile ─────────────────────────────────── */}
    <Path
      d="M12,186 A198,198 0 0 1 176,186"
      fill="none"
      stroke={SMILE}
      strokeWidth={11}
      strokeLinecap="round"
    />

  </Svg>
);

export default ViLogo;
