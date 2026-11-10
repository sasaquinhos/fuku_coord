/**
 * fuku_coord - 手持ちクローゼット初期データ (mockData.js)
 * お出かけ用 Gジャン・ワークパンツ中心のサンプル
 * (※ 気温範囲はAIがアイテム名・素材・季節感から自動判断します)
 */

const DEFAULT_USER = {
  id: "user-1",
  name: "自分 (マスター)",
  height: 175,
  weight: 85,
  hairStyle: "ショート / 刈り上げナチュラル",
  personalColor: "イエベ秋",
  preferredStyle: "アメカジ・ワーク・ミリタリー・大人カジュアル",
  note: "ジャスト〜やや短めのGジャンと、太めのワークパンツを合わせたAライン・ボックスシルエットが好き。"
};

const DEFAULT_CLOTHES = [
  // --- アウター (Gジャン & ワークアウター) ---
  {
    id: "out-01",
    category: "アウター",
    subcategory: "Gジャン",
    name: "1st型 Tバック Gジャン",
    brand: "Levi's / LVC 506XX",
    color: "濃紺 (ワンウォッシュ・リジッド)",
    fit: "ボックスシルエット・短丈",
    tags: ["短丈", "濃紺", "無骨", "王道アメカジ", "春・秋"],
    description: "シンチバック付きの1stモデル。着丈が短く、太いパンツと最高の相性。"
  },
  {
    id: "out-02",
    category: "アウター",
    subcategory: "Gジャン",
    name: "2nd型 ヴィンテージウォッシュ Gジャン",
    brand: "FULLCOUNT / 2107",
    color: "ライトインディゴ (ヒゲ・色落ち加工)",
    fit: "ややゆったり・短丈",
    tags: ["色落ち", "爽やか", "ヴィンテージ感", "春・秋・初夏"],
    description: "爽やかな色落ちの2ndモデル。春先や秋口の街歩きに最適。"
  },
  {
    id: "out-03",
    category: "アウター",
    subcategory: "Gジャン",
    name: "3rd型 ブラックデニムジャケット",
    brand: "WAREHOUSE",
    color: "ブラック (先染め・フェード)",
    fit: "レギュラーフィット",
    tags: ["黒デニム", "シャープ", "都会的", "秋・冬・春"],
    description: "落ち着いたブラックデニム。カフェや夜のお出かけでシックにまとめたい時に。"
  },
  {
    id: "out-04",
    category: "アウター",
    subcategory: "カバーオール",
    name: "10oz デニム ワークカバーオール",
    brand: "Post O'Alls",
    color: "インディゴブルー",
    fit: "ゆったり・ミドル丈",
    tags: ["カバーオール", "ポケット多数", "リラックス", "春・秋"],
    description: "着丈が長めのクラシックなワークカバーオール。ラフに羽織れる。"
  },
  {
    id: "out-05",
    category: "アウター",
    subcategory: "ミリタリー",
    name: "M-65 フィールドジャケット",
    brand: "米軍実物 / 80s",
    color: "オリーブドラブ",
    fit: "オーバーサイズ",
    tags: ["ミリタリー", "武骨", "防風", "秋・冬・肌寒い日"],
    description: "肌寒い日やドライブに最適なミリタリーアウター。"
  },
  {
    id: "out-06",
    category: "アウター",
    subcategory: "ベスト",
    name: "クラシック ダウンベスト",
    brand: "Rocky Mountain",
    color: "ネイビー × レザーヨーク(キャメル)",
    fit: "ジャスト",
    tags: ["重ね着", "レザー切り替え", "温度調節", "秋冬"],
    description: "Gジャンの上やネルシャツの上に重ね着して気温調節に重宝する。"
  },

  // --- トップス / インナー ---
  {
    id: "top-01",
    category: "トップス",
    subcategory: "Tシャツ",
    name: "ヘビーウェイト ポケットTシャツ",
    brand: "Goodwear / 7.2oz",
    color: "ホワイト (オフホワイト)",
    fit: "ボックス・肉厚",
    tags: ["白T", "肉厚", "インナー最適", "タックイン可", "夏・オールシーズン"],
    description: "Gジャンのインナーに一番映える、ガシッとした肉厚ホワイトT。"
  },
  {
    id: "top-02",
    category: "トップス",
    subcategory: "シャツ",
    name: "ブルー シャンブレー ワークシャツ",
    brand: "Buzz Rickson's",
    color: "サックスブルー",
    fit: "クラシックフィット",
    tags: ["シャンブレー", "猫目ボタン", "上品ワーク", "春・秋・初夏"],
    description: "ワークパンツにもGジャンにも抜群に馴染むシャンブレーシャツ。"
  },
  {
    id: "top-03",
    category: "トップス",
    subcategory: "スウェット",
    name: "リバースウィーブ クルーネックスウェット",
    brand: "Champion",
    color: "杢グレー (ヘザーグレー)",
    fit: "ややゆったり・肉厚",
    tags: ["肉厚スウェット", "定番", "カレッジライク", "秋冬・肌寒い日"],
    description: "Gジャンの中に着込むと最高にキマる王道の肉厚スウェット。"
  },
  {
    id: "top-04",
    category: "トップス",
    subcategory: "カットソー",
    name: "バスクシャツ (パネルボーダー)",
    brand: "Saint James / ウェッソン",
    color: "ホワイト × ネイビー",
    fit: "ボートネック・レギュラー",
    tags: ["ボーダー", "フレンチカジュアル", "清潔感", "春秋"],
    description: "無骨なワークパンツに合わせると程よい清潔感と抜け感が出る。"
  },
  {
    id: "top-05",
    category: "トップス",
    subcategory: "サーマル",
    name: "ハニカム ワッフル サーマル長袖",
    brand: "JELADO",
    color: "ナチュラル (生成り)",
    fit: "ジャスト",
    tags: ["サーマル", "レイヤード", "保温性", "秋冬・肌寒い日"],
    description: "シャツやGジャンの下に着る保温性抜群のインナー。"
  },
  {
    id: "top-06",
    category: "トップス",
    subcategory: "ニット",
    name: "シェットランドウール クルーネックニット",
    brand: "Harley of Scotland",
    color: "バーガンディ (ワインレッド)",
    fit: "レギュラー",
    tags: ["ウールニット", "差し色", "キレイめ", "真冬・寒い日"],
    description: "秋冬の暗くなりがちなコーデに大人っぽい差し色を加えるニット。"
  },

  // --- ボトムス (ワークパンツ各種) ---
  {
    id: "btm-01",
    category: "ボトムス",
    subcategory: "ワークパンツ",
    name: "M-51 ミリタリー ワイドカーゴパンツ",
    brand: "米軍実物デッドストック",
    color: "オリーブドラブ",
    fit: "超ワイド・極太ストレート",
    tags: ["極太", "カーゴ", "ミリタリー", "短丈Gジャンに最高", "通年"],
    description: "ボリューム感満点の軍パン。短丈の濃紺Gジャンと合わせるだけで王道Aラインが完成。"
  },
  {
    id: "btm-02",
    category: "ボトムス",
    subcategory: "ワークパンツ",
    name: "ダブルニー ダック地 ペインターパンツ",
    brand: "Carhartt / B01",
    color: "カーハートブラウン (キャメル)",
    fit: "ワイドストレート",
    tags: ["ダック地", "ダブルニー", "無骨ワーク", "キャメル色", "通年・タフ"],
    description: "タフなダック生地とリベット打ち。デニムジャケットのブルーとキャメルの補色バランスが完璧。"
  },
  {
    id: "btm-03",
    category: "ボトムス",
    subcategory: "ワークパンツ",
    name: "ナチュラル 生成り ペインターパンツ",
    brand: "Stan Ray / USA製",
    color: "エクリュ / 生成り (オフホワイト)",
    fit: "ワイドテーパード",
    tags: ["白系パンツ", "爽やか", "ペインター", "抜け感", "春夏秋"],
    description: "濃紺Gジャンの重さを一気に中和してくれる清潔感あるワークパンツ。"
  },
  {
    id: "btm-04",
    category: "ボトムス",
    subcategory: "チノパン",
    name: "40s US ARMY M-41 レプリカ チノトラウザー",
    brand: "Buzz Rickson's",
    color: "カーキ (ベージュ)",
    fit: "太めストレート",
    tags: ["チノパン", "ベージュ", "万能", "大人カジュアル", "通年"],
    description: "どんなアウターにも合う万能なワイドチノ。カフェやお出かけにも上品。"
  },
  {
    id: "btm-05",
    category: "ボトムス",
    subcategory: "ワークパンツ",
    name: "874 ワークパンツ (ルーズフィット)",
    brand: "Dickies",
    color: "チャコールグレー",
    fit: "ストレート",
    tags: ["TCツイル", "シワになりにくい", "都会的ワーク", "通年"],
    description: "ハリ感のあるTCツイル。ブラックGジャンや色落ちGジャンと相性良し。"
  },
  {
    id: "btm-06",
    category: "ボトムス",
    subcategory: "ワークパンツ",
    name: "オリーブ バックサテン ベイカーパンツ",
    brand: "orSlow / 01-5002",
    color: "オリーブグリーン",
    fit: "ややゆったりテーパード",
    tags: ["ベイカーパンツ", "柔らかな生地", "履き心地抜群", "通年"],
    description: "程よい太さで履きやすいベイカー。Gジャンとの鉄板コンビ。"
  },

  // --- シューズ (足元) ---
  {
    id: "shoe-01",
    category: "シューズ",
    subcategory: "ブーツ",
    name: "クラシック モックトゥ 875",
    brand: "RED WING",
    color: "オロレガシー (赤茶・ブラウン)",
    fit: "Eワイズ",
    tags: ["ワークブーツ", "本革", "無骨", "エイジング", "秋冬春・雨の日も可"],
    description: "ワークパンツ×Gジャンを完璧に引き締める至高のワークブーツ。"
  },
  {
    id: "shoe-02",
    category: "シューズ",
    subcategory: "スニーカー",
    name: "チャックテイラー CT70 ハイカット",
    brand: "Converse",
    color: "ブラック",
    fit: "ハイカット",
    tags: ["定番スニーカー", "歩きやすい", "街歩き", "通年"],
    description: "太いパンツの裾を綺麗に乗せられる万能スニーカー。"
  },
  {
    id: "shoe-03",
    category: "シューズ",
    subcategory: "スニーカー",
    name: "M990v5 ヘリテージスニーカー",
    brand: "New Balance",
    color: "グレー",
    fit: "Dワイズ",
    tags: ["ハイテクスニーカー", "極上の履き心地", "抜け感", "通年"],
    description: "アメカジにあえて合わせるグレーのニューバランス。程よいシティ感をプラス。"
  }
];

if (typeof window !== "undefined") {
  window.DEFAULT_USER = DEFAULT_USER;
  window.DEFAULT_CLOTHES = DEFAULT_CLOTHES;
}
