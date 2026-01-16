'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Clock, Sparkles, ArrowRight, X } from 'lucide-react';

interface CanvasOnboardingModalProps {
  onComplete?: () => void;
}

export function CanvasOnboardingModal({
  onComplete,
}: CanvasOnboardingModalProps) {
  const [show, setShow] = useState(false);
  const t = useTranslations('onboarding');

  useEffect(() => {
    // Always show onboarding - some users skip without reading
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    onComplete?.();
  };

  const steps = [
    {
      icon: <Pencil className="w-6 h-6" />,
      title: t('step1.title'),
      description: t('step1.description'),
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: t('step2.title'),
      description: t('step2.description'),
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: t('step3.title'),
      description: t('step3.description'),
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 to-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 pb-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center"
              >
                <Pencil className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('title')}
              </h2>
              <p className="text-zinc-400 text-sm">{t('subtitle')}</p>
            </div>

            {/* Steps */}
            <div className="px-6 space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white`}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {step.title}
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Free badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mx-6 mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span className="text-base">✓</span>
                <span className="font-medium">{t('freeNote')}</span>
              </div>
            </motion.div>

            {/* CTA Button */}
            <div className="p-6">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={handleClose}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                {t('startButton')}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
