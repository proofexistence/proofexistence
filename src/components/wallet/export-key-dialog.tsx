'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Copy, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useWeb3Auth } from '@/lib/web3auth';

interface ExportKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportKeyDialog({ open, onOpenChange }: ExportKeyDialogProps) {
  const { exportPrivateKey, isExternalWallet } = useWeb3Auth();
  const [step, setStep] = useState<'warning' | 'exporting' | 'display'>(
    'warning'
  );
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('warning');
      setPrivateKey(null);
      setError(null);
      setShowKey(false);
      setCopied(false);
      setCountdown(60);
    }
  }, [open]);

  // Auto-hide countdown
  useEffect(() => {
    if (step === 'display' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onOpenChange(false);
    }
  }, [step, countdown, onOpenChange]);

  const handleExport = async () => {
    setStep('exporting');
    setError(null);

    try {
      const key = await exportPrivateKey();
      if (key) {
        setPrivateKey(key);
        setStep('display');
      } else {
        throw new Error('Failed to retrieve private key');
      }
    } catch (err) {
      console.error('[ExportKeyDialog] Export error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Export failed. Please try again.';
      setError(errorMessage);
      setStep('warning');
    }
  };

  const handleCopy = async () => {
    if (!privateKey) return;
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show different content for external wallet users
  if (isExternalWallet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Export Private Key</DialogTitle>
            <DialogDescription className="text-zinc-400">
              External wallet detected
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-zinc-300">
              You are using an external wallet (like MetaMask). Your private key
              is managed by your wallet application, not by Proof of Existence.
            </p>
            <p className="text-sm text-zinc-400 mt-3">
              To export your private key, please use your wallet app&apos;s
              built-in export feature.
            </p>
          </div>

          <DialogFooter>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Got it
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Export Private Key</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === 'warning' &&
              'Read the warning carefully before proceeding'}
            {step === 'exporting' && 'Authenticating...'}
            {step === 'display' && `Auto-hide in ${countdown}s`}
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' && (
          <>
            <div className="py-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200 space-y-2">
                  <p className="font-semibold">Security Warning</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-300/80">
                    <li>Never share your private key with anyone</li>
                    <li>Anyone with your key can access your funds</li>
                    <li>Store it securely offline</li>
                    <li>Proof of Existence will never ask for your key</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors"
              >
                I Understand, Export
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'exporting' && (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-400">
              Please complete authentication if prompted...
            </p>
          </div>
        )}

        {step === 'display' && privateKey && (
          <>
            <div className="py-4 space-y-4">
              <div className="relative">
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg font-mono text-xs break-all">
                  {showKey ? privateKey : '•'.repeat(64)}
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                    title={showKey ? 'Hide' : 'Show'}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                    title={copied ? 'Copied!' : 'Copy'}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-500 text-center">
                This dialog will auto-close in {countdown} seconds for security
              </p>
            </div>

            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
