import React, { useState, useEffect } from 'react';

export default function SaleCountdownTimer({ targetDate, onExpire, compact = false, badgeText = 'Sale Ends In' }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!targetDate || timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
        Sale Ended
      </span>
    );
  }

  const pad = (n) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-green bg-green-50 border border-green-200 px-2 py-1 rounded">
        <span className="text-[10px] uppercase font-sans text-brand-ink tracking-wider font-semibold mr-1">
          {badgeText}:
        </span>
        {timeLeft.days > 0 && <span>{timeLeft.days}d :</span>}
        <span>{pad(timeLeft.hours)}h :</span>
        <span>{pad(timeLeft.minutes)}m :</span>
        <span className="text-red-600">{pad(timeLeft.seconds)}s</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {badgeText && (
        <span className="text-xs uppercase tracking-widest font-bold text-brand-ink">
          {badgeText}
        </span>
      )}
      <div className="flex items-center gap-1.5 font-mono">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center bg-brand-ink text-white px-2 py-1 rounded min-w-[36px]">
            <span className="text-sm sm:text-base font-bold leading-tight">{pad(timeLeft.days)}</span>
            <span className="text-[9px] uppercase font-sans font-medium text-gray-300">Days</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-brand-ink text-white px-2 py-1 rounded min-w-[36px]">
          <span className="text-sm sm:text-base font-bold leading-tight">{pad(timeLeft.hours)}</span>
          <span className="text-[9px] uppercase font-sans font-medium text-gray-300">Hrs</span>
        </div>
        <span className="font-bold text-brand-ink">:</span>
        <div className="flex flex-col items-center bg-brand-ink text-white px-2 py-1 rounded min-w-[36px]">
          <span className="text-sm sm:text-base font-bold leading-tight">{pad(timeLeft.minutes)}</span>
          <span className="text-[9px] uppercase font-sans font-medium text-gray-300">Min</span>
        </div>
        <span className="font-bold text-brand-ink">:</span>
        <div className="flex flex-col items-center bg-red-600 text-white px-2 py-1 rounded min-w-[36px]">
          <span className="text-sm sm:text-base font-bold leading-tight">{pad(timeLeft.seconds)}</span>
          <span className="text-[9px] uppercase font-sans font-medium text-red-100">Sec</span>
        </div>
      </div>
    </div>
  );
}

