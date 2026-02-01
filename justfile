# Math Chatbot - justfile
# https://github.com/casey/just

# GCP設定
project := "math-chatbot-484411"
region := "asia-northeast1"
service := "math-chatbot"

# gcloud用Python設定（Python 3.13対応）
export CLOUDSDK_PYTHON := "/opt/homebrew/bin/python3.13"

# デフォルトコマンド: ヘルプを表示
default:
    @just --list

# =============================================================================
# 開発
# =============================================================================

# 開発サーバー起動（認証あり）
dev:
    npm run dev

# 開発サーバー起動（E2Eテストモード、認証スキップ）
dev-e2e:
    npm run dev:e2e

# ビルド
build:
    npm run build

# 本番サーバー起動
start:
    npm run start

# =============================================================================
# テスト・Lint
# =============================================================================

# テスト実行
test:
    npm test

# テスト実行（カバレッジ付き）
test-coverage:
    npm run test:coverage

# Lint実行
lint:
    npm run lint

# =============================================================================
# デプロイ
# =============================================================================

# Cloud Runにデプロイ（ソースから直接）
deploy:
    #!/usr/bin/env bash
    set -euo pipefail

    # .envファイルから環境変数を読み込み
    if [[ -f .env ]]; then
        export $(grep -v '^#' .env | xargs)
    else
        echo "Error: .env file not found"
        exit 1
    fi

    # 必須環境変数のチェック
    if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] || [[ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
        echo "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env"
        exit 1
    fi

    echo "Deploying to Cloud Run..."

    gcloud run deploy {{ service }} \
        --project {{ project }} \
        --region {{ region }} \
        --source . \
        --platform managed \
        --allow-unauthenticated \
        --port 3000 \
        --min-instances 0 \
        --max-instances 10 \
        --set-build-env-vars "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
        --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# cloudbuild.yamlを使ったデプロイ（カスタムビルド設定がある場合）
deploy-cloudbuild:
    #!/usr/bin/env bash
    set -euo pipefail

    if [[ ! -f cloudbuild.yaml ]]; then
        echo "Error: cloudbuild.yaml not found"
        exit 1
    fi

    echo "Deploying using Cloud Build config..."
    gcloud builds submit --project {{ project }} --config cloudbuild.yaml

# =============================================================================
# Cloud Run管理
# =============================================================================

# Cloud Runのログを表示
logs:
    gcloud run services logs read {{ service }} \
        --project {{ project }} \
        --region {{ region }} \
        --limit 100

# Cloud Runのログをストリーミング
logs-stream:
    gcloud run services logs tail {{ service }} \
        --project {{ project }} \
        --region {{ region }}

# Cloud Runサービスの詳細を表示
describe:
    gcloud run services describe {{ service }} \
        --project {{ project }} \
        --region {{ region }}

# Cloud RunサービスのURLを表示
url:
    @gcloud run services describe {{ service }} \
        --project {{ project }} \
        --region {{ region }} \
        --format 'value(status.url)'

# =============================================================================
# Docker（ローカル）
# =============================================================================

# Dockerイメージをローカルでビルド
docker-build:
    #!/usr/bin/env bash
    set -euo pipefail

    if [[ -f .env ]]; then
        export $(grep -v '^#' .env | xargs)
    fi

    docker build \
        --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}" \
        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
        -t {{ service }}:local .

# Dockerコンテナをローカルで実行
docker-run:
    docker run -p 3000:3000 {{ service }}:local

# =============================================================================
# セットアップ
# =============================================================================

# 依存関係のインストール
install:
    npm ci

# .envファイルのテンプレートを作成
init-env:
    @if [[ -f .env ]]; then \
        echo ".env already exists. Skipping..."; \
    else \
        cp .env.example .env; \
        echo "Created .env from .env.example"; \
        echo "Please edit .env and set your environment variables"; \
    fi

# =============================================================================
# GitHub Actions セットアップ
# =============================================================================

# GitHub用リポジトリ設定
github_owner := "g960059"
github_repo := "math-chatbot"
pool_name := "github-pool"
provider_name := "github-provider"
sa_name := "github-actions"

# Workload Identity Federation をセットアップ
setup-wif:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "Setting up Workload Identity Federation for GitHub Actions..."

    # サービスアカウント作成
    echo "Creating service account..."
    gcloud iam service-accounts create {{ sa_name }} \
        --project {{ project }} \
        --display-name "GitHub Actions" \
        --description "Service account for GitHub Actions deployments" \
        2>/dev/null || echo "Service account already exists"

    SA_EMAIL="{{ sa_name }}@{{ project }}.iam.gserviceaccount.com"

    # 必要な権限を付与
    echo "Granting permissions..."
    for role in roles/run.admin roles/storage.admin roles/cloudbuild.builds.builder roles/iam.serviceAccountUser roles/artifactregistry.writer; do
        gcloud projects add-iam-policy-binding {{ project }} \
            --member="serviceAccount:${SA_EMAIL}" \
            --role="${role}" \
            --quiet
    done

    # Workload Identity Pool 作成
    echo "Creating Workload Identity Pool..."
    gcloud iam workload-identity-pools create {{ pool_name }} \
        --project {{ project }} \
        --location global \
        --display-name "GitHub Pool" \
        2>/dev/null || echo "Pool already exists"

    # Workload Identity Provider 作成
    echo "Creating Workload Identity Provider..."
    gcloud iam workload-identity-pools providers create-oidc {{ provider_name }} \
        --project {{ project }} \
        --location global \
        --workload-identity-pool {{ pool_name }} \
        --display-name "GitHub Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='{{ github_owner }}/{{ github_repo }}'" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        2>/dev/null || echo "Provider already exists"

    # サービスアカウントへのバインディング
    echo "Binding service account..."
    gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
        --project {{ project }} \
        --role="roles/iam.workloadIdentityUser" \
        --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe {{ project }} --format='value(projectNumber)')/locations/global/workloadIdentityPools/{{ pool_name }}/attribute.repository/{{ github_owner }}/{{ github_repo }}"

    # 出力
    echo ""
    echo "=========================================="
    echo "Setup complete!"
    echo "=========================================="
    echo ""
    echo "Add the following secrets to your GitHub repository:"
    echo ""
    echo "WIF_PROVIDER:"
    echo "  projects/$(gcloud projects describe {{ project }} --format='value(projectNumber)')/locations/global/workloadIdentityPools/{{ pool_name }}/providers/{{ provider_name }}"
    echo ""
    echo "WIF_SERVICE_ACCOUNT:"
    echo "  ${SA_EMAIL}"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL:"
    echo "  (your Supabase URL)"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY:"
    echo "  (your Supabase anon key)"

# GitHub Secretsに設定する値を表示
show-wif-config:
    #!/usr/bin/env bash
    set -euo pipefail

    PROJECT_NUMBER=$(gcloud projects describe {{ project }} --format='value(projectNumber)')
    SA_EMAIL="{{ sa_name }}@{{ project }}.iam.gserviceaccount.com"

    echo "GitHub Secrets に設定する値:"
    echo ""
    echo "WIF_PROVIDER:"
    echo "  projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/{{ pool_name }}/providers/{{ provider_name }}"
    echo ""
    echo "WIF_SERVICE_ACCOUNT:"
    echo "  ${SA_EMAIL}"

# =============================================================================
# ユーティリティ
# =============================================================================

# 依存関係の更新確認
outdated:
    npm outdated

# node_modulesと.nextを削除
clean:
    rm -rf node_modules .next

# 完全クリーン＆再インストール
reset: clean install
