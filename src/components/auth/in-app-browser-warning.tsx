'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  detectInAppBrowser,
  type InAppBrowserInfo,
} from '@/lib/browser-detect';
import { ExternalLink, Copy, Check, X, AlertTriangle } from 'lucide-react';

interface InAppBrowserWarningProps {
  onDismiss?: () => void;
}

/**
 * Warning banner for users accessing the site from in-app browsers
 * (Instagram, Line, Facebook, etc.) which have OAuth restrictions.
 *
 * Shows instructions for opening in an external browser.
 */
export function InAppBrowserWarning({ onDismiss }: InAppBrowserWarningProps) {
  const t = useTranslations('inAppBrowser');

  // Start with null to match server render, then detect on client after hydration
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Detect in-app browser after hydration to avoid mismatch
  useEffect(() => {
    const info = detectInAppBrowser();
    if (info.isInAppBrowser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: browser detection must run client-side after hydration
      setBrowserInfo(info);
    }
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Don't render if not in-app browser or dismissed
  if (!browserInfo?.isInAppBrowser || dismissed) {
    return null;
  }

  // Get instructions based on browser name, fallback to default
  const instructionKey =
    browserInfo.browserName &&
    [
      'Instagram',
      'Line',
      'Facebook',
      'Twitter',
      'WeChat',
      'Telegram',
      'TikTok',
    ].includes(browserInfo.browserName)
      ? browserInfo.browserName
      : 'default';

  const instructions = t(`instructions.${instructionKey}`);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-200">
              {browserInfo.browserName
                ? t('titleWithApp', { app: browserInfo.browserName })
                : t('title')}
            </h3>
            <p className="mt-1 text-sm text-amber-200/80">
              {t('description')}
              <br />
              {t('suggestion')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-amber-200/60" />
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5">
          <p className="text-xs text-zinc-400 flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{instructions}</span>
          </p>
        </div>

        {/* Copy URL Button */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleCopyUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('copyUrl')}
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-sm font-medium transition-colors"
          >
            {t('continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if the current browser is an in-app browser
 */
export function useInAppBrowser(): InAppBrowserInfo {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo>({
    isInAppBrowser: false,
    browserName: null,
    canOpenExternalBrowser: false,
  });

  // Detect in-app browser after hydration to avoid mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: browser detection must run client-side after hydration
    setBrowserInfo(detectInAppBrowser());
  }, []);

  return browserInfo;
}
