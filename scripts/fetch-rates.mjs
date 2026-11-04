/*
 * 重新抓取牌价快照：
 *   node scripts/fetch-rates.mjs
 *
 * 数据源：
 *   - 中国银行外汇牌价（HTML）
 *   - 工商银行人民币即期外汇牌价（JSON API）
 *   - 招商银行外汇实时汇率（JSON API）
 *   - 交通银行外汇牌价（HTML）
 *   - 快易理财网 Visa / 万事达 / 银联卡组织汇率（HTML）
 *   - ExchangeRate-API 中间价（JSON）
 *
 * 生成 assets/rates.js。银行牌价统一换算为“人民币 / 1 外币”。
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import crypto from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BOC_URL = "https://www.boc.cn/sourcedb/whpj/";
const ICBC_URL = "https://papi.icbc.com.cn/exchanges/ns/getLatest";
const CMB_URL = "https://fx.cmbchina.com/api/v1/fx/rate";
const BOCOM_URL =
  "https://www.bankcomm.com/BankCommSite/shtml/jyjr/cn/7158/list.shtml?channelId=7158&anchor=goSCYJ";
const KYLC_BASE = "https://www.kylc.com";
const MID_URL = "https://open.er-api.com/v6/latest/CNY";
const CITIC_URL = "https://etrade.citicbank.com/portalweb/cms/getForeignExchRate.htm";
const CITIC_SOURCE = "https://www.citicbank.com/common/financialnews/news/202408/t20240829_3716.html";
const ABC_SOURCE = "https://ewealth.abchina.com/foreignexchange/listprice/";
const ABC_URL = "https://ewealth.abchina.com/app/data/api/DataService/ExchangeRateV2";

const CURRENCIES = {
  USD: "美元",
  EUR: "欧元",
  GBP: "英镑",
  JPY: "日元",
  HKD: "港币",
  SGD: "新加坡元",
  AUD: "澳大利亚元",
  CAD: "加拿大元",
  CHF: "瑞士法郎",
  KRW: "韩国元",
  THB: "泰国铢",
  MYR: "林吉特",
  NZD: "新西兰元",
  MOP: "澳门元"
};

const BOC_NAME_TO_CODE = Object.fromEntries(
  Object.entries(CURRENCIES).map(([code, name]) => [name, code])
);

/*
 * 部分银行网关仍启用了 legacy renegotiation，Node 24 的默认 OpenSSL
 * 设置会直接拒绝握手。这里只对公开牌价请求重新打开该兼容选项。
 */
const legacyAgent = new https.Agent({
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
});

function getText(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = options.body;
    const request = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: options.method || "GET",
        agent: legacyAgent,
        timeout: 30000,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
          accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          ...(options.headers || {})
        }
      },
      (response) => {
        let data = "";
        response.on("error", reject);
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          const location = response.headers.location;
          if (
            [301, 302, 303, 307, 308].includes(response.statusCode) &&
            location &&
            (options.redirectCount || 0) < 4
          ) {
            response.resume();
            resolve(
              getText(new URL(location, url).toString(), {
                ...options,
                redirectCount: (options.redirectCount || 0) + 1
              })
            );
            return;
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`${url} -> HTTP ${response.statusCode}`));
          }
        });
      }
    );

    request.on("timeout", () => request.destroy(new Error(`${url} timed out`)));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function isPositiveRate(value) {
  return Number.isFinite(value) && value > 0;
}

function parseAbc(payload) {
  const result = {};
  for (const item of payload.Data?.Table || []) {
    const code = item.CurrName?.match(/\(([A-Z]{3})\)$/)?.[1];
    const buy = Number(item.BuyingPrice) / 100;
    const sell = Number(item.SellPrice) / 100;
    if (!Object.hasOwn(CURRENCIES, code) || !isPositiveRate(buy) || !isPositiveRate(sell) || buy > sell) continue;
    if (!Number.isFinite(Date.parse(item.PublishTime))) continue;
    result[code] = { buy, sell, published: item.PublishTime };
  }
  return result;
}

function parseCitic(payload) {
  const result = {};
  for (const item of payload.content?.resultList || []) {
    const code = BOC_NAME_TO_CODE[item.curName] || { 韩元: "KRW" }[item.curName];
    const buy = Number(item.cstexcBuyPrice) / 100;
    const sell = Number(item.cstexcSellPrice) / 100;
    if (!code || !isPositiveRate(buy) || !isPositiveRate(sell)) continue;
    result[code] = { buy, sell, published: `${item.quotePriceDate} ${item.quotePriceTime}` };
  }
  return result;
}

function parseBoc(html) {
  const result = {};
  const rowPattern = /<tr data-currency='([^']+)'>(.*?)<\/tr>/gs;

  for (const match of html.matchAll(rowPattern)) {
    const name = match[1];
    const code = BOC_NAME_TO_CODE[name];
    if (!code) continue;

    const cells = Array.from(match[2].matchAll(/<td[^>]*>(.*?)<\/td>/gs)).map((cell) =>
      cell[1].replace(/<[^>]+>/g, "").trim()
    );

    if (cells.length < 8) continue;
    const buy = Number.parseFloat(cells[1]);
    const sell = Number.parseFloat(cells[3]);
    const published = `${cells[6]} ${cells[7]}`;

    if (isPositiveRate(buy) && isPositiveRate(sell)) {
      result[code] = {
        buy: Number((buy / 100).toFixed(8)),
        sell: Number((sell / 100).toFixed(8)),
        published
      };
    }
  }

  return result;
}

function parseIcbc(payload) {
  const result = {};
  for (const item of payload.data || []) {
    const code = item.currencyENName;
    if (!CURRENCIES[code]) continue;
    const buy = Number.parseFloat(item.foreignBuy);
    const sell = Number.parseFloat(item.foreignSell);
    if (!isPositiveRate(buy) || !isPositiveRate(sell)) continue;

    result[code] = {
      buy: Number((buy / 100).toFixed(8)),
      sell: Number((sell / 100).toFixed(8)),
      published: `${item.publishDate} ${item.publishTime}`
    };
  }
  return result;
}

function parseCmb(payload) {
  const result = {};
  for (const item of payload.body || []) {
    const code = String(item.ccyNbrEng || "").match(/([A-Z]{3})\s*$/)?.[1];
    if (!code || !CURRENCIES[code]) continue;

    const buy = Number.parseFloat(item.rthBid);
    const sell = Number.parseFloat(item.rthOfr);
    if (!isPositiveRate(buy) || !isPositiveRate(sell)) continue;

    result[code] = {
      buy: Number((buy / 100).toFixed(8)),
      sell: Number((sell / 100).toFixed(8)),
      published: `${item.ratDat} ${item.ratTim}`
    };
  }
  return result;
}

function parseBocom(html) {
  const names = {
    美元USD: "USD",
    欧元EUR: "EUR",
    英镑GBP: "GBP",
    澳元AUD: "AUD"
  };
  const result = {};

  for (const row of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = Array.from(row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((cell) =>
      cell[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );
    if (cells.length < 3) continue;

    const code = names[cells[0]];
    if (!code) continue;

    const buy = Number.parseFloat(cells[1]);
    const sell = Number.parseFloat(cells[2]);
    if (!isPositiveRate(buy) || !isPositiveRate(sell)) continue;

    result[code] = {
      buy: Number((buy / 100).toFixed(8)),
      sell: Number((sell / 100).toFixed(8)),
      published: ""
    };
  }
  return result;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function parseKylcRate(html) {
  const text = stripHtml(html);
  const rateMatch = text.match(/汇率:\s*([0-9]+(?:\.[0-9]+)?)/);
  const fullDateMatch = text.match(/发布时间:\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
  const shortDateMatch = text.match(/\((\d{1,2})月(\d{1,2})日\)/);
  if (!rateMatch || (!fullDateMatch && !shortDateMatch)) return null;

  const rate = Number.parseFloat(rateMatch[1]);
  if (!isPositiveRate(rate)) return null;

  const snapshotYear = text.match(/本页快照时间:\s*(\d{4})/)?.[1];
  const year = fullDateMatch?.[1] || snapshotYear || String(new Date().getFullYear());
  const month = fullDateMatch?.[2] || shortDateMatch?.[1];
  const day = fullDateMatch?.[3] || shortDateMatch?.[2];
  if (!month || !day) return null;

  return {
    rate,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  };
}

async function fetchKylcPair(brand, account, code) {
  const url =
    brand === "unionpay"
      ? `${KYLC_BASE}/uprate/${code.toLowerCase()}.html`
      : `${KYLC_BASE}/huilv/i-${brand}/${account}/${code.toLowerCase()}.html`;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const parsed = parseKylcRate(await getText(url));
      if (parsed) return { ...parsed, url };
    } catch (error) {
      if (attempt === 2) {
        console.warn(`Kylc rate unavailable: ${brand}/${account}/${code} (${error.message})`);
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250 * attempt));
  }
  return null;
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function latestDate(dates) {
  return dates.filter(Boolean).sort().at(-1) || "";
}

function asOfLabel(date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${pick("year")}年${pick("month")}月${pick("day")}日 ${pick("hour")}:${pick("minute")}`;
}

async function replaceFile(target, content) {
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function archiveSnapshot(folder, snapshot) {
  const fetchedAt = JSON.parse(snapshot.slice(snapshot.indexOf("{"), snapshot.lastIndexOf("}") + 1)).fetchedAt;
  const date = new Date(fetchedAt);
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(date);
  const time = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23"
  }).format(date).replace(/\D/g, "-");
  const archived = snapshot.replace("window.FX_RATES =", "window.FX_HISTORICAL_RATES =");
  await replaceFile(resolve(folder, `${day}T${time}.js`), archived);
  await replaceFile(resolve(folder, `${day}.js`), archived);
}

async function main() {
  console.log("Fetching BOC quotes...");
  const bocHtml = await getText(BOC_URL);
  const boc = parseBoc(bocHtml);

  console.log("Fetching ICBC quotes...");
  const icbcPayload = JSON.parse(
    await getText(ICBC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    })
  );
  const icbc = parseIcbc(icbcPayload);

  console.log("Fetching CMB quotes...");
  let cmb = {};
  try {
    cmb = parseCmb(JSON.parse(await getText(CMB_URL)));
  } catch (error) {
    console.warn(`CMB quotes unavailable: ${error.message}`);
  }

  console.log("Fetching BOCOM quotes...");
  let bocom = {};
  try {
    bocom = parseBocom(await getText(BOCOM_URL));
  } catch (error) {
    console.warn(`BOCOM quotes unavailable: ${error.message}`);
  }

  console.log("Fetching mid-market rates...");
  const midPayload = JSON.parse(await getText(MID_URL));
  if (midPayload.result !== "success") {
    throw new Error("ExchangeRate-API request was not successful.");
  }

  let citic = {};
  try {
    citic = parseCitic(JSON.parse(await getText(CITIC_URL)));
    if (!Object.keys(citic).length) console.warn("CITIC returned no valid quotes.");
  } catch (error) {
    console.warn(`CITIC quotes unavailable: ${error.message}`);
  }

  let abc = {};
  try {
    abc = parseAbc(JSON.parse(await getText(ABC_URL)));
    if (!abc.USD) console.warn("ABC returned no valid USD quote.");
  } catch (error) {
    console.warn(`ABC quotes unavailable: ${error.message}`);
  }

  for (const code of Object.keys(CURRENCIES)) {
    if (!boc[code]) throw new Error(`BOC missing ${code}`);
    if (!icbc[code]) throw new Error(`ICBC missing ${code}`);
    if (!isPositiveRate(midPayload.rates?.[code])) throw new Error(`Mid-market invalid or missing ${code}`);
  }
  if (!cmb.USD) console.warn("CMB USD quote missing; CMB cards will use BOC fallback.");
  if (!bocom.USD) console.warn("BOCOM USD quote missing; BOCOM cards will use BOC fallback.");

  const mid = {};
  for (const code of Object.keys(CURRENCIES)) {
    mid[code] = Number((1 / midPayload.rates[code]).toFixed(8));
  }

  console.log("Fetching Visa / Mastercard / UnionPay card-network rates...");
  const currencyCodes = Object.keys(CURRENCIES);
  const pairTasks = [];
  for (const brand of ["visa", "mastercard"]) {
    for (const code of currencyCodes) {
      pairTasks.push({ brand, account: "cny", code });
    }
    for (const code of currencyCodes.filter((item) => item !== "USD")) {
      pairTasks.push({ brand, account: "usd", code });
    }
  }
  for (const code of currencyCodes) {
    pairTasks.push({ brand: "unionpay", account: "cny", code });
  }

  const networkResults = await mapLimit(pairTasks, 4, (task) =>
    fetchKylcPair(task.brand, task.account, task.code).then((result) => ({
      ...task,
      ...(result || {})
    }))
  );
  const missingNetworkRates = networkResults.filter((item) => !Number.isFinite(item.rate));
  if (missingNetworkRates.length) {
    throw new Error(
      `Kylc missing ${missingNetworkRates.length} card-network rates: ${missingNetworkRates
        .map((item) => `${item.brand}/${item.account}/${item.code}`)
        .join(", ")}`
    );
  }

  const networkData = {
    visa: { label: "Visa", cny: {}, usd: {}, pairDates: { cny: {}, usd: {} } },
    mastercard: { label: "万事达", cny: {}, usd: {}, pairDates: { cny: {}, usd: {} } },
    unionpay: { label: "银联", cny: {}, pairDates: { cny: {} } }
  };
  for (const item of networkResults) {
    networkData[item.brand][item.account][item.code] = item.rate;
    networkData[item.brand].pairDates[item.account][item.code] = item.date;
  }
  for (const key of ["visa", "mastercard", "unionpay"]) {
    const network = networkData[key];
    network.updated = latestDate(Object.values(network.pairDates).flatMap(Object.values));
  }
  networkData.visa.sourceUrl = `${KYLC_BASE}/huilv/i-visa/cny/usd.html`;
  networkData.mastercard.sourceUrl = `${KYLC_BASE}/huilv/i-mastercard/cny/usd.html`;
  networkData.unionpay.sourceUrl = `${KYLC_BASE}/upcurrency.html`;

  const compactRates = (rates) =>
    Object.fromEntries(
      Object.entries(rates).map(([code, value]) => [
        code,
        { buy: value.buy, sell: value.sell }
      ])
    );

  const now = new Date();
  const data = {
    fetchedAt: now.toISOString(),
    asOfLabel: asOfLabel(now),
    sources: [
      { name: "中国银行外汇牌价", url: BOC_URL },
      {
        name: "工商银行人民币即期外汇牌价",
        url: "https://www.icbc.com.cn/column/1438058341489590354.html"
      },
      { name: "招商银行外汇实时汇率", url: "https://fx.cmbchina.com/hq/" },
      {
        name: "交通银行外汇牌价",
        url: "https://www.bankcomm.com/BankCommSite/shtml/jyjr/cn/7158/list.shtml?channelId=7158"
      },
      {
        name: "快易理财网卡组织汇率",
        url: "https://www.kylc.com/upcurrency.html"
      },
      { name: "ExchangeRate-API 中间价", url: "https://www.exchangerate-api.com/" },
      { name: "中信银行外汇牌价", url: CITIC_SOURCE },
      { name: "中国农业银行结售汇牌价", url: ABC_SOURCE }
    ],
    mid,
    banks: {
      boc: {
        label: "中国银行",
        short: "中行",
        updated: boc.USD.published.split(" ")[1]?.slice(0, 5) || "",
        rates: compactRates(boc)
      },
      icbc: {
        label: "中国工商银行",
        short: "工行",
        updated: icbc.USD.published.split(" ")[1]?.slice(0, 5) || "",
        rates: compactRates(icbc)
      },
      cmb: {
        label: "招商银行",
        short: "招行",
        updated: cmb.USD?.published.split(" ")[1]?.slice(0, 5) || "",
        rates: compactRates(cmb)
      },
      bocom: {
        label: "交通银行",
        short: "交行",
        updated: "",
        rates: compactRates(bocom)
      },
      citic: {
        label: "中信银行",
        short: "中信",
        updated: citic.USD?.published || "",
        rates: compactRates(citic)
      },
      abc: {
        label: "中国农业银行",
        short: "农行",
        updated: abc.USD?.published.replace("T", " ").replace("+08:00", "") || "",
        rates: compactRates(abc)
      }
    },
    networks: networkData
  };

  const target = resolve(ROOT, "assets/rates.js");
  const history = resolve(dirname(target), "history");
  await mkdir(history, { recursive: true });
  const snapshot = `/*\n * 牌价快照。由 scripts/fetch-rates.mjs 生成。\n * 银行牌价单位：人民币 / 1 外币。\n * 中间价单位：人民币 / 1 外币。\n */\nwindow.FX_RATES = ${JSON.stringify(data, null, 2)};\n`;
  let previous;
  try {
    previous = await readFile(target, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (previous) await archiveSnapshot(history, previous);
  await archiveSnapshot(history, snapshot);
  const days = (await readdir(history))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.js$/.test(name))
    .map((name) => name.slice(0, -3)).sort().reverse();
  await replaceFile(resolve(history, "dates.js"), `window.FX_HISTORY_DATES = ${JSON.stringify(days)};\n`);
  await replaceFile(target, snapshot);

  console.log(`Wrote ${target}`);
  console.log(`BOC USD sell: ${data.banks.boc.rates.USD.sell}`);
  console.log(`ICBC USD sell: ${data.banks.icbc.rates.USD.sell}`);
  console.log(`CMB USD sell: ${data.banks.cmb.rates.USD?.sell ?? "n/a"}`);
  console.log(`BOCOM USD sell: ${data.banks.bocom.rates.USD?.sell ?? "n/a"}`);
  console.log(`Visa CNY/USD: ${data.networks.visa.cny.USD} (${data.networks.visa.updated})`);
  console.log(
    `Mastercard CNY/USD: ${data.networks.mastercard.cny.USD} (${data.networks.mastercard.updated})`
  );
  console.log(`UnionPay CNY/USD: ${data.networks.unionpay.cny.USD} (${data.networks.unionpay.updated})`);
  console.log(`Snapshot: ${data.asOfLabel}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
