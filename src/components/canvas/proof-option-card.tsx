// src/components/canvas/proof-option-card.tsx
'use client';

export type ProofOptionVariant = 'instant-pol' | 'instant-time26' | 'standard';

export type Time26CardState = 'gasless' | 'available' | 'insufficient';

export interface ProofOptionCardProps {
  variant: ProofOptionVariant;
  // Pricing
  cost: string;
  costSubtext?: string; // e.g., "≈ $0.05" or "餘額：150 TIME"
  // TIME26 specific
  time26State?: Time26CardState;
  balance?: string;
  // State
  disabled?: boolean;
  isLoading?: boolean;
  // Handlers
  onClick: () => void;
}

export function ProofOptionCard(props: ProofOptionCardProps) {
  // Placeholder - will implement in next task
  return <div>ProofOptionCard placeholder</div>;
}
