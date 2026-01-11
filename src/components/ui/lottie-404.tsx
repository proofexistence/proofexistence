'use client';

import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

export function Lottie404() {
  return (
    <DotLottiePlayer
      src="/404_animation.lottie"
      loop
      autoplay
      style={{ width: '100%', maxWidth: 400, height: 'auto' }}
    />
  );
}
