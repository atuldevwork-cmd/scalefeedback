'use client';

import { useState } from 'react';

interface Props {
  detectedLanguage: string;
  originalTitle: string | null;
  originalDescription: string | null;
}

export function TranslationBadge({ detectedLanguage, originalTitle, originalDescription }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setShowOriginal((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
      >
        <span className="material-symbols-outlined text-[14px]">translate</span>
        Translated from {detectedLanguage}
        <span className="text-violet-400">·</span>
        <span className="underline">{showOriginal ? 'Hide original' : 'View original'}</span>
      </button>
      {showOriginal && (
        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          {originalTitle && <p className="font-semibold text-foreground">{originalTitle}</p>}
          {originalDescription && (
            <p className="text-muted-foreground mt-1 leading-relaxed">{originalDescription}</p>
          )}
        </div>
      )}
    </div>
  );
}
