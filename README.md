# CLOCKLESS / ©-cafe

美容室と併設カフェのリニューアル。9ページ、静的HTMLとCloudflare Pages Functions。

## ローカル

Node.js 22以上。外部パッケージのインストールは不要。

- `npm run build`：共通テンプレートから9ページを出力し検証
- `npm run dev`：http://localhost:3005/ でプレビュー
- `npm test`：問い合わせ処理の単体検証（外部へメールは送信しません）

コンテンツは `scripts/build.mjs`、スタイルは `dist/assets/style.css` と `layout.css`。画像はローカル配信し、旧サイトに依存しません。`scripts/prepare-assets.mjs` は制作時の素材準備用で、ビルド・公開時には実行しません。

## Cloudflare Pages（未公開）

- フレームワーク：None
- ビルドコマンド：`npm run build`
- 出力ディレクトリ：`dist`
- ルートディレクトリ：このプロジェクトのルート
- `functions/` も同時にデプロイするGit連携またはWranglerを使用。管理画面への `dist` ドラッグ＆ドロップのみではフォームは動きません。

GitHubリポジトリ： https://github.com/crestix-company/CLOCKLESS （`main` ブランチ）。CloudflareのGit連携では、このリポジトリとブランチを選択してください。GitHubへのプッシュだけでは新しい公開先は作成されません。

独自ドメインの切替は行っていません。既存会社への確認後に進めます。

## フォームの公開前に必要な設定

受信先・送信サービスの接続が未完了です。現在は送信受付停止を正しく案内し、送信成功を偽りません。

Resendを利用する実装を用意しています。サービスの利用・送信元ドメインの認証を管理者が確認したあと、Cloudflareの環境変数／シークレットを設定してください。

|設定名|用途|
|---|---|
|`CONTACT_TO`|サロンの受信先メールアドレス|
|`CONTACT_FROM`|Resendで認証した送信元（例 `CLOCKLESS <form@認証ドメイン>`）|
|`RESEND_API_KEY`|Resendの送信APIキー。シークレットとして登録|
|`TURNSTILE_SITE_KEY`|Cloudflare Turnstileの公開キー|
|`TURNSTILE_SECRET_KEY`|Turnstileの秘密キー。シークレットとして登録|

Turnstileには公開先のホスト名を登録します。サーバー側でホスト名・action・同一Origin・入力形式・文字数・同意を検証します。個人情報をログに出力・保存しません。送信の再試行にはResendの冪等キーを使います。

設定後、管理者の許可を得た実受信テストを行い、到達と返信先を確認してから公開可とします。現在のローカルプレビューには秘密情報を読み込ませていません。

## コンテンツの確認待ち

- ユーザーから届く最新の募集条件。旧サイトの給与額は掲載していません。
- 問い合わせフォームの受信先と接続設定。
- シート／現HPと予約サイトで差がある営業時間・掲載スタッフ。現在はシート／現HPに合わせています。

根拠・検証記録は `docs/quality.md`。
