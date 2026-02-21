import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'poe-show-nsfw';

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useNsfwPreference() {
  const showNsfw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setShowNsfw = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    listeners.forEach((listener) => listener());
  }, []);

  const toggleShowNsfw = useCallback(() => {
    setShowNsfw(!getSnapshot());
  }, [setShowNsfw]);

  return { showNsfw, setShowNsfw, toggleShowNsfw };
}
