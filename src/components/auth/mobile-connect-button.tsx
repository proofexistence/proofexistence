'use client';

import { useWeb3Auth } from '@/lib/web3auth';

interface MobileConnectButtonProps {
  children: React.ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function MobileConnectButton({
  children,
  className,
}: MobileConnectButtonProps) {
  const { login } = useWeb3Auth();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    login();
  };

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
}
