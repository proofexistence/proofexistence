/**
 * In-App Browser Detection Utilities
 *
 * Detects when users are accessing the site from in-app browsers
 * (Instagram, Line, Facebook, etc.) which have OAuth restrictions.
 *
 * Google blocks OAuth from embedded browsers (WebViews) since 2017
 * for security reasons, returning "Error 403: disallowed_useragent"
 */

export interface InAppBrowserInfo {
  isInAppBrowser: boolean;
  browserName: string | null;
  canOpenExternalBrowser: boolean;
}

/**
 * Detects if the current browser is an in-app browser (WebView)
 * that may have OAuth restrictions
 */
export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isInAppBrowser: false,
      browserName: null,
      canOpenExternalBrowser: false,
    };
  }

  const ua = navigator.userAgent || navigator.vendor || '';

  // Instagram in-app browser
  if (/Instagram/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'Instagram',
      canOpenExternalBrowser: true,
    };
  }

  // Line in-app browser
  if (/Line\//i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'Line',
      canOpenExternalBrowser: true,
    };
  }

  // Facebook in-app browser (FB_IAB = Facebook In-App Browser)
  if (/FBAN|FBAV|FB_IAB|FBIOS|FBSS/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'Facebook',
      canOpenExternalBrowser: true,
    };
  }

  // Twitter/X in-app browser
  if (/Twitter/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'Twitter',
      canOpenExternalBrowser: true,
    };
  }

  // WeChat in-app browser
  if (/MicroMessenger/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'WeChat',
      canOpenExternalBrowser: true,
    };
  }

  // Telegram in-app browser
  if (/Telegram/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'Telegram',
      canOpenExternalBrowser: true,
    };
  }

  // TikTok in-app browser
  if (/BytedanceWebview|TikTok/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'TikTok',
      canOpenExternalBrowser: true,
    };
  }

  // Generic WebView detection (Android)
  // wv = WebView flag in Chrome
  if (/; wv\)/i.test(ua)) {
    return {
      isInAppBrowser: true,
      browserName: 'WebView',
      canOpenExternalBrowser: false,
    };
  }

  // iOS WebView detection (not Safari or Chrome)
  // UIWebView or WKWebView without Safari identifier
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|Chrome/i.test(ua);
  const isChrome = /CriOS|Chrome/i.test(ua);

  if (isIOS && !isSafari && !isChrome && !/GSA/i.test(ua)) {
    // Might be a WebView, but we can't determine which app
    return {
      isInAppBrowser: true,
      browserName: 'WebView',
      canOpenExternalBrowser: false,
    };
  }

  return {
    isInAppBrowser: false,
    browserName: null,
    canOpenExternalBrowser: false,
  };
}

/**
 * Checks if the current browser is a standard mobile browser
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}
