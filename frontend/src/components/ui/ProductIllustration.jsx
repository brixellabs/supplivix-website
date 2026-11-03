import React from 'react';

/**
 * Original SVG product illustration for bottles, jars, tubes, boxes, and serums.
 * Meets Rule 4: No copyrighted content; original SVG illustrations.
 */
export default function ProductIllustration({
  type = 'bottle',
  color = '#2e8b1f',
  name = 'Supplivix Vitamin',
  className = 'w-full h-48',
}) {
  const brandDark = '#0b4f27';
  const words = name.toUpperCase().split(' ');
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');

  const leafPath = 'M0-9C6-4 6 4 0 9-6 4-6-4 0-9Z';

  const renderLabel = (y, h, width = 76, x = 62) => (
    <g>
      <rect x={x} y={y} width={width} height={h} fill="#ffffff" rx="2" />
      <g transform={`translate(100, ${y + 16}) scale(0.85)`}>
        <path d={leafPath} fill="#016a38" />
      </g>
      <text
        x="100"
        y={y + 32}
        fontSize="6.5"
        fontWeight="700"
        textAnchor="middle"
        fill={brandDark}
        letterSpacing="1"
      >
        SUPPLIVIX
      </text>
      <text
        x="100"
        y={y + 46}
        fontSize="8.5"
        fontWeight="700"
        textAnchor="middle"
        fill={color}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x="100"
          y={y + 57}
          fontSize="8.5"
          fontWeight="700"
          textAnchor="middle"
          fill={color}
        >
          {line2}
        </text>
      )}
    </g>
  );

  const shadow = <ellipse cx="100" cy="230" rx="60" ry="7" fill="#000000" opacity="0.08" />;

  let shape;
  if (type === 'bottle') {
    shape = (
      <>
        {/* Cap */}
        <rect x="70" y="18" width="60" height="34" rx="6" fill={brandDark} />
        {/* Neck */}
        <rect x="66" y="50" width="68" height="8" fill={color} />
        {/* Body */}
        <rect x="58" y="58" width="84" height="164" rx="16" fill={color} />
        {renderLabel(94, 84, 76, 62)}
      </>
    );
  } else if (type === 'jar') {
    shape = (
      <>
        {/* Lid */}
        <rect x="48" y="86" width="104" height="30" rx="8" fill={brandDark} />
        {/* Body */}
        <rect x="40" y="114" width="120" height="108" rx="20" fill={color} />
        {renderLabel(130, 64, 88, 56)}
      </>
    );
  } else if (type === 'tube') {
    shape = (
      <>
        {/* Tube cap top */}
        <rect x="62" y="16" width="76" height="26" rx="5" fill={brandDark} />
        {/* Tube body */}
        <path d="M62 40h76l10 168H52Z" fill={color} />
        {/* Crimped base */}
        <rect x="52" y="206" width="96" height="14" rx="3" fill={brandDark} />
        {renderLabel(80, 86, 76, 62)}
      </>
    );
  } else if (type === 'serum') {
    shape = (
      <>
        {/* Dropper bulb */}
        <rect x="86" y="8" width="28" height="30" rx="8" fill={brandDark} />
        {/* Pipette collar */}
        <rect x="92" y="38" width="16" height="28" fill="#e8e8e8" />
        <rect x="64" y="64" width="72" height="12" rx="4" fill={brandDark} />
        {/* Glass bottle */}
        <rect x="58" y="74" width="84" height="148" rx="16" fill={color} opacity="0.94" />
        {renderLabel(106, 80, 76, 62)}
      </>
    );
  } else {
    // Box
    shape = (
      <>
        <rect x="44" y="40" width="112" height="182" rx="10" fill={color} />
        {renderLabel(86, 100, 96, 52)}
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      aria-hidden="true"
      
      xmlns="http://www.w3.org/2000/svg"
    >
      {shadow}
      {shape}
    </svg>
  );
}
