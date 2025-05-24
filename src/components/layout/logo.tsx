// src/components/layout/logo.tsx
import type React from 'react';

export default function Logo() {
  return (
    <svg
      aria-label="Knowly: Ask. Answer. Achieve."
      // You can adjust the h- class to control the logo's height.
      // The w-auto will make the width scale proportionally.
      className="h-10 w-auto" 
      viewBox="0 0 140 38" // Adjusted viewBox to better fit text
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .knowly-text { 
            font-family: var(--font-geist-sans, Arial, sans-serif); 
            font-weight: bold; 
            font-size: 22px; 
            fill: hsl(var(--primary)); 
          }
          .slogan-text { 
            font-family: var(--font-geist-sans, Arial, sans-serif); 
            font-size: 9px; 
            fill: hsl(var(--muted-foreground)); 
          }
        `}
      </style>
      {/* Text for "Knowly" */}
      <text x="0" y="20" className="knowly-text">
        Knowly
      </text>
      {/* Text for the slogan "Ask. Answer. Achieve." */}
      <text x="0" y="33" className="slogan-text">
        Ask. Answer. Achieve.
      </text>
    </svg>
  );
}
