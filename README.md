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

FGB に変換する方は下記のツールを使ってください

```shell
# 1 zip = 1 fgb に変換
$ ./zips_to_fgbs.sh

# 作ったfgbをPostGISテーブルにインポートする
$ ./merge_fgbs.sh PG:"..."

# PostGIS からfgbにエクスポート
$ rm ./merged.fgb; ogr2ogr -f FlatGeobuf ./merged.fgb PG:"..." mojxml -t_srs EPSG:4326 -lco SPATIAL_INDEX=NO
```
