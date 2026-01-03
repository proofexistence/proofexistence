'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

export interface MintConfirmationData {
  duration: number;
  paymentMethod: 'NATIVE' | 'TIME26';
  nativeCost: bigint;
  time26Cost: bigint;
  estimatedGas?: bigint;
}

interface MintConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MintConfirmationData | null;
  onConfirm: () => void;
  isProcessing?: boolean;
}

function formatCost(cost: bigint): string {
  const formatted = ethers.formatEther(cost);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  return num.toFixed(4);
}

export function MintConfirmationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  isProcessing = false,
}: MintConfirmationDialogProps) {
  const [agreed, setAgreed] = useState(false);

  if (!data) return null;

  const isNative = data.paymentMethod === 'NATIVE';
  const cost = isNative ? data.nativeCost : data.time26Cost;
  const symbol = isNative ? 'POL' : 'TIME26';

  // Calculate fee breakdown (45s free allowance)
  const baseFee = isNative
    ? BigInt('5000000000000000') // 0.005 POL
    : BigInt('1000000000000000000'); // 1 TIME26
  const freeAllowance = 45;
  const chargeableSeconds = Math.max(0, data.duration - freeAllowance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Confirm Mint
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review the transaction details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Fee Breakdown */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Fee Breakdown
              </span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Base Fee</span>
                <span className="font-mono text-zinc-300">
                  {formatCost(baseFee)} {symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">
                  Duration Fee ({chargeableSeconds}s)
                </span>
                <span className="font-mono text-zinc-300">
                  {formatCost(cost - baseFee)} {symbol}
                </span>
              </div>
              {data.estimatedGas && isNative && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Est. Gas</span>
                  <span className="font-mono text-zinc-300">
                    ~{formatCost(data.estimatedGas)} POL
                  </span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-zinc-700 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="font-mono font-bold text-white">
                  {formatCost(
                    cost +
                      (isNative && data.estimatedGas
                        ? data.estimatedGas
                        : BigInt(0))
                  )}{' '}
                  {symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 space-y-1">
              <p>
                Your embedded wallet will sign this transaction automatically.
              </p>
              <p className="text-blue-300/70 text-xs">
                Duration: {data.duration} seconds
                {chargeableSeconds > 0 &&
                  ` (${freeAllowance}s free + ${chargeableSeconds}s charged)`}
              </p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm text-zinc-300">
              I understand this transaction will be executed from my embedded
              wallet and the fees shown above will be deducted.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed || isProcessing}
            className="px-4 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm & Mint'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
