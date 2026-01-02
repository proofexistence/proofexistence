'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import {
  type ChainConfig,
  type Token,
  truncateAddress,
  getExplorerLink,
} from '@/lib/sponsor/wallet-config';

interface WalletAddressDisplayProps {
  chain: ChainConfig;
  token: Token;
}

export function WalletAddressDisplay({
  chain,
  token,
}: WalletAddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showCopyWarning, setShowCopyWarning] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chain.address);
    setCopied(true);
    setShowCopyWarning(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setShowCopyWarning(false), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Selected Token Display */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span>Sending</span>
        <span
          className={`font-semibold bg-clip-text text-transparent bg-gradient-to-r ${chain.color}`}
        >
          {token.symbol}
        </span>
        <span>on</span>
        <span className="font-medium text-zinc-300">{chain.name}</span>
      </div>

      {/* Address Card */}
      <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 space-y-3">
        {/* Address Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Receiving Address</span>
            <button
              onClick={() => setShowFullAddress(!showFullAddress)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {showFullAddress ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show full
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div
              className="font-mono text-sm text-zinc-200 break-all cursor-pointer hover:text-white transition-colors"
              onClick={() => setShowFullAddress(!showFullAddress)}
            >
              {showFullAddress ? chain.address : truncateAddress(chain.address)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Copied
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* QR Toggle Button */}
          <button
            onClick={() => setShowQR(!showQR)}
            className={`px-3 py-2.5 rounded-lg transition-colors ${
              showQR
                ? 'bg-white/10 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
            title="Show QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Explorer Link */}
          <a
            href={getExplorerLink(chain)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            title="View on Explorer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Copy Warning Toast */}
        <AnimatePresence>
          {showCopyWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <p className="text-xs text-emerald-300">
                Address copied. Always verify the address matches before
                sending.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Code */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex justify-center pt-2">
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={chain.address}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/80 space-y-1">
          <p className="font-medium text-amber-200">Security Notice</p>
          <p>
            Always verify the receiving address matches exactly. Never copy
            addresses from transaction history - use this page only.
          </p>
        </div>
      </div>
    </div>
  );
}
