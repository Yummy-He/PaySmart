(function () {
  "use strict";

  const LATEST_RATES = window.FX_RATES;
  let RATES = LATEST_RATES;
  const CARDS = window.FX_CARDS;
  const PATHS = window.FX_PATHS;
  const CURRENCIES = window.FX_CURRENCIES;
  if (!RATES || !CARDS || !PATHS || !CURRENCIES) {
    console.error("汇率或支付路径数据未加载。");
    return;
  }
  const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));
  const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));
  const STORAGE_KEY = "zeka-state-v5";
  const BANK_ORDER = ["boc", "icbc", "cmb", "bocom", "abc", "citic"];
  const historyDates = window.FX_HISTORY_DATES || [];
  let abcQuoteOverride = null;

  const DEFAULT_STATE = (() => {
    const pathState = {};
    PATHS.forEach((path) => {
      const card = CARD_MAP[path.primaryCardId];
      pathState[path.id] = {
        feePct: card.feePct,
        cashbackPct: card.cashbackPct
      };
    });
    return {
      amount: 1000,
      currency: "USD",
      paths: pathState
    };
  })();

  let state = loadState();
  let selectedPathId = null;
  let currentResults = [];
  let currentWinner = null;

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const dom = {
    amountInput: $("#amountInput"),
    amountPrefix: $("#amountPrefix"),
    currencyChips: $("#currencyChips"),
    currencyLabel: $("#currencyLabel"),
    snapshotDate: $("#snapshotDate"),
    snapshotStatus: $("#snapshotStatus"),
    manualQuotes: $("#manualQuotes"),
    abcQuote: $("#abcQuote"),
    unavailablePaths: $("#unavailablePaths"),
    rankingTitle: $("#rankingTitle"),
    factRows: $("#factRows"),
    factNote: $("#factNote"),
    winnerCard: $("#winnerCard"),
    winnerContent: $("#winnerContent"),
    rankingList: $("#rankingList"),
    routeTitle: $("#routeTitle"),
    routeTag: $("#routeTag"),
    routeReps: $("#routeReps"),
    routeSteps: $("#routeSteps"),
    routeVerdict: $("#routeVerdict"),
    costList: $("#costList"),
    pathParams: $("#pathParams"),
    pathTypes: $("#pathTypes"),
    rateTableTitle: $("#rateTableTitle"),
    rateTableBody: $("#rateTableBody"),
    openAssumptions: $("#openAssumptions"),
    assumptions: $("#assumptions"),
    resetBtn: $("#resetBtn"),
    liveRegion: $("#liveRegion")
  };

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */

  function freshState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function clamp(value, min, max, fallback) {
    if (typeof value !== "number" && typeof value !== "string") return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function loadState() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return freshState();
    }
    if (!saved || typeof saved !== "object") return freshState();

    const next = freshState();
    next.amount = Number(clamp(saved.amount, 0, 1000000000, next.amount).toFixed(2));
    if (typeof saved.currency === "string" && Object.hasOwn(CURRENCY_MAP, saved.currency)) {
      next.currency = saved.currency;
    }

    if (saved.paths && typeof saved.paths === "object") {
      Object.keys(next.paths).forEach((id) => {
        const item = saved.paths[id];
        if (!item || typeof item !== "object") return;
        next.paths[id].feePct = clamp(item.feePct, 0, 5, next.paths[id].feePct);
        next.paths[id].cashbackPct = clamp(
          item.cashbackPct,
          0,
          5,
          next.paths[id].cashbackPct
        );
      });
    }

    return next;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* localStorage can be unavailable in private or file contexts. */
    }
  }

  /* ---------------------------------------------------------
     Formatting
     --------------------------------------------------------- */

  function cny(value, withSymbol = true) {
    const safe = Number.isFinite(value) ? value : 0;
    return (
      (withSymbol ? "¥" : "") +
      safe.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }

  function foreign(value, code) {
    const meta = CURRENCY_MAP[code] || CURRENCY_MAP.USD;
    const safe = Number.isFinite(value) ? value : 0;
    const gap = /^[A-Z]{2,3}$/.test(meta.symbol) ? " " : "";
    return (
      meta.symbol +
      gap +
      safe.toLocaleString("en-US", {
        minimumFractionDigits: meta.decimals,
        maximumFractionDigits: meta.decimals
      })
    );
  }

  function rateDecimals(value) {
    const abs = Math.abs(value);
    if (abs >= 1) return 4;
    if (abs >= 0.1) return 5;
    if (abs >= 0.01) return 6;
    return 7;
  }

  function rate(value, code) {
    const safe = Number.isFinite(value) ? value : 0;
    return `¥${safe.toFixed(rateDecimals(safe))}`;
  }

  function ratePerUnit(value, code) {
    return `1 ${code} ≈ ${rate(value, code)}`;
  }

  function bpsFromMid(value) {
    const mid = RATES.mid[state.currency];
    if (!mid || !Number.isFinite(value)) return "—";
    const bps = (value / mid - 1) * 10000;
    const sign = bps > 0.5 ? "+" : "";
    return `${sign}${bps.toFixed(0)} bp`;
  }

  function inputNumber(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }

  function compactSnapshot() {
    return RATES.asOfLabel.replace(/^\d{4}年/, "");
  }

  function announce(message) {
    if (!dom.liveRegion) return;
    dom.liveRegion.textContent = "";
    window.setTimeout(() => {
      dom.liveRegion.textContent = message;
    }, 30);
  }

  /* ---------------------------------------------------------
     Calculation
     --------------------------------------------------------- */

  function networkCny(networkKey, code) {
    const value = RATES.networks?.[networkKey]?.cny?.[code];
    return Number.isFinite(value) ? value : RATES.mid[code];
  }

  function networkUsd(networkKey, code) {
    if (code === "USD") return 1;
    const value = RATES.networks?.[networkKey]?.usd?.[code];
    return Number.isFinite(value) ? value : RATES.mid[code] / RATES.mid.USD;
  }

  function pathFees(path) {
    const saved = state.paths[path.id] || {};
    const card = CARD_MAP[path.primaryCardId];
    return {
      feePct: clamp(saved.feePct, 0, 5, card.feePct),
      cashbackPct: clamp(saved.cashbackPct, 0, 5, card.cashbackPct)
    };
  }

  function networkRateNote(networkKey, account, code) {
    const network = RATES.networks?.[networkKey];
    if (!Number.isFinite(network?.[account]?.[code])) return "按中间价估算";
    const date = network.pairDates?.[account]?.[code] || "快易理财网查询价";
    return RATES.carriedNetworkRates?.includes(`${networkKey}/${account}/${code}`)
      ? `${date} · 沿用上次有效报价` : date;
  }

  function computePath(path) {
    const card = CARD_MAP[path.primaryCardId];
    return computeCard(card, path, pathFees(path));
  }

  function abcUsdQuote() {
    const override = RATES === LATEST_RATES ? abcQuoteOverride : null;
    return override ?? RATES.banks.abc?.rates?.USD?.sell;
  }

  function unavailableReason(card) {
    const code = state.currency;
    if (card.manualQuote && !abcUsdQuote()) {
      return "所选日期缺少农行美元卖出价";
    }
    if (RATES === LATEST_RATES) return "";
    if (card.rail === "multi" && card.supported.includes(code)) {
      return Number.isFinite(RATES.banks[card.rateSource]?.rates?.[code]?.sell)
        ? "" : "历史快照缺少本行对应币种牌价";
    }
    if (card.rateSource && !Number.isFinite(RATES.banks[card.rateSource]?.rates?.USD?.sell)) {
      return "历史快照缺少本行美元牌价";
    }
    const account = card.rail === "cny-card" ? "cny" : "usd";
    if (account === "usd" && code === "USD") return "";
    return Number.isFinite(RATES.networks?.[card.network]?.[account]?.[code])
      ? "" : "历史快照缺少对应的卡组织汇率";
  }

  function computeCard(card, path, fees) {
    const amount = Math.max(0, Number(state.amount) || 0);
    const code = state.currency;
    const direct = card.rail === "multi" && card.supported?.includes(code);
    const bankCode = direct ? code : "USD";
    const ownBank = RATES.banks[card.rateSource];
    const bank = Number.isFinite(ownBank?.rates?.[bankCode]?.sell) ? ownBank : RATES.banks.boc;
    const networkName = card.networkLabel;
    const quote = card.manualQuote ? abcUsdQuote() : null;

    let base = 0;
    let effectiveNetworkRate = 0;
    let accountAmount = 0;
    let routeTag = "";
    let flow = [];
    let steps = [];
    let rows = [];
    let usedUsd = false;
    let missingMultiCurrency = false;

    if (direct) {
      const bankSell = bank.rates[code].sell;
      const fundingTitle =
        card.funding === "rmb-card"
          ? `用${bank.short}人民币卡购汇转入`
          : `按${bank.short}现汇卖出价购汇`;
      const fundingBody =
        card.funding === "rmb-card"
          ? `先在${bank.short}手机银行用人民币卡购汇，再转入这张外币卡；1 ${code} = ${rate(
              bankSell,
              code
            )}。`
          : `1 ${code} = ${rate(bankSell, code)}。银行点差已经体现在这个价格里。`;

      base = amount * bankSell;
      accountAmount = amount;
      effectiveNetworkRate = 1;
      routeTag = card.directTag || "外币直入";
      flow = [
        `${code} 消费`,
        `${bank.short}外币账户`,
        card.funding === "rmb-card" ? "人民币卡购汇" : "人民币还款"
      ];
      steps = [
        {
          title: `${foreign(amount, code)} 直接进入${bank.short}外币账户`,
          body: "交易币种与账户币种一致，不经过卡组织二次折算。"
        },
        {
          title: fundingTitle,
          body: fundingBody
        }
      ];
      rows = [
        { label: "银行购汇", value: `${foreign(amount, code)} × ${bankSell.toFixed(4)}` },
        { label: "折算后金额", value: cny(base) }
      ];
    } else if (card.rail === "cny-card") {
      const cnyPerUnit = networkCny(card.network, code);
      base = amount * cnyPerUnit;
      accountAmount = base;
      effectiveNetworkRate = cnyPerUnit;
      routeTag = `${networkName}人民币`;
      flow = [`${code} 消费`, `${networkName} 折 CNY`, "人民币账单"];
      steps = [
        {
          title: `${networkName} 把 ${foreign(amount, code)} 折成人民币`,
          body: `按 ${networkName} 卡组织汇率：1 ${code} ≈ ${rate(
            cnyPerUnit,
            code
          )}（${networkRateNote(card.network, "cny", code)}）。`
        },
        {
          title: "人民币直接入账",
          body: "没有银行购汇环节，只需还人民币账单。"
        }
      ];
      rows = [
        { label: "卡组织折算", value: `${foreign(amount, code)} → ${cny(base)}` },
        { label: "折算后金额", value: cny(base) }
      ];
    } else {
      missingMultiCurrency = card.rail === "multi";
      usedUsd = true;
      const usdPerUnit = networkUsd(card.network, code);
      const usdAmount = amount * usdPerUnit;
      const usdSell = quote ?? bank.rates.USD.sell;
      const bankName = card.manualQuote === "usd" ? "农行" : bank.short;
      base = usdAmount * usdSell;
      accountAmount = usdAmount;
      effectiveNetworkRate = usdPerUnit;
      routeTag = quote ? "授权日人民币记账" : missingMultiCurrency ? "经美元" : code === "USD" ? "美元直付" : "折美元后购汇";
      flow = [
        `${code} 消费`,
        code === "USD" ? "美元入账" : `${networkName} 折 USD`,
        card.manualQuote === "usd" ? "农行折人民币" : `${bankName}购汇`
      ];
      steps = [
        code === "USD"
          ? {
              title: "美元消费，无需卡组织折算",
              body: quote ? "美元交易金额直接交由农行折算。" : "交易币种已经是美元账户币种。"
            }
          : {
              title: `${networkName} 把 ${foreign(amount, code)} 折成美元`,
              body: `按 ${networkName} 卡组织汇率：1 ${code} ≈ ${usdPerUnit.toFixed(
                rateDecimals(usdPerUnit)
              )} USD（${networkRateNote(card.network, "usd", code)}）。`
            },
        {
          title: card.manualQuote === "usd" ? "农行按授权日美元卖出牌价折人民币" : `按${bankName}美元现汇卖出价购汇`,
          body: `1 USD = ${rate(usdSell, "USD")}，美元金额 ${foreign(usdAmount, "USD")}。${
            quote ? (RATES === LATEST_RATES && abcQuoteOverride
              ? " 使用你填写的农行卖出价。"
              : ` 农行报价时间 ${ownBank.updated}。`) : ""
          }`
        }
      ];
      rows = [
        code === "USD"
          ? { label: "卡组织折算", value: "美元消费，无折算" }
          : {
              label: "卡组织折算",
              value: `${foreign(amount, code)} → ${foreign(usdAmount, "USD")}`
            },
        { label: "银行购汇", value: `${foreign(usdAmount, "USD")} × ${usdSell.toFixed(4)}` },
        { label: "折算后金额", value: cny(base) }
      ];
    }

    const fee = base * (fees.feePct / 100);
    const gross = base + fee;
    const cashback = gross * (fees.cashbackPct / 100);
    const total = gross - cashback;
    const effectiveRate = amount > 0 ? total / amount : 0;

    if (fees.feePct > 0) {
      rows.push({
        label: `货币转换费 ${fees.feePct.toFixed(2)}%`,
        value: `+${cny(fee)}`,
        tone: "fee"
      });
      steps.push({
        title: `加收 ${fees.feePct.toFixed(2)}% 货币转换费`,
        body: `按折算后金额加收，约 ${cny(fee)}。`
      });
    }

    if (fees.cashbackPct > 0) {
      rows.push({
        label: `返现 / 积分折现 ${fees.cashbackPct.toFixed(2)}%`,
        value: `−${cny(cashback)}`,
        tone: "cashback"
      });
      steps.push({
        title: `返现抵扣 ${cny(cashback)}`,
        body: `按 ${fees.cashbackPct.toFixed(2)}% 估算，实际以银行到账为准。`
      });
    }

    let verdict = card.caveat ? `${card.pros}。${card.caveat}。` : card.pros;
    if (missingMultiCurrency) {
      verdict = "该币种不在多币种账户内，实际走美元中转，“直付”的路径优势不成立。";
    } else if (card.rail === "foreign-usd" && !card.manualQuote) {
      if (code === "USD") {
        verdict =
          fees.feePct > 0
            ? `美元消费没有卡组织折算，但 ${fees.feePct.toFixed(2)}% 货转费仍会加在账单上。`
            : "美元消费没有卡组织折算，只需按银行美元现汇卖出价购汇。";
      } else {
        verdict = `${card.pros}；但 ${code} 不是美元，卡组织和银行会各折算一次，成本通常更高。`;
      }
    } else if (card.rail === "cny-card" && card.caveat) {
      verdict = `${card.pros}。最终汇率由卡组织入账日决定。`;
    }

    if (card.rateSource && bank !== ownBank && !quote) {
      verdict += `快照缺少${ownBank?.short || "发卡行"} ${bankCode} 牌价，本路径用${bank.short}牌价估算。`;
    }
    const networkAccount = usedUsd && code !== "USD" ? "usd" : card.rail === "cny-card" && !quote ? "cny" : null;
    if (networkAccount && !Number.isFinite(RATES.networks?.[card.network]?.[networkAccount]?.[code])) {
      verdict += "快照缺少该币种对的卡组织汇率，本路径用中间价估算。";
    }

    return {
      path,
      card,
      total,
      base,
      fee,
      cashback,
      effectiveRate,
      accountAmount,
      effectiveNetworkRate,
      routeTag,
      flow,
      steps,
      rows,
      verdict,
      usedUsd,
      missingMultiCurrency,
      fees
    };
  }

  function computeAll() {
    return PATHS.filter((path) => !unavailableReason(CARD_MAP[path.primaryCardId]))
      .map(computePath)
      .sort((a, b) => a.total - b.total);
  }

  /* ---------------------------------------------------------
     Render: controls
     --------------------------------------------------------- */

  function renderCurrencyChips() {
    dom.currencyChips.innerHTML = CURRENCIES.map(
      (currency) => `
        <button
          class="currency-chip"
          type="button"
          data-currency="${currency.code}"
          aria-pressed="${currency.code === state.currency}"
          aria-label="${currency.name} ${currency.code}"
        >
          <span>${currency.name}</span>
          <strong>${currency.code}</strong>
        </button>`
    ).join("");
  }

  function updateCurrencyUI() {
    const meta = CURRENCY_MAP[state.currency];
    dom.amountPrefix.textContent = meta.symbol;
    dom.amountInput.setAttribute("aria-label", `消费金额（${meta.name}）`);
    $$(".currency-chip", dom.currencyChips).forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.currency === state.currency));
    });
  }

  function renderPathParams() {
    dom.pathParams.innerHTML = PATHS.map((path) => {
      const saved = state.paths[path.id];
      return `
        <div class="param-row">
          <div class="param-name">
            <strong>${path.name}</strong>
            <small>代表：${path.representativeLabel}</small>
          </div>
          <label class="param-input">
            <span>货转</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value="${saved.feePct}"
              data-path-id="${path.id}"
              data-field="feePct"
              aria-label="${path.name}货币转换费，百分比"
            />%
          </label>
          <label class="param-input">
            <span>返现</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value="${saved.cashbackPct}"
              data-path-id="${path.id}"
              data-field="cashbackPct"
              aria-label="${path.name}返现或积分折现，百分比"
            />%
          </label>
        </div>`;
    }).join("");
  }

  function renderPathTypes() {
    dom.pathTypes.innerHTML = PATHS.map(
      (path) => `
        <article class="type-card">
          <div class="type-top">
            <span class="type-index">${path.index}</span>
            <span class="type-icon">${path.mark}</span>
          </div>
          <h3>${path.titleHtml}</h3>
          <p class="type-route">${path.typeRoute}</p>
          <p class="type-copy">${path.typeCopy}</p>
          <div class="type-bottom">
            <span class="type-card-tag">${path.representativeLabel}</span>
            <span class="type-note">${path.source ? `<a href="${path.source}" target="_blank" rel="noopener noreferrer">${path.typeNote}</a>` : path.typeNote}</span>
          </div>
        </article>`
    ).join("");
  }

  function syncAssumptionControls() {
    $$("input[data-path-id]", dom.pathParams).forEach((input) => {
      const pathState = state.paths[input.dataset.pathId];
      if (pathState) input.value = pathState[input.dataset.field];
    });
  }

  /* ---------------------------------------------------------
     Render: results
     --------------------------------------------------------- */

  function renderFactRows() {
    const code = state.currency;
    const mid = RATES.mid[code];
    const bankRows = BANK_ORDER.map((key) => {
      const bank = RATES.banks[key];
      const sell = bank?.rates?.[code]?.sell;
      if (!Number.isFinite(sell)) return "";
      return `
        <div class="fact-row">
          <span>${bank.short}现汇卖出</span>
          <strong>${rate(sell, code)} <small>${bpsFromMid(sell)}</small></strong>
        </div>`;
    }).join("");

    dom.factRows.innerHTML = `
      <div class="fact-row">
        <span>1 ${code} 中间价</span>
        <strong>${rate(mid, code)}</strong>
      </div>
      ${bankRows}`;
    const carried = [
      RATES.banks.boc?.carriedFrom && `中行沿用 ${RATES.banks.boc.carriedFrom} 快照的牌价。`,
      RATES.carriedNetworkRates?.length && `${RATES.carriedNetworkRates.length} 个卡组织币种对沿用上次有效报价。`
    ].filter(Boolean).join(" ");
    const note = RATES.archiveNote ||
      `牌价快照 ${RATES.asOfLabel}。卡组织汇率来自快易理财网；缺失牌价时，替用来源会标在路径详情中。`;
    dom.factNote.textContent = carried ? `${note} ${carried}` : note;
  }

  function renderFocusCard(focus, winner, results) {
    if (!focus || !winner) return;
    const hasAmount = state.amount > 0;
    const path = focus.path;
    const isBest = focus.path.id === winner.path.id;
    const mostExpensive = results[results.length - 1];
    const saving = Math.max(0, mostExpensive.total - winner.total);
    const extra = Math.max(0, focus.total - winner.total);
    let note = "输入金额后开始计算";

    if (hasAmount) {
      if (isBest) {
        note = saving >= 0.01 ? `比最贵路径省 ${cny(saving)}` : "各路径几乎持平";
      } else {
        note = extra >= 0.005 ? `比最优路径多 ${cny(extra)}` : "与最优几乎持平";
      }
    }

    dom.winnerCard.setAttribute(
      "aria-label",
      isBest ? "当前最优路径" : "当前查看的支付路径"
    );
    dom.winnerContent.innerHTML = `
      <div class="winner-top">
        <span class="best-badge${isBest ? "" : " is-viewing"}">${
          isBest ? "当前最优路径" : "当前查看"
        }</span>
        <span class="winner-art art-${path.art}">${path.mark}</span>
      </div>
      <div class="winner-main">
        <h3>${path.shortName}</h3>
        <p class="winner-type">代表卡：${path.representativeLabel}</p>
        <div class="winner-price">
          <span class="winner-price-label">预计人民币入账</span>
          <strong class="winner-total">${hasAmount ? cny(focus.total) : "—"}</strong>
          <span class="winner-saving">
            <strong>${note}</strong>
            ${
              isBest
                ? ""
                : '<button class="focus-best-link" type="button" data-best-link>回到最优</button>'
            }
          </span>
        </div>
        <p class="winner-verdict">${focus.verdict}</p>
      </div>
      <div class="winner-footer">
        <div class="winner-rate">
          <span>预计有效折算率</span>
          <strong>${hasAmount ? ratePerUnit(focus.effectiveRate, state.currency) : "—"}</strong>
        </div>
        <div class="winner-flow">
          ${focus.flow
            .map(
              (item, index) =>
                `${index > 0 ? "<i>→</i>" : ""}<span>${item}</span>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function deltaText(result, winner, isBest) {
    if (state.amount <= 0) return "—";
    if (isBest) return "最优";
    const diff = result.total - winner.total;
    if (Math.abs(diff) < 0.005) return "并列最优";
    const pct = winner.total > 0 ? (diff / winner.total) * 100 : 0;
    return `+${cny(diff)} · +${pct.toFixed(2)}%`;
  }

  function renderRanking(winner, results) {
    dom.rankingList.innerHTML = results
      .map((result, index) => {
        const isBest = result === winner;
        const isTie = !isBest && Math.abs(result.total - winner.total) < 0.005;
        const isSelected = selectedPathId
          ? result.path.id === selectedPathId
          : result.path.id === winner.path.id;
        return `
          <button
            class="rank-row${isBest ? " is-best" : ""}${isTie ? " is-tie" : ""}"
            type="button"
            data-path-id="${result.path.id}"
            aria-expanded="${isSelected}"
            aria-controls="routeCard"
            aria-label="查看 ${result.path.name}，预计入账 ${cny(result.total)}"
          >
            <span class="rank-num">${String(index + 1).padStart(2, "0")}</span>
            <span class="rank-swatch art-${result.path.art}">${result.path.mark}</span>
            <span class="rank-main">
              <strong>${result.path.name}</strong>
              <small>代表：${result.path.representativeLabel}</small>
            </span>
            <span class="rank-money">
              <span class="rank-total">${state.amount > 0 ? cny(result.total) : "—"}</span>
              <span class="rank-delta">${deltaText(result, winner, isBest)}</span>
            </span>
          </button>`;
      })
      .join("");
  }

  function renderRoute(detail) {
    if (!detail) return;
    const hasAmount = state.amount > 0;
    dom.routeTitle.textContent = hasAmount
      ? `${detail.path.name} · ${foreign(state.amount, state.currency)}`
      : detail.path.name;
    dom.routeTag.textContent = detail.routeTag;
    dom.routeReps.textContent = `代表卡：${detail.path.representativeLabel}`;

    dom.routeSteps.innerHTML = detail.steps
      .map(
        (step, index) => `
          <li data-step="${String(index + 1).padStart(2, "0")}">
            <strong>${step.title}</strong>
            <p>${step.body}</p>
          </li>`
      )
      .join("");

    dom.routeVerdict.innerHTML = `
      <span>这条路径</span>
      <p>${detail.verdict}</p>`;

    const rows = detail.rows.filter(
      (row) => !(row.label === "折算后金额" && detail.fee === 0 && detail.cashback === 0)
    );
    if (hasAmount) {
      rows.push({
        label: "预计人民币入账",
        value: cny(detail.total),
        total: true
      });
    }

    dom.costList.innerHTML = rows
      .map(
        (row) => `
          <div class="cost-row${row.total ? " cost-row--total" : ""}">
            <span>${row.label}</span>
            <strong>${row.value}</strong>
          </div>`
      )
      .join("");
  }

  function renderRateTable() {
    const code = state.currency;
    const mid = RATES.mid[code];

    const bankRows = BANK_ORDER.map((key) => {
      const bank = RATES.banks[key];
      const sell = bank?.rates?.[code]?.sell;
      if (!Number.isFinite(sell)) return null;
      return [`${bank.short}现汇卖出`, sell, bpsFromMid(sell)];
    }).filter(Boolean);

    const networkRows = [
      ["Visa", "visa"],
      ["万事达", "mastercard"],
      ["银联", "unionpay"]
    ]
      .map(([label, key]) => {
        const value = RATES.networks?.[key]?.cny?.[code];
        if (!Number.isFinite(value)) return null;
        return [
          `${label} 卡组织（${networkRateNote(key, "cny", code)}）`,
          value,
          bpsFromMid(value)
        ];
      })
      .filter(Boolean);

    dom.rateTableTitle.textContent = `当前币种牌价 · 1 ${code}`;
    const rows = [
      ["中间价（基准）", mid, "基准"],
      ...bankRows,
      ...networkRows
    ];

    dom.rateTableBody.innerHTML = rows
      .map(
        ([label, value, bp]) => `
          <tr>
            <td>${label}</td>
            <td>${rate(value, code)}</td>
            <td class="bp">${bp}</td>
          </tr>`
      )
      .join("");
  }

  function updateSelectionUI() {
    if (!currentWinner) return;
    const activeId = selectedPathId || currentWinner.path.id;
    $$("[data-path-id]", dom.rankingList).forEach((button) => {
      button.setAttribute("aria-expanded", String(button.dataset.pathId === activeId));
    });
  }

  function renderResults(options = {}) {
    currentResults = computeAll();
    currentWinner = currentResults[0];

    if (!currentResults.some((result) => result.path.id === selectedPathId)) selectedPathId = null;
    const active =
      currentResults.find((result) => result.path.id === selectedPathId) || currentWinner;

    renderFactRows();
    $("#routeCard").hidden = !active;
    if (active) {
      renderFocusCard(active, currentWinner, currentResults);
      renderRoute(active);
    } else {
      dom.winnerCard.setAttribute("aria-label", "暂无比较结果");
      dom.winnerContent.textContent = "这份快照缺少计算该币种所需的牌价。";
    }
    renderRanking(currentWinner, currentResults);
    renderRateTable();
    dom.rankingTitle.textContent = `${currentResults.length} 条可比较路径`;
    dom.unavailablePaths.textContent = PATHS.map((path) => {
      const reason = unavailableReason(CARD_MAP[path.primaryCardId]);
      return reason ? `${path.name}（${reason}）` : "";
    }).filter(Boolean).join("；");

    if (options.announce && active) {
      if (selectedPathId && active.path.id !== currentWinner.path.id) {
        announce(
          `当前查看 ${active.path.name}，预计入账 ${cny(
            active.total
          )}；最优仍是 ${currentWinner.path.name}。`
        );
      } else {
        announce(
          `当前最优路径是 ${currentWinner.path.name}，代表卡 ${currentWinner.path.representativeLabel}，预计入账 ${cny(
            currentWinner.total
          )}。共比较 ${currentResults.length} 条支付路径。`
        );
      }
    }
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */

  function parseAmount(raw) {
    const value = raw.normalize("NFKC").trim();
    if (!value) return 0;
    if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) return null;
    return Math.min(1000000000, Number(value.replace(/,/g, "")));
  }

  function setAmount(value, announceChange = false) {
    state.amount = Math.min(1000000000, Math.max(0, Number(value) || 0));
    saveState();
    renderResults({ announce: announceChange });
  }

  function bindEvents() {
    dom.snapshotDate.addEventListener("change", changeSnapshot);
    dom.abcQuote.addEventListener("input", () => {
      abcQuoteOverride = readManualQuote(dom.abcQuote);
      renderResults();
    });
    dom.amountInput.addEventListener("input", (event) => {
      const amount = parseAmount(event.target.value);
      event.target.setAttribute("aria-invalid", String(amount === null));
      if (amount !== null) setAmount(amount);
    });

    dom.amountInput.addEventListener("blur", () => {
      dom.amountInput.value = state.amount > 0 ? inputNumber(state.amount) : "";
      dom.amountInput.removeAttribute("aria-invalid");
    });

    dom.amountInput.addEventListener("focus", () => {
      if (state.amount === 0) dom.amountInput.value = "";
    });

    $$(".preset").forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number(button.dataset.amount);
        state.amount = value;
        dom.amountInput.value = inputNumber(value);
        saveState();
        renderResults({ announce: true });
      });
    });

    dom.currencyChips.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-currency]");
      if (!chip) return;
      const code = chip.dataset.currency;
      if (!CURRENCY_MAP[code] || code === state.currency) return;
      state.currency = code;
      updateCurrencyUI();
      saveState();
      renderResults({ announce: true });
    });

    dom.rankingList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-path-id]");
      if (!button) return;
      selectedPathId = button.dataset.pathId;
      updateSelectionUI();
      const detail = currentResults.find((result) => result.path.id === selectedPathId);
      if (detail) {
        renderFocusCard(detail, currentWinner, currentResults);
        renderRoute(detail);
        announce(`已切换到 ${detail.path.name}，预计入账 ${cny(detail.total)}。`);

        if (window.matchMedia("(max-width: 900px)").matches) {
          dom.winnerCard.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "center"
          });
        }
      }
    });

    dom.winnerContent.addEventListener("click", (event) => {
      if (!event.target.closest("[data-best-link]")) return;
      selectedPathId = null;
      renderResults({ announce: true });
    });

    dom.openAssumptions.addEventListener("click", () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startY = window.scrollY;
      dom.assumptions.open = true;
      dom.assumptions.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center"
      });

      if (!reduceMotion) {
        window.setTimeout(() => {
          if (Math.abs(window.scrollY - startY) < 8) {
            dom.assumptions.scrollIntoView({ behavior: "auto", block: "center" });
          }
        }, 650);
      }
    });

    dom.pathParams.addEventListener("input", (event) => {
      const input = event.target.closest("input[data-path-id]");
      if (!input) return;
      const id = input.dataset.pathId;
      const field = input.dataset.field;
      if (!state.paths[id] || !["feePct", "cashbackPct"].includes(field)) return;
      const value = clamp(input.value, 0, 5, state.paths[id][field]);
      state.paths[id][field] = value;
      saveState();
      renderResults();
    });

    dom.pathParams.addEventListener("blur", (event) => {
      const input = event.target.closest("input[data-path-id]");
      if (!input) return;
      const id = input.dataset.pathId;
      const field = input.dataset.field;
      if (!state.paths[id]) return;
      input.value = state.paths[id][field];
    }, true);

    dom.resetBtn.addEventListener("click", () => {
      state = freshState();
      abcQuoteOverride = null;
      dom.abcQuote.value = "";
      selectedPathId = null;
      saveState();
      dom.amountInput.value = inputNumber(state.amount);
      renderCurrencyChips();
      updateCurrencyUI();
      syncAssumptionControls();
      renderResults({ announce: true });
      announce("已恢复默认假设。");
    });
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  function readManualQuote(input) {
    const value = input.valueAsNumber;
    return Number.isFinite(value) && value > 0 && value <= 1000 ? value : null;
  }

  function snapshotDay(snapshot) {
    return snapshot.date || new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" })
      .format(new Date(snapshot.fetchedAt));
  }

  function loadHistoricalSnapshot(date) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `assets/history/${date}.js`;
      script.onload = () => {
        const snapshot = window.FX_HISTORICAL_RATES;
        delete window.FX_HISTORICAL_RATES;
        script.remove();
        if (snapshot && snapshotDay(snapshot) === date) resolve(snapshot);
        else reject(new Error("Invalid historical snapshot"));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Historical snapshot unavailable"));
      };
      document.head.append(script);
    });
  }

  async function changeSnapshot() {
    const date = dom.snapshotDate.value;
    dom.snapshotDate.disabled = true;
    try {
      RATES = date && historyDates.includes(date) ? await loadHistoricalSnapshot(date) : LATEST_RATES;
      selectedPathId = null;
      updateSnapshotUI();
      renderResults({ announce: true });
    } catch {
      dom.snapshotDate.value = RATES === LATEST_RATES ? "" : snapshotDay(RATES);
      dom.snapshotStatus.textContent = `该日期加载失败。仍使用 ${RATES.asOfLabel} 的快照。`;
    } finally {
      dom.snapshotDate.disabled = false;
    }
  }

  function updateSnapshotUI() {
    const latest = RATES === LATEST_RATES;
    dom.snapshotStatus.textContent = `${latest ? "最新可用快照" : "历史快照"} · ${RATES.asOfLabel}（北京时间）`;
    dom.manualQuotes.hidden = !latest;
    $$(".js-snapshot").forEach((element) => {
      element.textContent = `${latest ? "牌价快照" : "历史快照"} · ${compactSnapshot()}`;
    });

    const networkUpdated = ["visa", "mastercard", "unionpay"]
      .map((key) => {
        const network = RATES.networks?.[key];
        if (!network) return "";
        return `${network.label} ${network.updated.slice(5).replace("-", "/")}`;
      })
      .filter(Boolean)
      .join(" · ");
    $$(".js-network-updated").forEach((element) => {
      element.textContent = networkUpdated || "—";
    });
  }

  function init() {
    const latestDay = snapshotDay(LATEST_RATES);
    for (const date of historyDates) {
      if (date < latestDay) dom.snapshotDate.add(new Option(date, date));
    }
    updateSnapshotUI();
    dom.amountInput.value = inputNumber(state.amount);
    renderCurrencyChips();
    updateCurrencyUI();
    renderPathParams();
    renderPathTypes();
    bindEvents();
    renderResults();

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();




