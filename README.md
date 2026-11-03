# 择卡 · Rate-aware Card Finder

一个纯静态的外币消费决策页：输入金额和币种，比较五种支付路径的预计人民币入账成本。

风格参考 Apple 产品页（液态玻璃之前的简洁、实色、留白版本），主题色取自参考站点 `yummy-he.github.io` 的番茄红 `#FF6347`。

![桌面端预览](preview/desktop.jpg)

## 本地运行

无需安装依赖：

```bash
npm start
```

打开 <http://127.0.0.1:4173>。

也可以直接双击 `index.html`，页面不依赖构建步骤；不过用本地服务器打开更接近 GitHub Pages 的行为。

## 功能

- 支持 14 个币种：USD、EUR、GBP、JPY、HKD、SGD、AUD、CAD、CHF、KRW、THB、MYR、NZD、MOP。
- 五种支付路径：
  1. 银行购汇 · 多币种直付
  2. 银行购汇 · 纯外币卡
  3. 卡组织汇率 · 人民币入账
  4. 美元中转 · 双币卡
  5. 银联通道 · 人民币入账
- 自动排序、显示最优卡、与最贵路径的差额、有效折算率。
- 可展开每张卡的支付步骤与成本拆解。
- “汇率与费用假设”可调卡组织加点、每张卡的货币转换费和返现。
- 金额、币种和假设会保存在浏览器 `localStorage`。
- 无第三方脚本、无网络请求、无追踪。

## 汇率数据

页面载入的是**牌价快照**，不是实时成交价：

- 中国银行外汇牌价
- 中国工商银行人民币即期外汇牌价
- ExchangeRate-API 中间价

更新快照：

```bash
npm run update-rates
```

脚本会抓取上述来源并重写 `assets/rates.js`。中行/工行的网关仍启用 legacy renegotiation，脚本对这两个公开牌价请求启用了兼容的 TLS 选项。

卡组织入账汇率没有稳定的静态公开接口，因此页面用“中间价 + 加点”模拟：

- 万事达：默认 +25bp
- Visa：默认 +35bp
- 银联：默认 +30bp

这些都可以在页面的“汇率与费用假设”里调整。

## 计算口径

```text
预计人民币入账
= 外币金额 × 卡组织折算率 × 银行购汇率 × (1 + 货转费)
− 返现 / 积分折现
```

- 银行购汇使用“现汇卖出价”，不是中间价或现钞买入价。
- 多币种卡在币种未覆盖时，会按“卡组织折美元 + 银行美元购汇”计算。
- 纯外币卡、美元双币卡以美元账户为例。
- 货币转换费按折算后金额加收；返现按含费金额抵扣。
- 结果仅供消费前比较，最终以发卡行和卡组织入账为准。

## 部署到 GitHub Pages

仓库根目录就是发布目录，不需要构建。

```bash
git init
git add .
git commit -m "feat: add rate-aware card finder"
git branch -M main
git remote add origin https://github.com/<your-name>/<repo>.git
git push -u origin main
```

然后在 GitHub 仓库 **Settings → Pages**：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

`.nojekyll` 已包含，静态资源不会被 Jekyll 处理。发布后的地址通常是：

```text
https://<your-name>.github.io/<repo>/
```

## 文件结构

```text
.
├── index.html
├── styles.css
├── server.mjs
├── package.json
├── assets/
│   ├── app.js          # 比较、排序、渲染与交互
│   ├── cards.js        # 代表性卡片与币种元数据
│   ├── rates.js        # 牌价快照（脚本生成）
│   └── favicon.svg
├── scripts/
│   └── fetch-rates.mjs # 抓取并生成 rates.js
├── .nojekyll
└── README.md
```

## 说明

卡名仅用于说明支付路径，不构成办卡或产品推荐。卡组织、币种账户、货转费、返现规则均可能随产品与时间变化，请以发卡行最新条款为准。
