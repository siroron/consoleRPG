# コンソールRPG 設計書

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Console Quest（仮） |
| 種別 | ターミナル上で動作する本格コンソールRPG |
| プラットフォーム | CUI（Windows / macOS / Linux） |
| 開発言語 | TypeScript（Node.js 実行環境） |
| 想定規模 | 大規模（戦闘システム中心） |
| セーブ形式 | JSON ファイル（ローカル保存） |

### コンセプト
キーボード入力だけで進行する、ターン制コマンドバトルを中核に据えた本格RPG。戦闘システムを最重視し、属性相性・状態異常・スキル・装備・敵AIなど、数値的な奥行きを持たせる。

---

## 2. 技術スタック

| カテゴリ | 採用技術 | 採用理由 |
|----------|----------|----------|
| 言語 | TypeScript 5.x | 型安全でドメインモデルが堅牢に書ける。大規模化に強い |
| 実行環境 | Node.js 20 LTS | クロスプラットフォーム。エコシステムが豊富 |
| ターミナル描画 | chalk（色付け）, cli-table3（表）, boxen（枠） | CUIの視認性向上 |
| 対話入力 | @inquirer/prompts | コマンド選択UIを宣言的に構築 |
| バリデーション | zod | セーブデータ・設定の型検証 |
| テスト | Vitest | 戦闘ロジックの単体テスト |
| Lint / Format | ESLint + Prettier | コード品質の統一 |
| ビルド | tsup（or tsc） | 単一バイナリ的な配布も視野 |
| 乱数 | seedrandom | リプレイ可能なシード制乱数 |

---

## 3. ディレクトリ構造

```
console-quest/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── README.md
├── DESIGN.md                      # 本設計書
│
├── data/                          # ゲームデータ（JSON / 静的定義）
│   ├── monsters.json              # 敵データ
│   ├── skills.json                # スキル定義
│   ├── items.json                 # アイテム定義
│   ├── equipments.json            # 装備定義
│   ├── jobs.json                  # 職業・クラス定義
│   ├── maps.json                  # マップ・エンカウント定義
│   └── messages.json              # システムメッセージ（i18n対応余地）
│
├── saves/                         # セーブデータ保存先（.gitignore）
│   └── slot1.json
│
├── src/
│   ├── main.ts                    # エントリポイント
│   │
│   ├── core/                      # ゲーム基盤
│   │   ├── GameLoop.ts            # メインループ
│   │   ├── GameState.ts           # 全体状態管理
│   │   ├── SceneManager.ts        # シーン遷移制御
│   │   ├── EventBus.ts            # イベント通知（疎結合）
│   │   └── RNG.ts                 # シード制乱数ラッパ
│   │
│   ├── scenes/                    # 画面（シーン）単位
│   │   ├── Scene.ts               # 抽象基底
│   │   ├── TitleScene.ts          # タイトル
│   │   ├── FieldScene.ts          # フィールド探索
│   │   ├── BattleScene.ts         # 戦闘
│   │   ├── MenuScene.ts           # メニュー（装備・アイテム）
│   │   └── GameOverScene.ts       # ゲームオーバー
│   │
│   ├── battle/                    # 戦闘システム（最重要モジュール）
│   │   ├── BattleEngine.ts        # 戦闘進行の中枢
│   │   ├── TurnOrder.ts           # 行動順（速度ソート / CTB方式）
│   │   ├── ActionResolver.ts      # 行動の解決（攻撃・スキル・防御）
│   │   ├── DamageCalculator.ts    # ダメージ計算式
│   │   ├── ElementChart.ts        # 属性相性テーブル
│   │   ├── StatusEffect.ts        # 状態異常（毒・麻痺・睡眠等）
│   │   ├── SkillExecutor.ts       # スキル効果の適用
│   │   ├── TargetSelector.ts      # 対象選択ロジック
│   │   └── enemyAI/
│   │       ├── EnemyAI.ts         # AIインターフェース
│   │       ├── AggressiveAI.ts    # 攻撃優先
│   │       ├── DefensiveAI.ts     # 回復・防御優先
│   │       └── SmartAI.ts         # 弱点を突く思考型
│   │
│   ├── entities/                  # ゲーム内エンティティ
│   │   ├── Character.ts           # キャラ基底（HP/MP/ステータス）
│   │   ├── Player.ts              # プレイヤー
│   │   ├── Party.ts               # パーティ管理
│   │   ├── Monster.ts             # 敵
│   │   └── Stats.ts               # ステータス値オブジェクト
│   │
│   ├── systems/                   # 周辺システム
│   │   ├── InventorySystem.ts     # 所持品管理
│   │   ├── EquipmentSystem.ts     # 装備の着脱・補正計算
│   │   ├── LevelSystem.ts         # 経験値・レベルアップ
│   │   ├── SkillTree.ts           # スキル習得
│   │   ├── ShopSystem.ts          # 売買
│   │   └── EncounterSystem.ts     # エンカウント判定
│   │
│   ├── data-access/               # データ読み込み層
│   │   ├── DataLoader.ts          # JSON読込＋zod検証
│   │   ├── SaveManager.ts         # セーブ／ロード
│   │   └── schemas/               # zodスキーマ群
│   │       ├── monster.schema.ts
│   │       ├── skill.schema.ts
│   │       └── save.schema.ts
│   │
│   ├── ui/                        # 表示・入力
│   │   ├── Renderer.ts            # 画面描画ヘルパ
│   │   ├── BattleView.ts          # 戦闘画面の描画
│   │   ├── StatusBar.ts           # HP/MPバー表示
│   │   ├── Menu.ts                # 汎用メニュー（inquirerラッパ）
│   │   └── Logger.ts              # 戦闘ログ表示
│   │
│   ├── constants/                 # 定数
│   │   ├── elements.ts            # 属性定義
│   │   ├── statusTypes.ts         # 状態異常種別
│   │   └── config.ts              # ゲームバランス調整値
│   │
│   └── utils/                     # 汎用ユーティリティ
│       ├── math.ts                # clamp, lerp 等
│       ├── format.ts              # 数値・文字列整形
│       └── async.ts               # sleep / wait
│
└── tests/                         # テスト
    ├── battle/
    │   ├── DamageCalculator.test.ts
    │   ├── ElementChart.test.ts
    │   └── StatusEffect.test.ts
    └── systems/
        └── LevelSystem.test.ts
```

---

## 4. アーキテクチャ方針

### レイヤー構成
```
[ UI層 (ui/) ]            ← 描画と入力のみ。ロジックを持たない
       ↑↓
[ シーン層 (scenes/) ]    ← 画面遷移と各シーンの制御
       ↑↓
[ ドメイン層 ]            ← battle/ systems/ entities/（純粋なロジック）
       ↑↓
[ データ層 (data-access/) ] ← JSON読込・セーブ
```

- **UIとロジックの分離**：戦闘ロジックは画面描画に依存しない純粋関数群とし、テスト容易性を確保する。
- **データ駆動設計**：敵・スキル・アイテムはコードでなく `data/*.json` で定義。バランス調整やコンテンツ追加をコード改修なしで行える。
- **疎結合**：シーン間・システム間は `EventBus` を介して通知し、相互依存を最小化。

---

## 5. 戦闘システム詳細設計（中核）

### 5.1 戦闘フロー
```
戦闘開始
  ↓
行動順決定（速度ベース or CTBゲージ）
  ↓
┌─ ターン開始 ───────────────┐
│  状態異常の発動・経過処理      │
│    ↓                          │
│  行動者がプレイヤー → コマンド入力 │
│  行動者が敵 → EnemyAIが決定    │
│    ↓                          │
│  ActionResolver で行動解決     │
│    ↓                          │
│  DamageCalculator でダメージ算出 │
│    ↓                          │
│  結果反映・ログ表示             │
│    ↓                          │
│  勝敗判定（全滅チェック）        │
└─────────────────────────────┘
  ↓（決着まで繰り返し）
勝利 → 経験値・ドロップ処理 ／ 敗北 → GameOver
```

### 5.2 ダメージ計算式（例）
```
基礎ダメージ = (攻撃力 × スキル威力 / 100) − (防御力 / 2)
属性補正    = ElementChart[攻撃属性][敵属性]   // 0.5 / 1.0 / 2.0
乱数補正    = 0.9 〜 1.1 のランダム係数
会心補正    = 会心時 ×1.5

最終ダメージ = max(1, floor(基礎ダメージ × 属性補正 × 乱数補正 × 会心補正))
```

### 5.3 属性相性テーブル（例）
| 攻撃＼防御 | 火 | 水 | 風 | 土 |
|-----------|----|----|----|----|
| 火 | 1.0 | 0.5 | 1.0 | 2.0 |
| 水 | 2.0 | 1.0 | 0.5 | 1.0 |
| 風 | 1.0 | 2.0 | 1.0 | 0.5 |
| 土 | 0.5 | 1.0 | 2.0 | 1.0 |

### 5.4 状態異常
| 種別 | 効果 | 解除条件 |
|------|------|----------|
| 毒 | 毎ターンHP割合ダメージ | 数ターン経過 / アイテム |
| 麻痺 | 一定確率で行動不能 | ターン経過 |
| 睡眠 | 行動不能、被弾で解除 | 攻撃を受ける |
| 沈黙 | スキル使用不可 | ターン経過 |
| 混乱 | 対象がランダム化 | ターン経過 |

### 5.5 敵AI（Strategyパターン）
`EnemyAI` インターフェースを実装し、敵ごとに思考ルーチンを差し替え可能にする。`SmartAI` はパーティの弱点属性を分析して最適スキルを選択する。

---

## 6. データモデル例（型定義）

```typescript
// entities/Stats.ts
interface Stats {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  luck: number;      // 会心率に影響
}

// data/monsters.json の1要素
interface MonsterData {
  id: string;
  name: string;
  element: Element;
  stats: Stats;
  skills: string[];        // skills.json のID参照
  aiType: 'aggressive' | 'defensive' | 'smart';
  exp: number;
  gold: number;
  drops: { itemId: string; rate: number }[];
}

// data/skills.json の1要素
interface SkillData {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  element: Element;
  target: 'single' | 'all' | 'self';
  effect?: StatusEffectType;   // 付与する状態異常
  effectRate?: number;         // 付与確率
}
```

---

## 7. セーブデータ仕様

`saves/slot{n}.json` に JSON 保存。読込時は zod スキーマで検証し、破損・バージョン不整合を検出する。

```json
{
  "version": 1,
  "playtime": 3725,
  "party": [
    {
      "name": "勇者",
      "level": 12,
      "exp": 1540,
      "currentHp": 180,
      "currentMp": 45,
      "stats": { "maxHp": 200, "maxMp": 50, "attack": 35, "...": "..." },
      "equipment": { "weapon": "iron_sword", "armor": "leather_mail" },
      "skills": ["fire_bolt", "heal"]
    }
  ],
  "inventory": [{ "itemId": "potion", "count": 5 }],
  "gold": 1200,
  "location": "field_forest",
  "flags": { "boss_defeated": false }
}
```

---

## 8. 開発ロードマップ（フェーズ分割）

| フェーズ | 内容 | 目安 |
|----------|------|------|
| 1. 基盤 | プロジェクト雛形、GameLoop、SceneManager、データ読込 | 最初 |
| 2. 戦闘コア | BattleEngine、ダメージ計算、ターン制御、属性 | 中核 |
| 3. キャラ成長 | レベル・経験値・スキル習得・装備 | |
| 4. 状態異常・AI | StatusEffect、各種EnemyAI | |
| 5. フィールド | 探索・エンカウント・ショップ | |
| 6. セーブ／ロード | SaveManager、zod検証 | |
| 7. 仕上げ | UI装飾、バランス調整、テスト拡充 | 最後 |

---

## 9. 主要npmパッケージ

```jsonc
{
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "boxen": "^8.0.0",
    "zod": "^3.23.0",
    "seedrandom": "^3.0.5"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

## 10. 拡張余地
- マルチパーティ・隊列システム（前衛／後衛で被ダメ補正）
- CTB（カウントタイムバトル）への行動順方式変更
- 状態異常の重ねがけ・耐性システム
- マップを ASCII アートで描画する探索モード
- リプレイ機能（シード固定で戦闘再現）
