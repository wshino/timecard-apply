# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

King of Time勤怠管理システムの自動化ツール。Playwrightを使用してブラウザを自動操作し、エラーが発生している勤務データに対して打刻申請を自動実行します。

## 開発コマンド

### 依存関係のインストール
```bash
pnpm install
```

### スクリプトの実行
```bash
pnpm start
# または
npx ts-node src/timecard-apply.ts
```

### ビルド
```bash
pnpm build
```

## アーキテクチャ

### メインロジック (src/timecard-apply.ts)

1. **認証フロー**
   - 環境変数から認証情報を取得（MY_COMPANY_ID, MY_ID, MY_PASSWORD）
   - King of Timeログインページで多段階認証を実行

2. **エラー検出ロジック**
   - `tr.ui-widget-content.jqgrow.ui-row-ltr` セレクタでテーブル行を取得
   - 各行の最初のセルのテキストが空でない場合をエラー行として判定

3. **打刻申請処理**
   - 行クリック → ダイアログ表示待機
   - 打刻申請オプションを選択
   - 出勤時刻（10:00）・退勤時刻（19:00）を入力
   - OKボタンクリックで申請実行

### 環境変数の設定

`.env`ファイルに以下を設定：
```
MY_COMPANY_ID=your_company_id
MY_ID=your_id
MY_PASSWORD=your_password
```

## 重要な実装詳細

- **セレクタの特殊性**: `#recording_timestamp_table` テーブル内の行を特定するため、jQueryUIのクラス名を使用
- **待機処理**: 各操作後にUIの更新を待つため、適切なwaitForSelector/waitForTimeoutを使用
- **ブラウザ設定**: `headless: false`で動作を視覚的に確認可能（本番環境ではtrueに変更推奨）
- **エラーハンドリング**: try-catchでエラーをキャッチし、ブラウザを確実にクローズ

## 開発時の注意点

- Playwrightのセレクタが変更される可能性があるため、King of Timeの画面変更時は要確認
- 認証情報は絶対にコミットしないこと（.gitignoreで.envを除外済み）
- タイムアウト値は環境により調整が必要な場合がある