import React, { useState } from 'react';
import { getBookCoverUrl, getFallbackCoverGradient } from '../utils/bookCovers';

export default function BookCoverThumb({ isbn, title, className = 'w-9 h-12' }) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = getBookCoverUrl(isbn, title);
  const gradient = getFallbackCoverGradient(title);

  if (coverUrl && !imgError) {
    return (
      <div className={`${className} rounded shadow-xs overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80`}>
        <img
          src={coverUrl}
          alt={title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback realistic spine/cover thumbnail with first letter
  return (
    <div
      className={`${className} rounded shadow-xs overflow-hidden shrink-0 bg-gradient-to-br ${gradient} flex flex-col justify-between p-1 text-white select-none border border-black/10`}
    >
      <div className="w-full h-0.5 bg-white/20 rounded"></div>
      <span className="font-extrabold text-xs text-center leading-none tracking-tight">
        {title?.charAt(0)?.toUpperCase() || 'B'}
      </span>
      <div className="w-full h-0.5 bg-white/20 rounded"></div>
    </div>
  );
}
