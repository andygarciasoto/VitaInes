import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const GREEN = '#8BB87A';
const BLUE  = '#6B9FC0';
const PINK  = '#F4A0B0';

const ViLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 220 200">

    {/* Green V — arms start at same baseline as the i */}
    <Path
      d="M22,50 L80,142 L110,50"
      fill="none"
      stroke={GREEN}
      strokeWidth={12}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Blue i stem */}
    <Rect x={140} y={50} width={12} height={78} rx={6} fill={BLUE} />

    {/* Pastel pink heart — the dot of the i.
        Classic 4-cubic-bezier shape: symmetric about x=146,
        humps peak at y=20, inner V-notch at y=28, bottom tip at y=42.
        Left edge x=132, right edge x=160 (28 px wide, 22 px tall).
        Heart bottom (y=42) sits 8 px above i stem top (y=50). */}
    <Path
      d="M146,42
         C140,40 132,32 132,26
         C132,20 139,20 146,28
         C153,20 160,20 160,26
         C160,32 152,40 146,42 Z"
      fill={PINK}
    />

    {/* Green smile — gentle arc that clears both V tip (y=142) and i bottom (y=128)
        by ≥15 px, and overhangs both outer edges by ~8 px for visual balance.
        Endpoints (14,157)→(162,157), radius 190 → ~14 px sagitta. */}
    <Path
      d="M14,157 A190,190 0 0 1 162,157"
      fill="none"
      stroke={GREEN}
      strokeWidth={9}
      strokeLinecap="round"
    />

  </Svg>
);

export default ViLogo;
