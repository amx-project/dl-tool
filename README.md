# MOJXML ダウンロードツール

このツールはZIPファイル一覧を出力するツールとなります。下記のコマンドでダウンロードするためのJSONを用意することができます。

```
npm install
npm run download:list
```

出力サンプル

```json
[
  {
    "org": "moj-01hokkaido",
    "title": "札幌市中央区（札幌法務局）登記所備付地図データ",
    "year": "2024",
    "zip_name": "01101-4300-2024.zip",
    "zip_url": "https://www.geospatial.jp/ckan/dataset/a0d32d77-474c-44b0-b435-0b64147cc1f1/resource/924aca4a-a793-4931-9afe-e195c031fca7/download/01101-4300-2024.zip"
  },
  ...
```

ダウンロードするコマンドも用意しています

```
npm run download:zips {YEAR}
```

- YEAR を指定してください
- `./zip` ディレクトリに出力されます。
- 存在するファイルはスキップされます。
