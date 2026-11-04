# 择卡 · Rate-aware Card Finder

一个纯静态的外币消费决策页：输入金额和币种，比较六条支付路径、四家银行、十一张代表卡的预计人民币入账成本。

重点比较的是**支付路径**，不是把市面上的卡一张张排名。每条路径用一两张代表卡说明，例如“中行莫奈世界卡”代表纯外币多币种路径，“招行全币种 Visa”代表美元账户全币种路径。

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
- 六条支付路径：
  1. 工行购汇 · 多币种直付
  2. 中行购汇 · 纯外币多币种（依赖本行人民币卡购汇转入）
  3. 万事达人民币入账
  4. 招行购汇 · 全币种卡
  5. 交行购汇 · 双币卡
  6. 银联人民币入账
- 11 张代表卡：工行奋斗万事达、工行宇宙星座卡、中行莫奈世界卡、中行长城国际卡、中行万事网联人民币卡、招行全币种 Visa、招行万事达标准信用卡、交行银联环球卡、交行太平洋双币卡 Visa、交行太平洋双币卡 Mastercard、工行银联双标卡。
- 自动排序路径，显示最优路径、与最贵路径的差额、有效折算率。
- 点击右侧任一路径，左侧大卡片会同步切换到该路径，并显示“比最优多多少”；可一键回到最优。
- 可展开路径的支付步骤、代表卡与成本拆解。
- “汇率与费用假设”可调每条路径的货币转换费和返现；卡组织汇率直接查询。
- 金额、币种和假设会保存在浏览器 `localStorage`。
- 页面运行时不发外部请求，无第三方脚本、无追踪。

## 数据来源与刷新

页面载入的是**牌价快照**，不是实时成交价。

### 官网牌价

- 中国银行外汇牌价
- 中国工商银行人民币即期外汇牌价
- 招商银行外汇实时汇率
- 交通银行外汇牌价

`scripts/fetch-rates.mjs` 抓取这些页面/接口，统一换算成“人民币 / 1 外币”，写入 `assets/rates.js`。部分银行网关仍启用 legacy renegotiation，脚本对公开牌价请求启用了兼容的 TLS 选项。招行/交行的牌价覆盖币种较少，缺失币种在页面汇率表中自动隐藏。

### 中间价

- ExchangeRate-API：仅作为对比基准，不再替代卡组织汇率参与换算。

### 卡组织汇率：直接查询

- Visa / 万事达 / 银联的卡组织汇率从[快易理财网](https://www.kylc.com/upcurrency.html)的卡组织汇率页抓取。
- 按“交易币种 × 账户币种”取数，例如 Visa 人民币账户的欧元汇率、美元账户的欧元汇率。
- 通常每日更新；页面会显示各卡组织的数据日期，Visa / 万事达有时会相差一天。
- 这是第三方聚合的查询数据，不是银行中间价，也不等于最终入账价；最终以卡组织清算为准。

### 路径费率与返现：默认 0

- 货转费默认 0。
- 返现默认 0。
- 这些不是银行实时权益，也不是你的实际账单；请按自己的卡填写。

因此，卡组织汇率是实查的；只有货转费和返现默认 0，结果仍可能偏乐观。

### 刷新机制

- **本地**：不会自动刷新，运行 `npm run update-rates` 手动更新。
- **GitHub Pages**：仓库内置 `.github/workflows/update-rates.yml`，每 6 小时抓取一次并提交新快照，Pages 随后重新发布；已打开的页面刷新后才会看到新快照。需要仓库 Actions 有写权限。
- 页面头部始终显示当前快照时间。

## 计算口径

```text
预计人民币入账
= 外币金额 × 卡组织折算率 × 银行购汇率 × (1 + 货转费)
− 返现 / 积分折现
```

- 银行购汇使用“现汇卖出价”，不是中间价或现钞买入价。
- 卡组织人民币入账、美元中转使用 Visa / 万事达 / 银联的实查汇率，不再用中间价加点。
- 中行莫奈世界卡是纯外币、多币种账户：币种匹配时直接入账，还款时用另一张中行人民币卡购汇转入；未覆盖币种才经美元。
- 招行全币种 Visa 以美元为账户币种；交行 Visa 双币卡也按“卡组织折美元 + 银行美元购汇”计算。
- 多币种路径在币种未覆盖时，会按“卡组织折美元 + 银行美元购汇”计算。
- 货币转换费按折算后金额加收；返现按含费金额抵扣。
- 结果仅供消费前比较，最终以发卡行和卡组织入账为准。

## 代表卡参考

- 工行 宇宙星座卡（Visa 单标识多币种、10 个外币账户）：[工行官方产品页](https://big5.icbc.com.cn/ICBC/%e7%89%a1%e4%b8%b9%e5%8d%a1/%e5%8d%a1%e7%89%87%e4%b8%96%e7%95%8c/%e8%b6%a3%e5%91%b3%e4%b8%bb%e9%a2%98%e7%b3%bb%e5%88%97/%e5%ae%87%e5%ae%99%e6%98%9f%e5%ba%a7%e4%bf%a1%e7%94%a8%e5%8d%a1/%e5%ae%87%e5%ae%99%e6%98%9f%e5%ba%a7%e4%bf%a1%e7%94%a8%e5%8d%a1.htm)
- 中行 长城国际卡（港币 / 美元 / 欧元 / 英镑 / 澳元账户）：[中行官方产品页](https://www.boc.cn/bcservice/bc1/200812/t20081211_143759_76.htm)
- 招行 全币种国际信用卡（Visa 线路、美元账户、自动购汇）：[招行官方产品页](https://market.cmbchina.com/ccard/quanbikadsp/index.html)
- 招行万事达卡人民币结算切换公告：[招行官方公告](https://cc.cmbchina.com/notice/20250912gg.htm)
- 交行 太平洋双币信用卡（银联 + Mastercard / Visa，人民币 + 美元）：[产品说明](https://wapbaike.baidu.com/item/%E5%A4%AA%E5%B9%B3%E6%B4%8B%E5%8F%8C%E5%B8%81%E4%BF%A1%E7%94%A8%E5%8D%A1)

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
│   ├── app.js          # 路径比较、排序、渲染与交互
│   ├── cards.js        # 支付路径、代表卡与币种元数据
│   ├── rates.js        # 牌价快照（脚本生成）
│   └── favicon.svg
├── scripts/
│   └── fetch-rates.mjs # 抓取并生成 rates.js
├── .github/
│   └── workflows/
│       └── update-rates.yml # 每 6 小时刷新牌价
├── preview/
├── .nojekyll
└── README.md
```

## 说明

卡名仅用于说明支付路径，不构成办卡或产品推荐。卡组织、币种账户、货转费、返现规则均可能随产品与时间变化，请以发卡行最新条款为准。




