# Daisy POE Daily NFT Mint System

> 設計日期：2026-02-03
> 狀態：待實施

## 概述

將每日 Daisy POE 視覺化藝術轉化為 NFT，創建「Daisy Chronicles」收藏系列。每天根據所有參與者的 session 數據生成獨特的雛菊藝術作品，提供 Genesis（唯一版）和 Standard（限量版）兩種版本。

## 核心設計決策

### 區塊鏈與平台

| 項目 | 決策 |
|-----|------|
| 區塊鏈 | Polygon（與現有系統一致） |
| 合約類型 | 自訂合約（價格邏輯鏈上計算） |
| 一級銷售 | 自建頁面 `/poe/daisy/mint` |
| 二級市場 | OpenSea（自動索引） |
| 錢包整合 | 現有 Web3Auth |

### 版本結構

```
每日發售：
├─ Genesis Edition (1/1)
│   ├─ 格式：MP4 動畫（10 秒循環，壓縮版）
│   ├─ 內容：完整 60 秒綻放動畫
│   └─ 銷售：英式拍賣 24 小時
│
└─ Standard Edition (無上限)
    ├─ 格式：PNG 靜態圖
    ├─ 內容：動畫結束後的最終畫面
    └─ 銷售：動態定價
```

### 銷售模式

**階段一（2026/01/01 - 2026/02/28）：創世回溯期**
- 固定數量模式（Genesis 1 + Standard 不限）
- 同時上架，不設時間限制
- 營銷定位：「收集 2026 開年的珍貴日子」

**階段二（2026/03/01 起）：每日時限模式**
- 每天 UTC 00:00 開放，23:59 關閉
- 營銷定位：「今天錯過，永遠錯過」

---

## 定價機制

### Genesis 拍賣

- 類型：英式拍賣（價高者得）
- 起拍價：250 POL（約 0.1 ETH）
- 規則：
  - 每次出價至少 +10%
  - 24 小時倒數
  - 最後 10 分鐘有新出價 → 延長 10 分鐘
- 無人出價：鑄造到項目金庫

### Standard 動態定價

```
最終價格 = 季度基準價 × 時間乘數 × 參與人數乘數 × 特殊日期乘數
```

**季度基準價：**
| 季度 | 基準價 |
|-----|--------|
| Q1 | 25 POL |
| Q2 | 35 POL |
| Q3 | 50 POL |
| Q4 | 75 POL |

**時間乘數（T1 - 倒數漲價）：**
| 剩餘時間 | 乘數 |
|---------|------|
| > 12 小時 | ×1.0 |
| 6-12 小時 | ×1.1 |
| 1-6 小時 | ×1.25 |
| < 1 小時 | ×1.5 |

**參與人數乘數（H1）：**
| 當日參與人數 | 乘數 |
|-------------|------|
| < 50 人 | ×1.0 |
| 50-200 人 | ×1.2 |
| 200-500 人 | ×1.5 |
| > 500 人 | ×2.0 |

**特殊日期乘數（R1）：**
| 類型 | 乘數 |
|-----|------|
| 一般日 | ×1.0 |
| 週末 | ×1.2 |
| 節日 | ×2.0 |
| 專案週年 | ×3.0 |

### 2026 特殊日期清單

| 日期 | 節日 | 乘數 |
|-----|------|------|
| 01/01 | 元旦 | ×2 |
| 01/29 | 農曆新年 | ×2 |
| 02/14 | 情人節 | ×2 |
| 03/14 | 白色情人節 | ×2 |
| 04/05 | 復活節 | ×2 |
| 05/10 | 母親節 | ×2 |
| 06/21 | 父親節 | ×2 |
| 07/04 | 美國國慶 | ×1.5 |
| 08/19 | 七夕 | ×2 |
| 10/31 | 萬聖節 | ×2 |
| 11/26 | 感恩節 | ×1.5 |
| 12/25 | 聖誕節 | ×2 |
| 12/31 | 跨年夜 | ×2 |
| TBD | 專案週年 | ×3 |

---

## 參與者免費鑄造

當天有創建 session 的用戶可免費鑄造 Standard 版本。

**驗證方式：** Merkle Tree 白名單
```
每日 Cron：
├─ 收集當天所有 session 創建者的錢包地址
├─ 生成 Merkle Root 存到合約
└─ 用戶用 Merkle Proof 證明資格
```

**限制：** 每人每天限鑄 1 個

---

## 風險緩解機制

### 冷啟動應對

1. **參與者免費鑄**：保證每天有基本鑄造量
2. **項目保底鑄造**：系統每天自動鑄造 1 個 Standard 到金庫
3. **彈性調整**：連續 7 天銷量 < 3，可調整定價或模式

### 緊急暫停

- 合約包含 `pause()` 功能
- 需要多簽（2/3）才能觸發
- 用途：定價 bug、合約攻擊、外部依賴故障

---

## 存儲架構

所有資產上傳至 Arweave（永久存儲）：

| 內容 | 格式 | 預估大小 |
|-----|------|---------|
| Genesis 動畫 | MP4（10 秒循環） | 2-3 MB |
| Standard 靜態圖 | PNG | 0.5-1 MB |
| Session 原始數據 | JSON | < 100 KB |
| Metadata | JSON | < 10 KB |

**未來擴展：** 獲得贊助後可提供高畫質版本（完整 60 秒 4K 動畫）

---

## NFT Metadata 結構

```json
{
  "name": "Daisy POE - 2026.02.01 #1",
  "description": "2026 年 2 月 1 日，89 位參與者共同創作的雛菊。這朵花記錄了那一天 127 個 sessions 的集體證明。",
  "image": "ar://...",
  "animation_url": "ar://...",
  "external_url": "https://proofexistence.com/poe/daisy/2026-02-01",
  "attributes": [
    {"trait_type": "Date", "value": "2026-02-01"},
    {"trait_type": "Edition", "value": "Genesis"},
    {"trait_type": "Sessions Count", "value": 127},
    {"trait_type": "Participants", "value": 89},
    {"trait_type": "Dominant Color", "value": "Coral Pink"},
    {"trait_type": "Theme", "value": "Murakami Pop"},
    {"trait_type": "Special Day", "value": "None"}
  ],
  "properties": {
    "session_data": "ar://完整數據的Arweave連結",
    "contributors_count": 89
  }
}
```

**Attributes 說明：**
- `Date`：日期
- `Edition`：Genesis / Standard
- `Sessions Count`：當天 session 總數
- `Participants`：參與人數
- `Dominant Color`：主色調
- `Theme`：當日主題（12 種輪替）
- `Special Day`：節日標記（None / 節日名稱）

---

## 每日自動化流程

**觸發時機：** UTC 00:00

```
1. 收集數據
   ├─ 獲取昨日所有 sessions
   ├─ 計算參與人數
   └─ 判斷特殊日期

2. 生成視覺
   ├─ 渲染 60 秒動畫
   ├─ 壓縮為 10 秒循環 MP4（Genesis）
   ├─ 擷取最終幀 PNG（Standard）
   └─ 失敗重試 3 次，仍失敗則通知人工

3. 上傳存儲
   ├─ 上傳 MP4 到 Arweave
   ├─ 上傳 PNG 到 Arweave
   ├─ 上傳 session JSON 到 Arweave
   └─ 生成 Metadata JSON 並上傳

4. 鏈上操作
   ├─ 生成參與者 Merkle Root
   ├─ 呼叫合約設定當日 NFT 資訊
   ├─ 啟動 Genesis 拍賣
   └─ 開放 Standard 鑄造

5. 通知發送
   ├─ Discord Webhook 發公告
   ├─ Twitter API 自動推文
   └─ 站內通知參與者
```

---

## 前端頁面

### 新增頁面：`/poe/daisy/mint`

**功能：**
- 今日 Daisy 預覽（動畫播放）
- Genesis 拍賣狀態 / 出價按鈕
- Standard 購買按鈕（顯示動態價格即時計算）
- 歷史日期瀏覽 + 購買
- 我的收藏展示
- 參與者免費鑄造入口

### 現有頁面整合：`/poe/daisy`

- 新增「鑄造這一天」按鈕連結到 mint 頁面

---

## 通知系統

**管道：**
1. Discord Webhook
2. Twitter API 自動推文
3. 站內通知（參與者）

**通知模板：**
```
🌼 2026.02.15 Daisy 已上架！

📊 今日數據：
├─ 參與者：89 人
├─ Sessions：127 個
├─ 主題：Murakami Pop
└─ 主色調：Coral Pink

💎 Genesis 拍賣中：250 POL 起
🌸 Standard：32 POL（動態價格）

🎁 有參與的你可以免費鑄造！

🔗 proofexistence.com/poe/daisy/mint
```

---

## 收益與版稅

| 項目 | 設定 |
|-----|------|
| 二級市場版稅 | 5% |
| 收益分配 | 100% 項目方 |

---

## Collection 資訊

| 項目 | 值 |
|-----|-----|
| 名稱 | POE 2026 - Daisy Chronicles |
| Symbol | DAISY26 |
| 區塊鏈 | Polygon |
| 合約標準 | ERC-721（Genesis）+ ERC-1155（Standard） |

---

## 智能合約架構

### 主要合約功能

```solidity
contract DaisyChronicles {
    // 管理員功能
    function setDailyDaisy(
        uint256 date,           // 20260201
        string memory genesisURI,
        string memory standardURI,
        bytes32 merkleRoot,     // 參與者白名單
        uint256 participantCount,
        bool isSpecialDay,
        uint256 specialDayMultiplier
    ) external onlyOperator;

    // Genesis 拍賣
    function bidGenesis(uint256 date) external payable;
    function settleAuction(uint256 date) external;

    // Standard 鑄造
    function mintStandard(uint256 date) external payable;
    function mintStandardFree(uint256 date, bytes32[] proof) external;

    // 動態定價查詢
    function getStandardPrice(uint256 date) public view returns (uint256);

    // 緊急控制（多簽）
    function pause() external onlyMultisig;
    function unpause() external onlyMultisig;
}
```

---

## 預估成本

### 每日運營成本

| 項目 | 成本 |
|-----|------|
| Arweave 存儲（~4MB/天） | ~$0.20 |
| Polygon Gas（合約呼叫） | ~$0.01 |
| 伺服器（Cron + 渲染） | 現有基礎設施 |
| **每日總計** | **~$0.21** |
| **年度總計** | **~$77** |

### 開發成本

| 項目 | 工時預估 |
|-----|---------|
| 智能合約開發 | 40 小時 |
| 合約測試與審計 | 20 小時 |
| 前端 mint 頁面 | 30 小時 |
| 自動化 pipeline | 20 小時 |
| 通知系統整合 | 10 小時 |
| **總計** | **~120 小時** |

---

## 實施順序建議

1. **智能合約**
   - 開發 DaisyChronicles 合約
   - 單元測試
   - 部署到 Polygon Amoy 測試網

2. **視覺生成 Pipeline**
   - MP4 動畫輸出功能
   - PNG 擷取功能
   - Arweave 上傳整合

3. **前端 Mint 頁面**
   - 基本購買流程
   - 動態價格顯示
   - 拍賣出價介面

4. **自動化 Cron**
   - 每日生成腳本
   - 合約互動
   - 失敗重試機制

5. **通知系統**
   - Discord Webhook
   - Twitter API
   - 站內通知

6. **回溯上架**
   - 生成 1/1 - 2/28 歷史數據
   - 批次上傳與鑄造

---

## 開放問題

1. **高畫質版本觸發條件**：贊助達到多少金額解鎖？
2. **專案週年日期**：確定具體日期
3. **Genesis 流拍後重新拍賣**：金庫中的 Genesis 是否會重新上架？
4. **跨年處理**：2027 年是否延續同一 Collection 還是新開？

---

## 附錄：定價範例計算

**情境：Q1 某個週六，200 人參與，剩餘 3 小時**

```
基準價：25 POL（Q1）
時間乘數：×1.25（剩 1-6 小時）
參與人數乘數：×1.5（200-500 人）
特殊日期乘數：×1.2（週末）

最終價格 = 25 × 1.25 × 1.5 × 1.2 = 56.25 POL
```
