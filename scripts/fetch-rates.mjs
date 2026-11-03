/*
 * 重新抓取牌价快照：
 *   node scripts/fetch-rates.mjs
 *
 * 数据源：
 *   - 中国银行外汇牌价（HTML）
 *   - 工商银行人民币即期外汇牌价（JSON API）
 *   - 招商银行外汇实时汇率（JSON API）
 *   - 交通银行外汇牌价（HTML）
 *   - ExchangeRate-API 中间价（JSON）
 *
 * 生成 assets/rates.js。银行牌价统一换算为“人民币 / 1 外币”。
 */
import { mkdir, writeFile } from "node:fs/promises";
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
const MID_URL = "https://open.er-api.com/v6/latest/CNY";

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
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
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

    if (Number.isFinite(buy) && Number.isFinite(sell)) {
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
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) continue;

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
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) continue;

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
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) continue;

    result[code] = {
      buy: Number((buy / 100).toFixed(8)),
      sell: Number((sell / 100).toFixed(8)),
      published: ""
    };
  }
  return result;
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

  for (const code of Object.keys(CURRENCIES)) {
    if (!boc[code]) throw new Error(`BOC missing ${code}`);
    if (!icbc[code]) throw new Error(`ICBC missing ${code}`);
    if (!midPayload.rates[code]) throw new Error(`Mid-market missing ${code}`);
  }
  if (!cmb.USD) console.warn("CMB USD quote missing; CMB cards will use BOC fallback.");
  if (!bocom.USD) console.warn("BOCOM USD quote missing; BOCOM cards will use BOC fallback.");

  if (!cmb.USD) cmb = {};
  if (!bocom.USD) bocom = {};

  const mid = {};
  for (const code of Object.keys(CURRENCIES)) {
    mid[code] = Number((1 / midPayload.rates[code]).toFixed(8));
  }

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
      { name: "ExchangeRate-API 中间价", url: "https://www.exchangerate-api.com/" }
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
      }
    },
    networkBps: {
      mastercard: 25,
      visa: 35,
      unionpay: 30
    }
  };

  const target = resolve(ROOT, "assets/rates.js");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    `/*\n * 牌价快照。由 scripts/fetch-rates.mjs 生成。\n * 银行牌价单位：人民币 / 1 外币。\n * 中间价单位：人民币 / 1 外币。\n */\nwindow.FX_RATES = ${JSON.stringify(
      data,
      null,
      2
    )};\n`,
    "utf8"
  );

  console.log(`Wrote ${target}`);
  console.log(`BOC USD sell: ${data.banks.boc.rates.USD.sell}`);
  console.log(`ICBC USD sell: ${data.banks.icbc.rates.USD.sell}`);
  console.log(`CMB USD sell: ${data.banks.cmb.rates.USD?.sell ?? "n/a"}`);
  console.log(`BOCOM USD sell: ${data.banks.bocom.rates.USD?.sell ?? "n/a"}`);
  console.log(`Snapshot: ${data.asOfLabel}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
