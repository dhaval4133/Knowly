// src/components/layout/logo.tsx
import type React from 'react';

export default function Logo() {
  return (
    <svg
      aria-label="Knowly: Ask. Answer. Achieve."
      className="h-10 w-auto" // You can adjust height
      viewBox="0 0 150 40" // Adjusted viewBox to accommodate name and graphic
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .logo-graphic-main { fill: hsl(var(--primary)); }
          .logo-text-knowly { 
            font-family: var(--font-geist-sans, Arial, sans-serif); 
            font-size: 20px; 
            font-weight: 600;
            fill: hsl(var(--primary)); 
            dominant-baseline: central;
            text-anchor: start;
          }
          .slogan-text { 
            font-family: var(--font-geist-sans, Arial, sans-serif); 
            font-size: 7px; 
            fill: hsl(var(--muted-foreground)); 
            dominant-baseline: central;
            text-anchor: start;
          }
        `}
      </style>
      
      {/* Graphic Part - two bars and a checkmark */}
      {/* Positioned to the left of the text */}
      <g transform="translate(5, 10)"> 
        {/* Bar 1 */}
        <rect x="0" y="8" width="20" height="3" rx="1.5" className="logo-graphic-main" />
        {/* Bar 2 */}
        <rect x="0" y="13" width="20" height="3" rx="1.5" className="logo-graphic-main" />
        {/* Checkmark */}
        <path 
          d="M1 5 L5 9 L11 2" 
          stroke="hsl(var(--primary))" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none" 
          transform="translate(4.5, -2)" 
        />
      </g>
      
      {/* Text "Knowly" */}
      {/* Positioned to the right of the graphic */}
      <text x="35" y="15" className="logo-text-knowly">
        Knowly
      </text>
      
      {/* Slogan "Ask. Answer. Achieve." below "Knowly" */}
      <text x="35" y="28" className="slogan-text">
        Ask. Answer. Achieve.
      </text>
    </svg>
  );
}
