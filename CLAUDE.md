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
pnpm timecard-apply
# または
npx ts-node src/timecard-apply.ts
```

### ビルド
```bash
pnpm build
```

### テストの実行
```bash
pnpm test  # 現在未実装
```

## アーキテクチャ

### メインロジック (src/timecard-apply.ts)

1. **認証フロー**
   - 環境変数から認証情報を取得（KINGOFTIME_ID, KINGOFTIME_PASSWORD）
   - King of Timeログインページ（https://login.ta.kingoftime.jp/admin）で認証

2. **エラー検出ロジック**
   - `tr:has(td[title="エラー勤務です。"])` セレクタでエラー行を検出
   - 未申請の行（`span.specific-requested`が存在しない行）のみを処理対象とする

3. **打刻申請処理**
   - 打刻申請オプションをドロップダウンから選択
   - 出勤時刻（10:00）・退勤時刻（19:00）を入力
   - 申請理由として「x」を入力
   - 最終確認ボタン（#button_01）クリックで申請実行

### 環境変数の設定

`.env`ファイルに以下を設定：
```
KINGOFTIME_ID=your_id_here
KINGOFTIME_PASSWORD=your_password_here
```

## 重要な実装詳細

- **セレクタの特殊性**: King of Timeの特殊なDOM構造に対応したセレクタを使用
- **待機処理**: 各操作後にUIの更新を待つため、適切なwaitForTimeout/waitForSelectorを使用
- **ブラウザ設定**: `headless: false`で動作を視覚的に確認可能（本番環境ではtrueに変更推奨）
- **エラーハンドリング**: try-catchでエラーをキャッチし、ブラウザを確実にクローズ
- **ループ処理**: エラー行がなくなるまで自動的に処理を継続

## TypeScript設定

- Target: ES2020
- Module: CommonJS
- Strict: true
- Source: src/
- Output: dist/

## 開発時の注意点

- Playwrightのセレクタが変更される可能性があるため、King of Timeの画面変更時は要確認
- 認証情報は絶対にコミットしないこと（.gitignoreで.envを除外済み）
- タイムアウト値は環境により調整が必要な場合がある
- エラー行の検出ロジックは`td[title="エラー勤務です。"]`に依存しているため、UIテキストの変更に注意