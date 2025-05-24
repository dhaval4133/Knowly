// src/components/layout/logo.tsx
import type React from 'react';

export default function Logo() {
  return (
    <svg
      aria-label="Knowly: Ask. Answer. Achieve."
      // You can adjust the h- class to control the logo's height.
      // The w-auto will make the width scale proportionally.
      className="h-10 w-auto" 
      viewBox="0 0 80 38" // Adjusted viewBox for the new graphic
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .logo-graphic-main { fill: hsl(var(--primary)); }
          .slogan-text { 
            font-family: var(--font-geist-sans, Arial, sans-serif); 
            font-size: 9px; 
            fill: hsl(var(--muted-foreground)); 
            text-anchor: middle; /* Center the slogan text */
          }
        `}
      </style>
      
      {/* Graphic part, translated to center it and provide top margin */}
      <g transform="translate(25, 2)"> 
        {/* Bar 1 (representing Ask) */}
        <rect x="0" y="12" width="30" height="4" rx="2" className="logo-graphic-main" />
        {/* Bar 2 (representing Answer) */}
        <rect x="0" y="18" width="30" height="4" rx="2" className="logo-graphic-main" />
        {/* Checkmark (representing Achieve) */}
        {/* Path: M startX,startY L cornerX,cornerY L endX,endY */}
        {/* This checkmark is 16 units wide (18-2) and 10 units high (13-3). */}
        {/* It's translated to be centered above the bars. translate(horizontal-center-offset, vertical-lift) */}
        <path 
          d="M2 8 L8 13 L18 3" 
          stroke="hsl(var(--primary))" 
          strokeWidth="2.5"  // Changed stroke-width to strokeWidth for React/JSX
          strokeLinecap="round" // Changed stroke-linecap to strokeLinecap
          strokeLinejoin="round" // Changed stroke-linejoin to strokeLinejoin
          fill="none" 
          transform="translate(7, -5)"
        />
      </g>
      
      {/* Slogan "Ask. Answer. Achieve." centered horizontally */}
      <text x="40" y="33" className="slogan-text">
        Ask. Answer. Achieve.
      </text>
    </svg>
  );
}
