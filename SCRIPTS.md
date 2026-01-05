# Scripts 使用說明

## 目錄
- [Cron Job 流程](#cron-job-流程)
- [常用腳本](#常用腳本)
- [部署腳本](#部署腳本)
- [檢查腳本](#檢查腳本)
- [測試腳本](#測試腳本)
- [工具腳本](#工具腳本)

---

## Cron Job 流程

### Daily Cron (`/api/cron/daily`)

每日 00:00 UTC 執行，包含三個任務：

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily Cron Job                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. runSettle()                                             │
│     ├─ 收集所有 PENDING sessions                            │
│     ├─ 生成 Merkle tree                                     │
│     ├─ 上傳到 Irys (Arweave)                                │
│     ├─ 調用 emitBatchProof() 上鏈                           │
│     └─ 更新 session 狀態為 SETTLED                          │
│                                                             │
│  2. runRewards()                                            │
│     ├─ 計算昨日所有用戶的繪畫時間                           │
│     ├─ 按時間加權分配 86,301.37 TIME26                      │
│     ├─ 寫入 daily_rewards 和 user_daily_rewards             │
│     └─ 累加到用戶的 time26_balance                          │
│                                                             │
│  3. runBurnAndMerkle()                                      │
│     ├─ 燃燒 time26_pending_burn (如有)                      │
│     ├─ 用當前 time26_balance 生成新 Merkle tree             │
│     ├─ 調用 setRewardsMerkleRoot() 更新鏈上                 │
│     └─ 用戶可用新 proof 領取獎勵                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 手動執行 Cron

```bash
# 本地測試 (需要 dev server 運行)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily

# 手動更新 Merkle Root (不需要 server)
bun run scripts/run-cron-burn.ts
```

### Vercel Cron 設定

在 `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 常用腳本

### `run-cron-burn.ts`
手動更新 Merkle Root，用於：
- 資料庫餘額變更後需要立即讓用戶領取
- Cron 執行失敗後的手動修復

```bash
bun run scripts/run-cron-burn.ts
```

### `check-operator-wallet.cjs`
檢查 Operator 錢包餘額（用於 gas）

```bash
node scripts/check-operator-wallet.cjs
```

### `check-proof-recorder.cjs`
檢查 ProofRecorder 合約狀態

```bash
node scripts/check-proof-recorder.cjs
```

### `fund-irys.cjs`
為 Irys 充值（用於 Arweave 存儲）

```bash
node scripts/fund-irys.cjs
```

### `check-irys-balance.cjs`
檢查 Irys 餘額

```bash
node scripts/check-irys-balance.cjs
```

---

## 部署腳本

### `deploy-amoy-proof-recorder.cjs`
部署 ProofRecorder 到 Amoy 測試網

```bash
npx hardhat run scripts/deploy-amoy-proof-recorder.cjs --network amoy
```

### `deploy-prod.cjs`
部署到 Polygon 主網

```bash
npx hardhat run scripts/deploy-prod.cjs --network polygon
```

### `deploy-v3.cjs`
部署 v3 版本合約

```bash
npx hardhat run scripts/deploy-v3.cjs --network polygon
```

### `verify-contracts.cjs`
在 Polygonscan 驗證合約

```bash
node scripts/verify-contracts.cjs
```

---

## 檢查腳本

| 腳本 | 用途 | 執行方式 |
|------|------|----------|
| `check-balance.cjs` | 檢查錢包餘額 | `node scripts/check-balance.cjs` |
| `check-contract-config.cjs` | 檢查合約設定 | `node scripts/check-contract-config.cjs` |
| `check-mint.cjs` | 檢查 mint 狀態 | `node scripts/check-mint.cjs` |
| `check-time26-balances.cjs` | 檢查 TIME26 餘額 | `node scripts/check-time26-balances.cjs` |
| `check-time26-status.ts` | 檢查 TIME26 狀態 | `bun run scripts/check-time26-status.ts` |
| `check-trailnft-owner.cjs` | 檢查 TrailNFT owner | `node scripts/check-trailnft-owner.cjs` |
| `check-all-time26.cjs` | 檢查所有 TIME26 相關 | `node scripts/check-all-time26.cjs` |

---

## 測試腳本

| 腳本 | 用途 | 執行方式 |
|------|------|----------|
| `test-nft-mint.ts` | 測試 NFT mint | `bun run scripts/test-nft-mint.ts` |
| `test-pol-payment.ts` | 測試 POL 支付 | `bun run scripts/test-pol-payment.ts` |
| `test-time26-payment.ts` | 測試 TIME26 支付 | `bun run scripts/test-time26-payment.ts` |
| `test-settle.ts` | 測試 settle 流程 | `bun run scripts/test-settle.ts` |
| `test-rpc.ts` | 測試 RPC 連接 | `bun run scripts/test-rpc.ts` |

---

## 工具腳本

### `migrate-pending-burn.cjs`
遷移 pending burn 數據

```bash
node scripts/migrate-pending-burn.cjs
```

### `migrate-time26.cjs`
遷移 TIME26 相關數據

```bash
node scripts/migrate-time26.cjs
```

### `backfill-rewards.ts`
回填獎勵數據

```bash
bun run scripts/backfill-rewards.ts
```

### `add-test-balance.cjs`
添加測試餘額（僅測試網）

```bash
node scripts/add-test-balance.cjs
```

### `update-wallets.cjs`
更新錢包設定

```bash
node scripts/update-wallets.cjs
```

### `set-pricing.ts` / `set-pricing-v4.cjs`
設定合約價格

```bash
bun run scripts/set-pricing.ts
# 或
node scripts/set-pricing-v4.cjs
```

---

## 環境變數

腳本需要以下環境變數（在 `.env.local`）：

```bash
# 必要
PRIVATE_KEY=           # 部署/操作錢包私鑰
OPERATOR_PRIVATE_KEY=  # Operator 錢包私鑰（用於 cron）
DATABASE_URL=          # NeonDB 連接字串

# 網路
NEXT_PUBLIC_IS_TESTNET=true  # true=Amoy, false=Polygon
NEXT_PUBLIC_RPC_URL=         # RPC URL

# Cron
CRON_SECRET=           # Cron job 驗證密鑰

# Admin
ADMIN_WALLETS=         # Admin 錢包地址（逗號分隔）
```

---

## 常見問題

### Q: Merkle Root 不匹配，用戶無法領取
A: 運行 `bun run scripts/run-cron-burn.ts` 更新鏈上 Merkle Root

### Q: Irys 上傳失敗
A: 運行 `node scripts/check-irys-balance.cjs` 檢查餘額，不足時用 `node scripts/fund-irys.cjs` 充值

### Q: Operator gas 不足
A: 運行 `node scripts/check-operator-wallet.cjs` 檢查，需手動轉 POL 到 operator 地址

### Q: 如何驗證新部署的合約
A: 運行 `node scripts/verify-contracts.cjs` 並按提示操作
