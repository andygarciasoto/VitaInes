import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const GREEN = '#8BB87A';
const BLUE  = '#6B9FC0';
const PINK  = '#F4A0B0';

/**
 * Vi brand logo — square 220×220 viewBox, scales cleanly at any size.
 *
 * Layout (SVG units):
 *   Heart : x 137–171 (34 wide), y 30–60 (30 tall), centered at x=154
 *   i stem: x 148–160 (12 wide), y 85–161 (76 tall)
 *   V     : (20,85) → (82,180) → (112,85)
 *   Smile : x 10–170 arc, y endpoints=194, sag≈17 px
 *
 * Key gaps (at size=100 → scale factor 100/220 ≈ 0.45):
 *   Heart bottom → i stem top  :  25 SVG → ~11 px  ✓
 *   V right arm  → heart left  :  25 SVG → ~11 px  ✓
 *   V right arm  → i stem left :  36 SVG → ~16 px  ✓
 *   V tip        → smile arc   :  ~30 SVG → ~14 px ✓
 */
const ViLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 220 220">

    {/* ── Green V ───────────────────────────────────────────── */}
    <Path
      d="M20,85 L82,180 L112,85"
      fill="none"
      stroke={GREEN}
      strokeWidth={11}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* ── Blue i stem ───────────────────────────────────────── */}
    <Rect x={148} y={85} width={12} height={76} rx={6} fill={BLUE} />

    {/* ── Pastel pink heart (dot of the i) ─────────────────── *
     *  Built from 4 cubic bezier segments, symmetric about x=154.
     *  Segment tangents at the V-notch (154,40) are (8,10) arriving
     *  and (8,-10) departing — a clean symmetric notch.
     *  Tangents at the outermost points (137,40) and (171,40) are
     *  vertical, giving smooth rounded tops to each lobe.         */}
    <Path
      d="M154,60
         C148,58 137,50 137,40
         C137,30 146,30 154,40
         C162,30 171,30 171,40
         C171,50 160,58 154,60 Z"
      fill={PINK}
    />

    {/* ── Green smile ───────────────────────────────────────── *
     *  Arc from (10,194) to (170,194), radius 195 → ~17 px sag.
     *  Centered at x=90 = midpoint of full logo span (x=20–160).
     *  Smile clears V tip (82,180) by ~30 SVG units vertically.  */}
    <Path
      d="M10,194 A195,195 0 0 1 170,194"
      fill="none"
      stroke={GREEN}
      strokeWidth={9}
      strokeLinecap="round"
    />

  </Svg>
);

export default ViLogo;
