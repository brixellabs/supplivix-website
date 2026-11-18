import React from 'react';

/**
 * Returns pastel theme colors matching Nutrifactor reference style for each category.
 */
export function getCategoryTheme(slug = '', name = '') {
  const s = `${slug} ${name}`.toLowerCase();

  if (s.includes('multi')) {
    return {
      key: 'multivitamins',
      bg: 'bg-[#E0F2FE]',
      hoverBg: 'group-hover:bg-[#BAE6FD]',
      border: 'border-[#BAE6FD]',
      accent: '#0284C7',
      pillBg: '#38BDF8',
      pillSecondary: '#FDE047',
    };
  }
  if (s.includes('teen')) {
    return {
      key: 'teen-agers',
      bg: 'bg-[#EDE9FE]',
      hoverBg: 'group-hover:bg-[#DDD6FE]',
      border: 'border-[#DDD6FE]',
      accent: '#7C3AED',
      pillBg: '#A78BFA',
      pillSecondary: '#F472B6',
    };
  }
  if (s.includes('kid') || s.includes('child')) {
    return {
      key: 'kids',
      bg: 'bg-[#FFEDD5]',
      hoverBg: 'group-hover:bg-[#FED7AA]',
      border: 'border-[#FED7AA]',
      accent: '#EA580C',
      pillBg: '#FB923C',
      pillSecondary: '#FDE047',
    };
  }
  if (s.includes('immun')) {
    return {
      key: 'immunity',
      bg: 'bg-[#D1FAE5]',
      hoverBg: 'group-hover:bg-[#A7F3D0]',
      border: 'border-[#A7F3D0]',
      accent: '#059669',
      pillBg: '#34D399',
      pillSecondary: '#6EE7B7',
    };
  }
  if (s.includes('bone') || s.includes('joint')) {
    return {
      key: 'bones-joints',
      bg: 'bg-[#E0E7FF]',
      hoverBg: 'group-hover:bg-[#C7D2FE]',
      border: 'border-[#C7D2FE]',
      accent: '#4F46E5',
      pillBg: '#818CF8',
      pillSecondary: '#C7D2FE',
    };
  }
  if (s.includes('glow') || s.includes('skin & glow')) {
    return {
      key: 'skin-glow',
      bg: 'bg-[#FCE7F3]',
      hoverBg: 'group-hover:bg-[#FBCFE8]',
      border: 'border-[#FBCFE8]',
      accent: '#DB2777',
      pillBg: '#F472B6',
      pillSecondary: '#FDE047',
    };
  }
  if (s.includes('skin') || s.includes('serum')) {
    return {
      key: 'skincare',
      bg: 'bg-[#FFE4E6]',
      hoverBg: 'group-hover:bg-[#FECDD3]',
      border: 'border-[#FECDD3]',
      accent: '#E11D48',
      pillBg: '#FB7185',
      pillSecondary: '#FDA4AF',
    };
  }
  if (s.includes('vital') || s.includes('energy') || s.includes('star')) {
    return {
      key: 'vitality',
      bg: 'bg-[#FEF3C7]',
      hoverBg: 'group-hover:bg-[#FDE68A]',
      border: 'border-[#FDE68A]',
      accent: '#D97706',
      pillBg: '#FBBF24',
      pillSecondary: '#F59E0B',
    };
  }
  if (s.includes('aging') || s.includes('anti-age') || s.includes('youth')) {
    return {
      key: 'anti-aging',
      bg: 'bg-[#CCFBF1]',
      hoverBg: 'group-hover:bg-[#99F6E4]',
      border: 'border-[#99F6E4]',
      accent: '#0D9488',
      pillBg: '#2DD4BF',
      pillSecondary: '#FBBF24',
    };
  }

  // Default theme
  return {
    key: 'default',
    bg: 'bg-[#F1F5F9]',
    hoverBg: 'group-hover:bg-[#E2E8F0]',
    border: 'border-[#E2E8F0]',
    accent: '#475569',
    pillBg: '#94A3B8',
    pillSecondary: '#CBD5E1',
  };
}

/**
 * Funky Hand-crafted SVG Illustrations matching the Nutrifactor reference style.
 */
export default function CategoryFunkyIcon({ slug = '', name = '', className = 'w-12 h-12' }) {
  const theme = getCategoryTheme(slug, name);

  switch (theme.key) {
    case 'multivitamins':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Tilted Capsule */}
          <g transform="rotate(-32 30 30)">
            <rect x="20" y="10" width="20" height="40" rx="10" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
            <path d="M20 30h20" stroke="#1E293B" strokeWidth="2.4" />
            <path d="M20 30h20v10a10 10 0 01-20 0V30z" fill={theme.pillBg} fillOpacity="0.8" />
            {/* Highlight shine */}
            <path d="M25 18h2m-2 4h1" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Round Tablet 1 */}
          <circle cx="16" cy="46" r="9.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
          <path d="M9 46h14" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          {/* Round Tablet 2 (small yellow tablet) */}
          <circle cx="48" cy="18" r="7.5" fill={theme.pillSecondary} stroke="#1E293B" strokeWidth="2.4" />
          <path d="M43 18h10" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'teen-agers':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Funky Headphones */}
          <path d="M16 34C16 22 23 13 32 13s16 9 16 21" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          {/* Left Earcup */}
          <rect x="11" y="31" width="9" height="17" rx="4.5" fill={theme.pillBg} stroke="#1E293B" strokeWidth="2.4" />
          {/* Right Earcup */}
          <rect x="44" y="31" width="9" height="17" rx="4.5" fill={theme.pillBg} stroke="#1E293B" strokeWidth="2.4" />
          {/* Playful smiling smiley */}
          <circle cx="32" cy="35" r="9" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.2" />
          <circle cx="29" cy="33.5" r="1.3" fill="#1E293B" />
          <circle cx="35" cy="33.5" r="1.3" fill="#1E293B" />
          <path d="M29 37.5c1.2 1.5 4.8 1.5 6 0" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
          {/* Energy sparkles */}
          <path d="M51 14l1.2 2.5 2.8.3-2 1.8.6 2.6-2.6-1.4-2.6 1.4.6-2.6-2-1.8 2.8-.3z" fill={theme.pillSecondary} />
        </svg>
      );

    case 'kids':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Top Toy Block with Triangle */}
          <rect x="23" y="10" width="18" height="18" rx="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
          <path d="M32 14.5l4.5 9h-9z" fill={theme.pillBg} stroke="#1E293B" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Bottom Left Block with Star */}
          <rect x="11" y="32" width="18" height="18" rx="3.5" fill={theme.pillSecondary} fillOpacity="0.85" stroke="#1E293B" strokeWidth="2.4" />
          <path d="M20 36.5l1.2 2.5 2.7.4-2 2 .5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-2 2.7-.4z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Bottom Right Block with Circle */}
          <rect x="35" y="32" width="18" height="18" rx="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
          <circle cx="44" cy="41" r="4.5" fill="#F472B6" stroke="#1E293B" strokeWidth="1.8" />
        </svg>
      );

    case 'immunity':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Protection Shield */}
          <path d="M32 9c8-2 16 1.5 18 3.5v19c0 14-9.5 22.5-18 25.5C23.5 54 14 45.5 14 31.5v-19C16 10.5 24 7 32 9z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Inner Badge Tone */}
          <path d="M32 17c5.5-1.2 11 1 12.5 2.5v12c0 9.5-6.5 15.5-12.5 17.5C26 47 19.5 41 19.5 31.5v-12C21 18 26.5 15.8 32 17z" fill={theme.pillBg} fillOpacity="0.45" />
          {/* Medical Cross Plus */}
          <path d="M32 23v14m-7-7h14" stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" />
          {/* Sparkles of Defense */}
          <circle cx="50" cy="15" r="2" fill="#059669" />
          <path d="M14 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#059669" />
        </svg>
      );

    case 'bones-joints':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Femur Upper Bone */}
          <path d="M23 11h18v14c0 3.5-2 6.5-5 7.5l-2 1c-1.5.8-2.5.8-4 0l-2-1c-3-1-5-4-5-7.5V11z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Lower Tibia Bone */}
          <path d="M25 38c2-1 4-1 6 0l2 1c2.5 1 4.5 1 6.5-.5V54H25V38z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M39 42v12" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
          {/* Patella Kneecap (highlight color block) */}
          <rect x="15" y="26" width="12" height="15" rx="5" fill={theme.pillBg} stroke="#1E293B" strokeWidth="2.4" />
          {/* Joint flex lines */}
          <path d="M38 27c3.5 2 4.5 6 3 9.5" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M43 25c4 3 6 8.5 3 13" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 3" />
        </svg>
      );

    case 'skin-glow':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Radiant Starburst Glow */}
          <path d="M32 9l3.5 12.5 12.5 3.5-12.5 3.5L32 41l-3.5-12.5L16 25l12.5-3.5z" fill={theme.pillBg} fillOpacity="0.8" stroke="#1E293B" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Dew Drop Leaf */}
          <path d="M44 33c8 2 10 10.5 10 17-6.5 0-14.5-2-16.5-10.5 4-4.5 6.5-6.5 6.5-6.5z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M44 33c-1 5 1.5 10.5 7.5 13.5" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
          {/* Radiance sparkle dots */}
          <circle cx="16" cy="17" r="2" fill="#DB2777" />
          <circle cx="50" cy="15" r="2.5" fill="#DB2777" />
          <circle cx="18" cy="46" r="2" fill="#DB2777" />
        </svg>
      );

    case 'skincare':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Dropper Rubber Bulb */}
          <rect x="27" y="10" width="10" height="7" rx="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
          <rect x="25" y="17" width="14" height="4" rx="1.5" fill={theme.pillSecondary} stroke="#1E293B" strokeWidth="2" />
          {/* Glass Serum Bottle */}
          <rect x="20" y="21" width="24" height="31" rx="6" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
          {/* Serum Liquid Level */}
          <path d="M22 34c3-1 6 1 10 0s7-2 10 0v12a5 5 0 01-5 5H27a5 5 0 01-5-5V34z" fill={theme.pillBg} fillOpacity="0.75" />
          {/* Pipette Tube */}
          <path d="M32 21v13" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          {/* Falling Serum Droplet */}
          <path d="M50 32c0 3.5-2.5 5-4 5s-4-1.5-4-5c0-3 4-7.5 4-7.5s4 4.5 4 7.5z" fill={theme.pillSecondary} stroke="#1E293B" strokeWidth="2" />
        </svg>
      );

    case 'vitality':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Horizon Line */}
          <path d="M13 43h38" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
          {/* Rising Sun */}
          <path d="M19 43a13 13 0 0126 0H19z" fill={theme.pillBg} stroke="#1E293B" strokeWidth="2.4" />
          {/* Sun Rays */}
          <path d="M32 15v5m-15 7l4 4m26-4l-4 4" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
          {/* Electric Lightning Spark of Energy */}
          <path d="M36 22l-9 14h8l-3 14 13-16h-8l4-12z" fill={theme.pillSecondary} stroke="#1E293B" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );

    case 'anti-aging':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          {/* Time Hourglass of Youth */}
          <path d="M20 14h24l-8 14c-.8 1.2-.8 2.8 0 4l8 14H20l8-14c.8-1.2.8-2.8 0-4l-8-14z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Youth Essence Sand */}
          <path d="M28 32l-5 11h18l-5-11z" fill={theme.pillBg} fillOpacity="0.8" />
          {/* Top and Bottom Caps */}
          <path d="M18 14h28M18 46h28" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
          {/* Youth Sparkles */}
          <path d="M50 17l1.2 2.5 2.8.3-2 1.8.6 2.6-2.6-1.4-2.6 1.4.6-2.6-2-1.8 2.8-.3z" fill={theme.pillSecondary} />
          <circle cx="15" cy="30" r="2" fill="#0D9488" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <rect x="18" y="18" width="28" height="28" rx="6" fill={theme.pillBg} stroke="#1E293B" strokeWidth="2.4" />
          <path d="M32 24v16m-8-8h16" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}
