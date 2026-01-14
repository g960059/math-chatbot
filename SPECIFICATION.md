# AI Chatbot 仕様書

## 1. 概要

### 1.1 プロジェクト名
Math Study Chatbot（仮称）

### 1.2 目的
圏論を含む数学の学習支援を目的とした、個人利用向けAIチャットボット

### 1.3 ターゲットユーザー
- 開発者本人（個人利用）

### 1.4 想定利用規模
- 数十回/日

---

## 2. 機能要件

### 2.1 コア機能

#### 2.1.1 AI対話機能
- OpenRouter APIを使用したチャット機能
- ユーザーがAPIキーとモデルを設定画面から入力・変更可能
- ストリーミングレスポンス対応
- 日本語のみ対応

#### 2.1.2 数式レンダリング
- **MathJax**（デフォルト）と **KaTeX** の切り替えをサポート
- インライン数式: `$...$` または `\(...\)`
- ブロック数式: `$$...$$` または `\[...\]`
- 設定画面からレンダラーを切り替え可能

#### 2.1.3 可換図式サポート
- **tikzjax** を使用してブラウザ側でレンダリング
- tikz-cd記法をサポート
- コードブロック内の `tikz-cd` 環境を自動検出してレンダリング

```latex
\begin{tikzcd}
A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[d, "h"] \\
C \arrow[r, "k"'] & D
\end{tikzcd}
```

#### 2.1.4 会話管理
- 複数の会話スレッドを作成・管理
- 会話一覧のサイドバー表示
- 会話の新規作成・削除・切り替え
- **会話タイトル自動生成**: 最初のやり取りからAIがタイトルを生成

### 2.2 認証機能
- Google OAuth（Supabase Auth使用）
- ログイン/ログアウト機能
- 認証済みユーザーのみアクセス可能

### 2.3 設定機能
- OpenRouter APIキーの設定
- AIモデルの選択（OpenRouterで利用可能なモデル一覧から選択）
- 数式レンダラーの切り替え（MathJax / KaTeX）
- テーマ切り替え（ダーク / ライト）

---

## 3. 非機能要件

### 3.1 パフォーマンス
- 初回ロード: 3秒以内
- メッセージ送信からストリーミング開始: 1秒以内

### 3.2 セキュリティ
- APIキーはサーバーサイドで暗号化して保存
- Supabase Row Level Security (RLS) によるデータアクセス制御
- HTTPS必須

### 3.3 可用性
- Cloud Run最小インスタンス0（コールドスタート許容）

---

## 4. 技術スタック

### 4.1 フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.x (App Router) | フレームワーク |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | スタイリング |
| MathJax | 3.x | 数式レンダリング（デフォルト） |
| KaTeX | 0.16.x | 数式レンダリング（オプション） |
| tikzjax | latest | 可換図式レンダリング |

### 4.2 バックエンド
| 技術 | 用途 |
|------|------|
| Next.js API Routes | APIエンドポイント |
| Supabase | 認証 + データベース |

### 4.3 データベース
| 技術 | 用途 |
|------|------|
| Supabase (PostgreSQL) | 会話履歴・ユーザー設定保存 |

### 4.4 外部API
| サービス | 用途 |
|----------|------|
| OpenRouter API | AIモデルアクセス |

### 4.5 インフラ
| サービス | 設定 |
|----------|------|
| Google Cloud Run | min-instances: 0, max-instances: 10 |
| Docker | コンテナ化 |

---

## 5. データベース設計

### 5.1 テーブル構成

#### users（Supabase Auth管理）
Supabase Authが自動管理

#### user_settings
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| user_id | UUID | ユーザーID（FK → auth.users） |
| openrouter_api_key | TEXT | 暗号化されたAPIキー |
| selected_model | TEXT | 選択中のモデルID |
| math_renderer | TEXT | 'mathjax' or 'katex' |
| theme | TEXT | 'dark' or 'light' |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### conversations
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| user_id | UUID | ユーザーID（FK → auth.users） |
| title | TEXT | 会話タイトル（自動生成） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### messages
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| conversation_id | UUID | 会話ID（FK → conversations） |
| role | TEXT | 'user' or 'assistant' |
| content | TEXT | メッセージ内容 |
| created_at | TIMESTAMP | 作成日時 |

### 5.2 RLSポリシー
- 各テーブルで `user_id = auth.uid()` のレコードのみアクセス可能

---

## 6. API設計

### 6.1 エンドポイント一覧

#### 認証
- `GET /auth/callback` - OAuth コールバック

#### 会話
- `GET /api/conversations` - 会話一覧取得
- `POST /api/conversations` - 新規会話作成
- `DELETE /api/conversations/:id` - 会話削除
- `PATCH /api/conversations/:id` - タイトル更新

#### メッセージ
- `GET /api/conversations/:id/messages` - メッセージ一覧取得
- `POST /api/conversations/:id/messages` - メッセージ送信（ストリーミング）

#### 設定
- `GET /api/settings` - ユーザー設定取得
- `PUT /api/settings` - ユーザー設定更新

#### タイトル生成
- `POST /api/conversations/:id/generate-title` - AIによるタイトル自動生成

---

## 7. 画面設計

### 7.1 画面一覧

| 画面 | パス | 説明 |
|------|------|------|
| ログイン | `/login` | Google OAuthログイン |
| チャット | `/` | メインチャット画面 |
| 設定 | `/settings` | ユーザー設定画面 |

### 7.2 チャット画面レイアウト

```
+------------------+----------------------------------------+
|                  |                                        |
|   サイドバー      |         チャットエリア                   |
|                  |                                        |
|  [+ 新規会話]     |   +--------------------------------+   |
|                  |   | メッセージ表示エリア             |   |
|  会話リスト       |   | - 数式レンダリング              |   |
|  - 会話1         |   | - 可換図式レンダリング          |   |
|  - 会話2         |   |                                |   |
|  - 会話3         |   +--------------------------------+   |
|                  |                                        |
|  [設定]          |   [メッセージ入力エリア] [送信]         |
|                  |                                        |
+------------------+----------------------------------------+
```

### 7.3 レスポンシブ対応
- モバイル: サイドバーはハンバーガーメニューで開閉
- タブレット以上: サイドバー常時表示

### 7.4 ダークモード
- システム設定に連動 + 手動切り替え可能
- Tailwind CSSの `dark:` クラスを使用

---

## 8. 開発環境

### 8.1 必要なツール
- Node.js 20.x
- pnpm（推奨）または npm
- Docker（デプロイ用）
- Google Cloud CLI

### 8.2 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 暗号化キー（APIキー暗号化用）
ENCRYPTION_KEY=

# アプリURL
NEXT_PUBLIC_APP_URL=
```

---

## 9. デプロイ

### 9.1 Cloud Run設定

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/math-chatbot', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/math-chatbot']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'math-chatbot'
      - '--image=gcr.io/$PROJECT_ID/math-chatbot'
      - '--region=asia-northeast1'
      - '--platform=managed'
      - '--min-instances=0'
      - '--max-instances=10'
      - '--allow-unauthenticated'
```

### 9.2 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

---

## 10. 開発スケジュール（目安）

### Phase 1: 基盤構築
- [ ] Next.js プロジェクトセットアップ
- [ ] Supabase 設定（Auth + DB）
- [ ] 基本的なUIレイアウト

### Phase 2: コア機能
- [ ] Google OAuth認証
- [ ] 会話CRUD
- [ ] OpenRouter API連携
- [ ] ストリーミングレスポンス

### Phase 3: 数式・図式
- [ ] MathJax統合
- [ ] KaTeX統合（切り替え機能）
- [ ] tikzjax統合

### Phase 4: 仕上げ
- [ ] タイトル自動生成
- [ ] 設定画面
- [ ] ダークモード
- [ ] レスポンシブ対応

### Phase 5: デプロイ
- [ ] Docker化
- [ ] Cloud Runデプロイ
- [ ] 動作確認

---

## 11. 今後の拡張案（オプション）

- 会話のエクスポート（Markdown/LaTeX）
- 数式・図式のコピー機能
- プロンプトテンプレート機能
- 会話の検索機能

---

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0 | 2025-01-12 | 初版作成 |
