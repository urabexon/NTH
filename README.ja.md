# NTH

[English](README.md) | 日本語 | [Français](README.fr.md)

**NTH は、4 次元の図形を映す VJ ツールです。**  
ブラウザで動き、4 次元多胞体を GPU 上でリアルタイムに描画して 3 次元に射影するので、回転に合わせて図形が裏返ります。

- **見る**: Mac か PC の Chrome で **[nth-blue.vercel.app](https://nth-blue.vercel.app/)** を開き、画面下のバーの **Demo** を押してください。
- **操作する**: キーボード、MIDI コントローラー、マイクで操作でき、9 つのプリセットスロットにセットを保存できます。[操作](#操作) を参照。
- **読む**: 数学と描画パイプラインは [docs/how-it-works.md](docs/how-it-works.md)（英語）、フレームコストは [docs/perf.md](docs/perf.md) にあります。

![rendered in NTH](public/screenshots/120-cell.jpg)

NTH は 24 種類の正多胞体と準正多胞体を、4 次元空間の 6 つの平面すべてで回転させ、毎フレーム 3 次元球面に載せてから 3 次元へ射影します。
辺は光る管として、面はガラスとして描き、辺の上を流れる粒子と空間を漂う塵、ライブ演出向けのポスト処理を重ねています。

## 操作

マウスを動かすと、画面下にキーの一覧が表示されます。

| キー      | 動作                                                             |
| --------- | ---------------------------------------------------------------- |
| Space     | 次の多胞体（ランダム）                                           |
| A         | 画面を一瞬揺らす（乱流）                                         |
| S         | 4D 回転とカメラの軌道をランダムに切り替える                      |
| R         | スリットスキャン                                                 |
| T         | ワームホール（カメラ拡大 + レンズ）                              |
| Q / W / E | 効果なし / リピート / ミラー                                     |
| Z         | 色反転                                                           |
| Shift     | 押している間カメラを引く                                         |
| M         | マイク入力で音に反応させる                                       |
| 1〜9      | 保存したプリセットを呼び出す                                     |
| H         | 設定パネルの表示切替（スライダー、プリセット、計測値、共有 URL） |

**MIDI**: KORG の nanoKONTROL2（フェーダーとツマミが 8 本ずつ並んだ小さな USB コントローラー）なら、買ったままの設定で繋ぐだけで動きます。フェーダーで射影距離・回転・各効果の強さ、ボタンで上の表のキーを操作できます（割り当ては `src/midi/nanokontrol2.json`）。他のコントローラーでも、このファイルを複製して CC 番号を自分の機器に合わせれば使えます。

**見た目の共有**: パネルの **copy link** を押すと、今とまったく同じ状態で NTH を開ける URL が得られます。

## 動作要件

- WebGPU 対応のデスクトップブラウザ（Chrome か Edge）。Safari と Firefox では WebGL2 で動作しますが、粒子と塵は表示されません。
- スマートフォンとタブレットでは動作せず、スクリーンショットの一覧だけを表示します。
- 開発には Node.js 22.12 以降（`.nvmrc` 参照）と pnpm 10 が必要です。

## 開発

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # ユニットテスト（Vitest）
pnpm test:e2e     # ブラウザテスト（Playwright、インストール済みの Chrome を使用）
pnpm build        # dist/ に静的サイトを出力
```

CI では lint、型チェック、ユニットテスト、ビルドに加え、ブラウザテストの一部をソフトウェア描画の WebGL で実行します。

## パフォーマンス

`pnpm bench` で、多胞体と効果ごとの CPU 時間、GPU 時間、ドローコール数、VRAM を自分のマシンで計測できます。  
前提条件と現在の基準値は [docs/perf.md](docs/perf.md) にあります。

## 技術スタック

| 層         | 採用                                             |
| ---------- | ------------------------------------------------ |
| ビルド     | Vite + TypeScript + pnpm                         |
| 描画       | three.js WebGPURenderer（WebGL2 フォールバック） |
| シェーダー | TSL (Three Shading Language)                     |
| GPU 計算   | WebGPU コンピュートシェーダー                    |
| ポスト処理 | three.js PostProcessing ノード + 自作ノード      |
| 入力       | キーボード、Web MIDI API、Web Audio API          |
| UI         | Tweakpane                                        |
| テスト     | Vitest、Playwright                               |

## デプロイ

静的ホストならどこでも動きますが、HTTPS での配信が必要です。  
公開サイトは Vercel 上です（ビルド `pnpm build`、出力 `dist`）。  
サブパス配下に置く場合は `BASE_PATH=/subpath/` を付けてビルドしてください。

## Credits

- Demo track: "Ricochet" by Rob Gasser [NCS Release], [NoCopyrightSounds](https://ncs.io/Ricochet).  
  See [public/demo/LICENSE.txt](public/demo/LICENSE.txt).
- [three.js](https://threejs.org/), [Tweakpane](https://tweakpane.github.io/docs/).

## License

MIT for the code ([LICENSE](LICENSE)).  
The demo track and third-party dependencies have their own licenses;  
see [NOTICE.md](NOTICE.md).
