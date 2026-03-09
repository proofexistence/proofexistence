#!/bin/bash
set -e

echo "Rendering POE Promo Video..."
bunx remotion render src/Root.tsx PromoVideo out/promo.mp4 \
  --codec h264 \
  --image-format jpeg \
  --quality 80

echo "Done! Output: out/promo.mp4"
