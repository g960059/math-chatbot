# Math Study Chatbot - AI Agent Guide

このドキュメントは、AIエージェントがこのプロジェクトに参画する際のガイドです。

## プロジェクト概要

**Math Study Chatbot** は、圏論を含む数学の学習支援を目的としたAIチャットボットです。
LaTeX数式レンダリングと可換図式（tikz-cd）のサポートが特徴です。

### 本番環境
- **URL**: https://math-chatbot-598778881600.asia-northeast1.run.app
- **GCP Project**: `math-chatbot-484411`
- **Region**: `asia-northeast1`（東京）

---

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 15.x |
| 言語 | TypeScript | 5.x |
| スタイリング | Tailwind CSS | 3.x |
| 認証/DB | Supabase | 2.47.x |
| 数式 | KaTeX | 0.16.x |
| Markdown | react-markdown + remark-math + rehype-katex | - |
| アイコン | lucide-react | 0.468.x |
| テスト | Vitest + Testing Library | 2.1.x |
| インフラ | Google Cloud Run + Docker | - |

---

## ディレクトリ構造

```
math-chatbot/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── conversations/    # 会話CRUD API
│   │   │   │   ├── route.ts      # GET/POST /api/conversations
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts  # DELETE /api/conversations/:id
│   │   │   │       ├── messages/route.ts      # GET/POST メッセージ(streaming)
│   │   │   │       └── generate-title/route.ts # タイトル自動生成
│   │   │   └── settings/route.ts # GET/PUT ユーザー設定
│   │   ├── auth/
│   │   │   └── callback/route.ts # OAuth callback
│   │   ├── login/page.tsx        # ログインページ
│   │   ├── layout.tsx            # ルートレイアウト
│   │   ├── page.tsx              # メインチャットページ
│   │   └── globals.css           # グローバルCSS
│   ├── components/               # Reactコンポーネント
│   │   ├── ChatArea.tsx          # チャットUI
│   │   ├── MessageContent.tsx    # メッセージ表示(LaTeX/TikZ)
│   │   ├── Sidebar.tsx           # サイドバー
│   │   └── SettingsModal.tsx     # 設定モーダル
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # ブラウザ用クライアント
│   │   │   ├── server.ts         # サーバー用クライアント
│   │   │   └── middleware.ts     # 認証ミドルウェアヘルパー
│   │   └── utils.ts              # ユーティリティ関数
│   ├── types/
│   │   └── index.ts              # 型定義
│   └── middleware.ts             # Next.js認証ミドルウェア
├── supabase/
│   └── schema.sql                # DBスキーマ
├── Dockerfile                    # 本番用Docker設定
├── cloudbuild.yaml               # Cloud Build設定（機密情報含む、gitignore対象）
├── env.yaml                      # Cloud Run環境変数（機密情報含む、gitignore対象）
├── next.config.ts                # Next.js設定（standalone出力）
├── tailwind.config.ts            # Tailwind設定
├── vitest.config.ts              # Vitest設定
└── package.json
```

---

## 開発コマンド

```bash
# 開発サーバー起動（認証あり）
npm run dev

# 開発サーバー起動（E2Eテストモード、認証スキップ）
npm run dev:e2e

# ビルド
npm run build

# テスト実行
npm test

# Lint
npm run lint
```

---

## 環境変数

### 必須環境変数

| 変数名 | 説明 | 使用場所 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | クライアント/サーバー |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開キー | クライアント/サーバー |

### オプション環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `E2E_TEST_MODE` | `true`で認証をスキップ | `false` |
| `NEXT_PUBLIC_APP_URL` | アプリURL（OpenRouter referer用） | - |

### ローカル開発

`.env.local` ファイルに環境変数を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## データベース構造

### テーブル

#### `user_settings`
ユーザーごとの設定（APIキー、モデル選択、テーマ）

#### `conversations`
会話スレッド（タイトルは最初のやり取りからAIが自動生成）

#### `messages`
チャットメッセージ（`role`: user/assistant）

### Row Level Security (RLS)
すべてのテーブルで `user_id = auth.uid()` によるアクセス制御が有効

---

## 認証フロー

1. `/login` - Google OAuthボタンをクリック
2. Supabase経由でGoogleに認証リクエスト
3. `/auth/callback` - 認証コードをセッションに交換
4. `/` にリダイレクト

### E2Eテストモード
`E2E_TEST_MODE=true` の場合、ミドルウェアで認証チェックをスキップ。
API側でもモックユーザーを使用。

---

## Cloud Runデプロイ

### justコマンドでデプロイ

```bash
# ローカルからデプロイ（.envから環境変数を読み込み）
just deploy
```

### GitHub Actions（自動デプロイ）

`main`ブランチへのpushで自動デプロイが実行されます。

#### 初回セットアップ

1. Workload Identity Federationをセットアップ：
```bash
just setup-wif
```

2. 表示されたシークレットをGitHubリポジトリに設定：
   - Settings → Secrets and variables → Actions → New repository secret
   - 以下の4つを追加：
     - `WIF_PROVIDER`: Workload Identity Providerのパス
     - `WIF_SERVICE_ACCOUNT`: サービスアカウントのメール
     - `NEXT_PUBLIC_SUPABASE_URL`: SupabaseのURL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの公開キー

3. シークレット値の確認：
```bash
just show-wif-config
```

### デプロイ設定

| 設定 | 値 |
|------|-----|
| Min instances | 0（コールドスタート許容） |
| Max instances | 10 |
| Port | 3000 |
| Region | asia-northeast1 |

### 重要: ビルド時環境変数

`NEXT_PUBLIC_*` 変数はビルド時にインライン化されるため、
デプロイ時に `--set-build-env-vars` で渡す必要がある。

---

## 主要な実装パターン

### Streaming レスポンス

`/api/conversations/[id]/messages/route.ts` でSSE（Server-Sent Events）を使用。
OpenRouter APIへのストリーミングリクエストをそのままクライアントに転送。

### 数式レンダリング

`MessageContent.tsx` で `react-markdown` + `remark-math` + `rehype-katex` を使用。
- インライン: `$...$`
- ブロック: `$$...$$`

### 可換図式

tikzjax を使用してブラウザ側でレンダリング。
`\begin{tikzcd}...\end{tikzcd}` を自動検出。

---

## よくある作業

### 新しいAPIエンドポイントの追加

1. `src/app/api/` 以下に `route.ts` を作成
2. `createClient()` でSupabaseクライアントを取得
3. `E2E_TEST_MODE` チェックを忘れずに

### コンポーネントの追加

1. `src/components/` に作成
2. `src/components/index.ts` にエクスポートを追加

### Supabaseスキーマの変更

1. `supabase/schema.sql` を更新
2. Supabase DashboardでSQLを実行
3. RLSポリシーを忘れずに設定

---

## 注意事項

- **E2Eモードを壊さない**: 認証関連の変更時は `E2E_TEST_MODE` の分岐を維持
- **機密ファイル**: `env.yaml`, `cloudbuild.yaml`, `.env*` はgitignore対象
- **Supabase OAuth設定**: 新しいドメインでデプロイする場合、Supabase DashboardでRedirect URLを追加

---

## 参考リンク

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [OpenRouter API](https://openrouter.ai/docs)
- [KaTeX](https://katex.org/)
- [Cloud Run](https://cloud.google.com/run/docs)
