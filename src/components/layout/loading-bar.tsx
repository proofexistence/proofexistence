'use client';

import NextTopLoader from 'nextjs-toploader';

export function LoadingBar() {
  return (
    <NextTopLoader
      color="#EC4899"
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow="0 0 10px #EC4899,0 0 5px #EC4899"
    />
  );
}
