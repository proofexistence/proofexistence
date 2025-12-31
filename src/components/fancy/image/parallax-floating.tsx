'use client';

import React, {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from 'react';

interface FloatingContextType {
  registerElement: (
    id: string,
    depth: number,
    ref: React.RefObject<HTMLDivElement | null>
  ) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  sensitivity?: number;
}

// Linear interpolation helper
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

export default function Floating({
  children,
  className = '',
  sensitivity = 1,
}: FloatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<
    Map<string, { depth: number; ref: React.RefObject<HTMLDivElement | null> }>
  >(new Map());

  // State for animation
  const mouseRef = useRef({ x: 0, y: 0 }); // Target mouse position (-1 to 1)
  const currentRef = useRef({ x: 0, y: 0 }); // Current interpolated position
  const rafRef = useRef<number | null>(null);
  const containerSizeRef = useRef({ width: 0, height: 0, left: 0, top: 0 });

  const registerElement = (
    id: string,
    depth: number,
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    elementsRef.current.set(id, { depth, ref });
  };

  const unregisterElement = (id: string) => {
    elementsRef.current.delete(id);
  };

  // Measure container dimensions once or on resize
  const measureContainer = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    containerSizeRef.current = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };
  }, []);

  useEffect(() => {
    measureContainer();
    window.addEventListener('resize', measureContainer);
    window.addEventListener('scroll', measureContainer); // Recalculate on scroll to keep rect accurate relative to viewport

    return () => {
      window.removeEventListener('resize', measureContainer);
      window.removeEventListener('scroll', measureContainer);
    };
  }, [measureContainer]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { width, height, left, top } = containerSizeRef.current;
      if (width === 0 || height === 0) return;

      const centerX = width / 2;
      const centerY = height / 2;

      // Calculate normalized position (-1 to 1)
      const x = (e.clientX - left - centerX) / centerX;
      const y = (e.clientY - top - centerY) / centerY;

      mouseRef.current = { x, y };
    };

    const animate = () => {
      // Smoothly interpolate current position towards target mouse position
      // Factor 0.1 gives a nice smooth lag (adjust for feel)
      currentRef.current.x = lerp(
        currentRef.current.x,
        mouseRef.current.x,
        0.1
      );
      currentRef.current.y = lerp(
        currentRef.current.y,
        mouseRef.current.y,
        0.1
      );

      const { x, y } = currentRef.current;

      elementsRef.current.forEach(({ depth, ref }) => {
        if (!ref.current) return;

        // Apply movement based on depth
        // Using transform3d for hardware acceleration
        const moveX = x * depth * 30 * sensitivity;
        const moveY = y * depth * 30 * sensitivity;

        ref.current.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    const container = containerRef.current;
    if (container) {
      // We attach to window/document mostly, but if we want it scoped to container hover:
      // Usually parallax works best when tracking mouse over the whole window or a large section
      // Attaching to window ensures smooth tracking even if cursor leaves the container briefly
      window.addEventListener('mousemove', handleMouseMove);
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sensitivity]);

  return (
    <FloatingContext.Provider value={{ registerElement, unregisterElement }}>
      <div ref={containerRef} className={`relative ${className}`}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
}

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  style?: React.CSSProperties;
}

export function FloatingElement({
  children,
  className = '',
  depth = 1,
  style,
}: FloatingElementProps) {
  const context = useContext(FloatingContext);
  const elementRef = useRef<HTMLDivElement>(null);
  // Use a stable ID
  const [id] = useState(() => Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    if (context) {
      context.registerElement(id, depth, elementRef);
      return () => context.unregisterElement(id);
    }
  }, [context, id, depth]);

  return (
    <div
      ref={elementRef}
      // Removed 'transition-transform duration-100 ease-out' to prevent conflict with JS animation loop
      className={`absolute will-change-transform ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
