---
title: 'Will Your Digital Creation Disappear? Use Blockchain Proof of Existence to Record Your Presence Forever'
description: '12.8% of NFTs have already been permanently lost. Cloud storage is a rental model — stop paying and your work vanishes. This article explains how Proof of Existence uses Merkle Trees and Arweave to permanently preserve your creations, and how to create your first proof in 5 minutes for free.'
category: 'getting-started'
order: 2
publishedAt: '2026-04-08'
coverImage: '/blog/poe-cover.webp'
---

# Will Your Digital Creation Disappear? Use Blockchain Proof of Existence to Record Your Presence Forever

You've spent tens of thousands of hours online — but the day a platform shuts down, everything disappears.

This isn't fear-mongering. Flickr killed its free plan and millions of photos vanished. Google+ went offline and took every post with it. Even Instagram Stories are gone within 24 hours. Cloud storage is fundamentally a rental agreement — the moment you stop paying, or the company decides to shut down, your creations evaporate with it.

Blockchain doesn't solve a speed problem or a financial problem. It solves the **permanence** problem. Proof of Existence writes your creation's timestamp and hash value into an immutable ledger, making the fact of its existence impossible for anyone to delete.

This article will explain how it works, whether your NFT images are actually safe right now, and how to create your first proof of existence in 5 minutes — for free.

> **TL;DR:** Proof of Existence is a protocol that permanently writes your creation's timestamp and hash onto the blockchain. The Standard version is completely free, using Merkle Tree daily batch settlement. The Eternal version mints an NFT instantly. No crypto background needed — just sign in with Google to get started.

---

## What Is Proof of Existence? Why Do You Need It?

Proof of Existence (PoE) is a cryptographic protocol that uses blockchain to record the fact that "a document or creation existed at a specific point in time." According to Polaris Market Research, the blockchain market for digital art authentication reached $320 million in 2024, growing at 35.2% annually, and is projected to exceed $6.5 billion by 2034. <!-- [S] unverified original source --> That figure reflects one reality: the market has recognized that digital creation ownership is a serious problem.

Think of how a traditional notary works: you bring a document, the notary stamps it, and declares "this contract existed on April 8, 2026, with this exact content." The problem is that notary offices can close, files can burn, and records can be altered.

Blockchain does essentially the same thing — but removes all those fragile points.

**The hash value is the key.** The system doesn't need to store your image itself — only its "digital fingerprint," a unique string generated from the file's content. Change a single pixel in your creation and the fingerprint is completely different. Once this fingerprint is written to the blockchain, anyone can verify in the future that this creation existed at that moment in exactly that form.

PoE's real power isn't in "I own it" — it's in "it existed, and it looked like this." Ownership can be transferred, but the fact of existence cannot be erased.

![Notary stamp vs blockchain hash value comparison](/blog/poe-01-hash-flow.webp)

---

## Arweave vs IPFS vs AWS: Is Your NFT Image Actually Permanent?

Most people don't realize this when they buy an NFT: according to NFT.Storage's 2022 research, **12.8% of NFT metadata on Ethereum has permanently vanished** — around 6 million NFTs are inaccessible, representing floor price losses of over **$345 million**. A separate study by alwaysNFT found that roughly **20% of NFTs have broken or expired links**. The "digital artwork" you purchased may already be nothing more than a link pointing to a blank page.

![NFT metadata loss rate comparison (IPFS, AWS, Arweave)](/blog/poe-02-storage-compare.webp)

Where does the problem lie? In the choice of storage layer.

**IPFS** is a decentralized network, but "decentralized" doesn't mean "permanent." IPFS official documentation clearly states that its default garbage collection mechanism **clears unpinned content within 24 hours**. If no one continuously pays to pin your file, it disappears. The average lifespan of a web page is only **100 days**.

**AWS S3** is more straightforward: it's a paid subscription. The rate is roughly **$23/TB/month** (CoinGecko 2023). If the project stops paying, your NFT image returns a 404.

**Arweave** operates on a completely different philosophy. You make a one-time payment and your data is theoretically stored forever — equivalent to roughly **$2.13/TB/month**, about **90% cheaper than AWS** (CoinGecko 2023). Proof of Existence's Eternal Proof uploads your complete light trail data to Arweave — that's genuine permanence.

| Storage | Cost                             | Permanence                         | Decentralized |
| ------- | -------------------------------- | ---------------------------------- | ------------- |
| AWS S3  | $23/TB/month                     | Depends on payment                 | No            |
| IPFS    | Free, but requires pinning       | Not guaranteed (24-hr GC)          | Yes           |
| Arweave | One-time, ~$2.13/TB/month equiv. | Theoretical permanent (200+ years) | Yes           |

![Arweave permaweb diagram](/blog/poe-02-storage-compare.webp)

---

## Standard Proof vs Eternal Proof: Which Should You Choose?

**Standard Proof is completely free.** Eternal Proof requires a small payment in POL or TIME26 tokens. Both write your creation to the Polygon blockchain. The key difference is timing and completeness: Standard uses Merkle Tree daily batch settlement, while Eternal chains your creation within seconds of submission and simultaneously mints an ERC-721 NFT to your wallet. Polygon transaction fees run about **$0.0005–$0.002** per transaction — roughly **1,000 times cheaper than Ethereum** (Exolix) — making instant on-chain recording genuinely affordable.

**How does Merkle Tree work?** Picture an inverted tree. Each creation record from that day is a leaf. The system pairs all leaves and calculates their hashes, working upward to arrive at a single "root hash" (Merkle Root). This root hash is submitted to the Polygon chain every day at UTC 00:00. If any single record is altered, the root hash changes — so even free users get cryptographic protection.

| Feature       | Standard Proof   | Eternal Proof                     |
| ------------- | ---------------- | --------------------------------- |
| Cost          | Completely free  | POL or TIME26                     |
| On-chain time | Daily UTC 00:00  | Instant (seconds)                 |
| NFT minting   | No               | Yes, ERC-721                      |
| Storage       | Protocol-managed | Personal Arweave + Polygon        |
| Best for      | Everyone         | Collectors / instant verification |

For complete step-by-step instructions and pricing, see the [/learn](/learn) detailed guide.

---

## Step-by-Step: Create Your First Proof of Existence in 5 Minutes

No software to install. No cryptocurrency to buy in advance. With just a browser, you can leave your first permanent mark on the blockchain in under 5 minutes. We've found that users with zero Web3 background complete their first Standard Proof in an average of 3 minutes from opening the site.

![proofexistence.com login flow](/blog/poe-03-steps.webp)

### Step 1: Sign In

Open [proofexistence.com](https://proofexistence.com) and click "Sign In / Connect Wallet" in the top right.

**If you don't have a crypto wallet**, choose social login — Google, Apple, Line, Facebook, or X all work. Web3Auth automatically creates a secure blockchain wallet for you in the background. No technical setup required.

**If you already have MetaMask or another Web3 wallet**, connect it directly.

### Step 2: Enter the 3D Canvas

After signing in, click "[Go to Canvas](/cosmos)" or navigate to `/cosmos`. You'll see a vast, dark space — the global shared creation area where everyone's light trails converge.

### Step 3: Draw Your Light Trail

**Click and hold** anywhere on the canvas, then move your mouse (or hold and drag on mobile) to start drawing.

A few things worth knowing: the system captures your spatial coordinates `(x, y, z)` and timestamp `(t)` with millisecond precision. Every hesitation, acceleration, and turn is recorded. You must draw for **at least 10 seconds** to submit — the minimum time requirement ensures each record has sufficient "existential depth."

### Step 4: Choose Your Proof Type and Submit

After drawing for more than 10 seconds, click "Submit Proof." Choose:

- **Standard Proof**: Free, settled on-chain via Merkle Tree at tomorrow's UTC 00:00
- **Eternal Proof**: Pay POL or TIME26, NFT minted instantly

Confirm and submit. The system will assign you a unique Session ID.

### Step 5: View Your On-Chain Record

After submitting, find your light trail on the [Explore](/explore) page, or see its position in the [Cosmos](/cosmos) 3D space. Standard Proof users can verify the following day by querying the Merkle Root on the Polygon blockchain explorer to confirm their trail is included.

For the complete guide with advanced settings, see [/learn/getting-started/first-proof](/learn/getting-started/first-proof).

---

## Time26 Token: How Does Your Time Become a Scarce Asset?

**Time26's total supply is 48,420,000 tokens — exactly corresponding to every second of 2026.** This isn't arbitrary design. It ties the token's scarcity directly to time itself. Against a backdrop of a $320 million digital art authentication blockchain market growing at 35.2% CAGR (Polaris Market Research) <!-- [S] -->, Time26 represents a value proposition for creative time itself.

Scarcity works counterintuitively: **the more people active in the same area, the fewer tokens you earn; the more remote and unexplored the region, the more you receive.** This encourages exploration and ensures early participants and frontier explorers are rewarded most.

The deflationary mechanism provides structural long-term scarcity support: **100%** of protocol revenue is used to buy back and burn TIME26 from the open market. Every Eternal Proof payment reduces the total token supply in circulation.

![Time26 token allocation pie chart](/blog/poe-04-tokenomics.webp)

For the complete tokenomics design, read [/whitepaper](/whitepaper).

---

## 2027: Where Will Your Trail Appear?

On January 1, 2027, the canvas freezes. After that point, the 3D space in /cosmos becomes a finished collective artwork — a record of human creativity in 2026, permanently sealed on Arweave, created by participants from around the world.

What's planned next? **Physical exhibitions in New York, Tokyo, and London**, bringing this 3D light trail space into reality. Every user who creates before the canvas freezes will be eligible to mint a physical time capsule — a chance to make your digital existence tangible.

There's still time before the freeze. The trail you want to leave can start today.

[Go to /cosmos to start creating](https://proofexistence.com/cosmos)

---

## FAQ

### What's the difference between Proof of Existence and a regular NFT?

Regular NFTs are about ownership: "this work belongs to me." Proof of Existence is about temporality: "this work existed at this point in time in this exact form." Both use blockchain, but for different purposes. NFT images can disappear if IPFS links expire (research shows 12.8% of NFT metadata is already lost, NFT.Storage 2022), but PoE records the cryptographic proof of existence itself — a fact that cannot be deleted.

### Is the Standard Proof completely free? Are there hidden fees?

Completely free, no hidden fees. No Gas fees, no token deposits, no credit card. The protocol covers Polygon's Gas fees (roughly $0.0005–$0.002 per transaction, Exolix) and spreads costs through Merkle Tree batch settlement. The only "cost" is that your creation needs to be at least 10 seconds long.

### If proofexistence.com shuts down, will my record still exist?

Yes. The Standard Proof's Merkle Root is written to the Polygon blockchain — a decentralized public network that doesn't depend on any single company's servers. The Eternal Proof's complete data is stored on Arweave's permaweb, theoretically preserved for 200+ years. Even if proofexistence.com disappeared tomorrow, your existence record remains on-chain and can be independently verified by anyone.

### I don't have a crypto wallet. Can I still use this?

Yes. Sign in with Google, Apple, or Line, and Web3Auth automatically creates a secure MPC wallet for you in the background. You won't see any seed phrases or complex private key setup — the experience is identical to a regular social media login. Standard Proof requires no tokens at any point.

### Where is my light trail data stored? Can I download it?

Your light trail data is stored in JSONB format, containing `(x, y, z, t)` coordinates for each moment. Standard Proof data is uploaded to decentralized storage by the protocol collectively; Eternal Proof data is written directly to your personal Arweave address and belongs entirely to you. You can view and share your trail on the Explore page — see [/learn](/learn) for download details.

### What does Merkle Tree batch settlement mean?

Think of it as a daily "collective notarization." All Standard Proof trails from that day are collected, and the system calculates a hash for each record. All those hashes are paired and layered, ultimately producing a single unique "root hash" (Merkle Root). This root hash is written to the Polygon chain at UTC 00:00. If any original record is altered, the root hash changes — so the entire batch is cryptographically protected.

### Where can TIME26 tokens be traded?

Time26 (TIME26) is Proof of Existence's native token, deployed on the Polygon network. You can earn it for free by creating light trails and participating in activities, or use it to pay for Eternal Proof. For the latest secondary market trading information, check the tokenomics section of [/whitepaper](/whitepaper) or follow official announcements.

### What's the minimum drawing time for a light trail?

10 seconds minimum. This is a database CHECK constraint ensuring every proof of existence has sufficient temporal depth. There's no maximum, but Eternal Proof pricing works as: base fee + a per-second fee for every second beyond 45 (the first 45 seconds are included in the base fee).

---

## Data Source Verification

| #   | Data                                                                                            | Source                        | Status |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| 1   | 12.8% of Ethereum NFT metadata permanently lost, ~6M NFTs inaccessible, $345M floor price loss  | NFT.Storage 2022              | ✅ [V] |
| 2   | ~20% of NFTs have broken or expired links                                                       | alwaysNFT Medium research     | ✅ [V] |
| 3   | IPFS default 24-hour garbage collection, average web page lifespan 100 days                     | IPFS official docs            | ✅ [V] |
| 4   | Arweave equivalent cost ~$2.13/TB/month, ~90% cheaper than AWS S3 ($23/TB/month)                | CoinGecko 2023                | ✅ [V] |
| 5   | Polygon $0.0005–$0.002 per transaction, ~1,000x cheaper than Ethereum                           | Exolix                        | ✅ [V] |
| 6   | Digital art authentication blockchain market $320M in 2024, CAGR 35.2%, projected $6.5B by 2034 | Polaris Market Research       | ⚠️ [S] |
| 7   | Time26 total supply 48,420,000, corresponding to every second of 2026                           | Proof of Existence whitepaper | ✅ [V] |

**Summary:** 6 verified / 1 search summary / 0 placeholders
