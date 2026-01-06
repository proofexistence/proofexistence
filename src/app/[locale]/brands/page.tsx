import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Palette, Mail } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export const metadata = {
  title: 'Brand Sponsorship | Proof of Existence',
  description:
    'Partner with Proof of Existence 2026. Showcase your brand in the cosmos and be part of digital history.',
};

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-transparent pt-48 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <PageHeader
          title="Brand Sponsorship"
          description="Be part of digital history. Your brand, immortalized in the cosmos, witnessed by thousands creating their proof of existence."
          align="center"
          className="mb-16"
        />

        {/* Why Partner Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Why Partner with Us?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-4">🌌</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Permanent Brand Presence
              </h3>
              <p className="text-zinc-400">
                Your logo appears in our 3D cosmos canvas, visible to every user
                creating their light trail. Immutable and permanent on the
                blockchain.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Creative Integration
              </h3>
              <p className="text-zinc-400">
                Brand lines in the cosmos, custom colors, interactive elements.
                Your brand becomes part of the collective art experience.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Engaged Audience
              </h3>
              <p className="text-zinc-400">
                Reach Web3-native users actively participating in a year-long
                experiment. High engagement, meaningful interactions.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-xl font-bold text-white mb-3">
                On-Chain Attribution
              </h3>
              <p className="text-zinc-400">
                All sponsorships recorded on-chain with cryptographic proof.
                Transparent and verifiable brand partnerships.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Integration Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <Palette className="w-8 h-8 text-purple-500" />
            See It In Action
          </h2>
          <p className="text-zinc-400 mb-8">
            Your brand becomes part of the immersive experience, appearing both
            in the drawing canvas and the infinite cosmos view.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Canvas Integration Screenshot */}
            <div className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
              <div className="relative w-full aspect-video">
                <Image
                  src="/brand_canvas.webp"
                  alt="Brand logo appears on the canvas as users draw their light trails"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Canvas Presence
                  </h3>
                  <p className="text-sm text-zinc-300">
                    Your brand appears elegantly on the drawing canvas, visible
                    to every user creating their proof of existence.
                  </p>
                </div>
              </div>
            </div>

            {/* Cosmos Integration Screenshot */}
            <div className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
              <div className="relative w-full aspect-video">
                <Image
                  src="/brand_cosmos.webp"
                  alt="Brand integration in the cosmos view with light trails"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Cosmos Visibility
                  </h3>
                  <p className="text-sm text-zinc-300">
                    Brand lines and logos integrated into the 3D cosmos,
                    creating memorable associations with the collective art.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Partners - Hidden for now */}
        {/* <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <Globe2 className="w-8 h-8 text-cyan-500" />
            Current Partners
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8 backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all">
              <div className="relative w-full h-24 mb-4 flex items-center justify-center">
                <Image
                  src="/brands/arweave.png"
                  alt="Arweave"
                  width={160}
                  height={80}
                  className="object-contain"
                />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">
                Arweave
              </h3>
              <p className="text-sm text-zinc-500 text-center">
                Permanent Data Storage
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all">
              <div className="relative w-full h-48">
                <Image
                  src="/brand_canvas.webp"
                  alt="Brand integration on canvas"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white text-center mb-2">
                  Canvas Integration
                </h3>
                <p className="text-sm text-zinc-500 text-center">
                  Brands appear on the drawing canvas
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all">
              <div className="relative w-full h-48">
                <Image
                  src="/brand_cosmos.webp"
                  alt="Brand integration in cosmos"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white text-center mb-2">
                  Cosmos Integration
                </h3>
                <p className="text-sm text-zinc-500 text-center">
                  Brands shine in the infinite cosmos
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Sponsorship Options */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-cyan-500" />
            Sponsorship Packages
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Constellation Tier */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                Constellation
              </h3>
              <p className="text-zinc-400 text-sm mb-6">Static logo presence</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-cyan-400 mt-1">✓</span>
                  Logo in partner gallery
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-cyan-400 mt-1">✓</span>
                  Brand mention in footer
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-cyan-400 mt-1">✓</span>
                  On-chain attribution
                </li>
              </ul>
            </div>

            {/* Galaxy Tier */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold text-white">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Galaxy</h3>
              <p className="text-zinc-400 text-sm mb-6">Cosmos integration</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-pink-400 mt-1">✓</span>
                  Everything in Constellation
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-pink-400 mt-1">✓</span>
                  Brand line in 3D cosmos
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-pink-400 mt-1">✓</span>
                  Custom color scheme
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-pink-400 mt-1">✓</span>
                  Monthly analytics
                </li>
              </ul>
            </div>

            {/* Universe Tier */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-2">Universe</h3>
              <p className="text-zinc-400 text-sm mb-6">Custom integration</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-yellow-400 mt-1">✓</span>
                  Everything in Galaxy
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-yellow-400 mt-1">✓</span>
                  Interactive brand elements
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-yellow-400 mt-1">✓</span>
                  Dedicated landing page
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-yellow-400 mt-1">✓</span>
                  Co-marketing opportunities
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-[#0CC9F2]/10 via-[#4877DA]/10 to-[#7E44DB]/10 border border-white/20 rounded-2xl p-12 text-center">
          <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Interested in Partnering?
          </h2>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto">
            Join us in creating digital history. Let&apos;s discuss how your
            brand can be part of the Proof of Existence 2026 experiment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="mailto:partnerships@proofexistence.com"
              className="px-8 py-3 bg-gradient-to-r from-[#0CC9F2] via-[#4877DA] to-[#7E44DB] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Contact Us
            </Link>
            <Link
              href="/cosmos"
              className="px-8 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              See the Cosmos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
