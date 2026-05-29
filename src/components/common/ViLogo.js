import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const GREEN = '#8BB87A';
const BLUE  = '#6B9FC0';
const PINK  = '#F4A0B0';

/**
 * Vi brand logo as a scalable SVG component.
 * Renders the green V, blue i stem, pink heart (dot of i), and green smile arc.
 * No background — transparent, ready to drop anywhere.
 *
 * Usage: <ViLogo size={96} />
 */
const ViLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 160 160">
    {/* Green V — two arms meeting at a rounded tip */}
    <Path
      d="M42,34 L76,117 L104,34"
      fill="none"
      stroke={GREEN}
      strokeWidth={10}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Blue i stem — rounded rectangle, no dot (heart acts as dot) */}
    <Rect x={109} y={41} width={10} height={76} rx={5} fill={BLUE} />

    {/* Pink heart — acts as the dot of the i, cubic bezier for clean shape */}
    <Path
      d="M114,36 C110,33 104,30 104,25 C104,20 108,16 114,21 C120,16 124,20 124,25 C124,30 118,33 114,36 Z"
      fill={PINK}
    />

    {/* Green smile arc — centered under BOTH V and i letters */}
    <Path
      d="M113,120 A41,41 0 0 1 49,120"
      fill="none"
      stroke={GREEN}
      strokeWidth={7}
      strokeLinecap="round"
    />
  </Svg>
);

export default ViLogo;
