(function () {
  "use strict";

  const RATES = window.FX_RATES;
  const CARDS = window.FX_CARDS;
  const PATHS = window.FX_PATHS;
  const CURRENCIES = window.FX_CURRENCIES;
  const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));
  const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));
  const PATH_MAP = Object.fromEntries(PATHS.map((p) => [p.id, p]));
  const STORAGE_KEY = "zeka-state-v2";
  const NETWORK_LABELS = {
    mastercard: { name: "万事达", en: "Mastercard" },
    visa: { name: "Visa", en: "Visa" },
    unionpay: { name: "银联", en: "UnionPay" }
  };
  const BANK_ORDER = ["boc", "icbc", "cmb", "bocom"];

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
      networkBps: { ...RATES.networkBps },
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
    networkControls: $("#networkControls"),
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
    next.amount = clamp(saved.amount, 0, 1000000000, next.amount);
    if (saved.currency && CURRENCY_MAP[saved.currency]) {
      next.currency = saved.currency;
    }

    if (saved.networkBps && typeof saved.networkBps === "object") {
      Object.keys(next.networkBps).forEach((key) => {
        next.networkBps[key] = clamp(saved.networkBps[key], 0, 100, next.networkBps[key]);
      });
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

  function networkBps(card) {
    return clamp(state.networkBps[card.network], 0, 100, 0);
  }

  function pathFees(path) {
    const saved = state.paths[path.id] || {};
    const card = CARD_MAP[path.primaryCardId];
    return {
      feePct: clamp(saved.feePct, 0, 5, card.feePct),
      cashbackPct: clamp(saved.cashbackPct, 0, 5, card.cashbackPct)
    };
  }

  function bankRate(card, code, field = "sell") {
    const own = RATES.banks[card.rateSource]?.rates?.[code]?.[field];
    if (Number.isFinite(own)) return own;
    return RATES.banks.boc.rates[code][field];
  }

  function computePath(path) {
    const card = CARD_MAP[path.primaryCardId];
    return computeCard(card, path, pathFees(path));
  }

  function computeCard(card, path, fees) {
    const amount = Math.max(0, Number(state.amount) || 0);
    const code = state.currency;
    const mid = RATES.mid[code];
    const usdMid = RATES.mid.USD;
    const spread = networkBps(card) / 10000;
    const bank = RATES.banks[card.rateSource] || RATES.banks.boc;
    const networkName = card.networkLabel;

    let base = 0;
    let effectiveNetworkRate = 0;
    let accountAmount = 0;
    let routeTag = "";
    let flow = [];
    let steps = [];
    let rows = [];
    let usedUsd = false;
    let missingMultiCurrency = false;

    if (card.rail === "multi" && Array.isArray(card.supported) && card.supported.includes(code)) {
      const bankSell = bankRate(card, code, "sell");
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
    } else if (card.rail === "multi") {
      missingMultiCurrency = true;
      usedUsd = true;
      const usdPerUnit = code === "USD" ? 1 : (mid / usdMid) * (1 + spread);
      const usdAmount = amount * usdPerUnit;
      const usdSell = bankRate(card, "USD", "sell");
      base = usdAmount * usdSell;
      accountAmount = usdAmount;
      effectiveNetworkRate = usdPerUnit;
      routeTag = "经美元";
      flow = [
        `${code} 消费`,
        code === "USD" ? "美元入账" : `${networkName} 折 USD`,
        `${bank.short}购汇`
      ];
      steps = [
        code === "USD"
          ? {
              title: "美元消费，无需卡组织折算",
              body: "交易币种已经是美元账户币种。"
            }
          : {
              title: `${networkName} 把 ${foreign(amount, code)} 折成美元`,
              body: `该币种不在多币种账户内。估算 1 ${code} ≈ ${usdPerUnit.toFixed(
                rateDecimals(usdPerUnit)
              )} USD（中间价 + ${networkBps(card)}bp）。`
            },
        {
          title: `按${bank.short}美元现汇卖出价购汇`,
          body: `1 USD = ${rate(usdSell, "USD")}；美元金额 ${foreign(usdAmount, "USD")}。`
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
    } else if (card.rail === "cny-card") {
      const cnyPerUnit = mid * (1 + spread);
      base = amount * cnyPerUnit;
      accountAmount = base;
      effectiveNetworkRate = cnyPerUnit;
      routeTag = `${networkName}人民币`;
      flow = [`${code} 消费`, `${networkName} 折 CNY`, "人民币账单"];
      steps = [
        {
          title: `${networkName} 把 ${foreign(amount, code)} 折成人民币`,
          body: `估算 1 ${code} ≈ ${rate(cnyPerUnit, code)}（中间价 + ${networkBps(card)}bp）。`
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
      usedUsd = true;
      const usdPerUnit = code === "USD" ? 1 : (mid / usdMid) * (1 + spread);
      const usdAmount = amount * usdPerUnit;
      const usdSell = bankRate(card, "USD", "sell");
      base = usdAmount * usdSell;
      accountAmount = usdAmount;
      effectiveNetworkRate = usdPerUnit;
      routeTag = code === "USD" ? "美元直付" : "折美元后购汇";
      flow = [
        `${code} 消费`,
        code === "USD" ? "美元入账" : `${networkName} 折 USD`,
        `${bank.short}购汇`
      ];
      steps = [
        code === "USD"
          ? {
              title: "美元消费，无需卡组织折算",
              body: "交易币种已经是美元账户币种。"
            }
          : {
              title: `${networkName} 把 ${foreign(amount, code)} 折成美元`,
              body: `估算 1 ${code} ≈ ${usdPerUnit.toFixed(
                rateDecimals(usdPerUnit)
              )} USD（中间价 + ${networkBps(card)}bp）。`
            },
        {
          title: `按${bank.short}美元现汇卖出价购汇`,
          body: `1 USD = ${rate(usdSell, "USD")}；美元金额 ${foreign(usdAmount, "USD")}。`
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

    let verdict = `${card.pros}。${card.caveat}。`;
    if (missingMultiCurrency) {
      verdict = "该币种不在多币种账户内，实际走美元中转，“直付”的路径优势不成立。";
    } else if (card.rail === "foreign-usd") {
      if (code === "USD") {
        verdict =
          fees.feePct > 0
            ? `美元消费没有卡组织折算，但 ${fees.feePct.toFixed(2)}% 货转费仍会加在账单上。`
            : "美元消费没有卡组织折算，只需按银行美元现汇卖出价购汇。";
      } else {
        verdict = `${card.pros}；但 ${code} 不是美元，卡组织和银行会各折算一次，成本通常更高。`;
      }
    } else if (card.rail === "cny-card") {
      verdict = `${card.pros}。最终汇率由卡组织入账日决定。`;
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
    const results = PATHS.map(computePath);
    results.sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      return PATHS.findIndex((p) => p.id === a.path.id) - PATHS.findIndex((p) => p.id === b.path.id);
    });
    return results;
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

  function renderNetworkControls() {
    dom.networkControls.innerHTML = Object.keys(NETWORK_LABELS)
      .map((key) => {
        const label = NETWORK_LABELS[key];
        const value = state.networkBps[key];
        return `
          <div class="slider-row">
            <span class="slider-row-label">
              <strong>${label.name}</strong>
              <small>${label.en}</small>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value="${value}"
              data-network="${key}"
              aria-label="${label.name}汇率加点（基点）"
            />
            <output>${value} bp</output>
          </div>`;
      })
      .join("");
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
            <span class="type-note">${path.typeNote}</span>
          </div>
        </article>`
    ).join("");
  }

  function syncAssumptionControls() {
    $$("[data-network]", dom.networkControls).forEach((input) => {
      const key = input.dataset.network;
      input.value = state.networkBps[key];
      const output = input.parentElement.querySelector("output");
      if (output) output.textContent = `${state.networkBps[key]} bp`;
    });

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
    dom.factNote.innerHTML = `牌价快照 ${RATES.asOfLabel}。卡组织汇率按中间价加点估算，可在下方“汇率与费用假设”中调整。`;
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
          <span>实际折算率</span>
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
    const mc = mid * (1 + state.networkBps.mastercard / 10000);
    const visa = mid * (1 + state.networkBps.visa / 10000);
    const up = mid * (1 + state.networkBps.unionpay / 10000);

    const bankRows = BANK_ORDER.map((key) => {
      const bank = RATES.banks[key];
      const sell = bank?.rates?.[code]?.sell;
      if (!Number.isFinite(sell)) return null;
      return [`${bank.short}现汇卖出`, sell, bpsFromMid(sell)];
    }).filter(Boolean);

    dom.rateTableTitle.textContent = `当前币种牌价 · 1 ${code}`;
    const rows = [
      ["中间价（基准）", mid, "基准"],
      ...bankRows,
      ["万事达人民币入账（估算）", mc, bpsFromMid(mc)],
      ["Visa 人民币入账（估算）", visa, bpsFromMid(visa)],
      ["银联人民币入账（估算）", up, bpsFromMid(up)]
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

    if (selectedPathId && !PATH_MAP[selectedPathId]) selectedPathId = null;
    const active =
      currentResults.find((result) => result.path.id === selectedPathId) || currentWinner;

    renderFactRows();
    renderFocusCard(active, currentWinner, currentResults);
    renderRanking(currentWinner, currentResults);
    renderRoute(active);
    renderRateTable();

    if (options.announce) {
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
    const cleaned = String(raw).replace(/,/g, "").replace(/[^\d.]/g, "");
    const parsed = Number.parseFloat(cleaned);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(1000000000, Math.max(0, parsed));
  }

  function setAmount(value, announceChange = false) {
    state.amount = Math.min(1000000000, Math.max(0, Number(value) || 0));
    saveState();
    renderResults({ announce: announceChange });
  }

  function bindEvents() {
    dom.amountInput.addEventListener("input", (event) => {
      setAmount(parseAmount(event.target.value));
    });

    dom.amountInput.addEventListener("blur", () => {
      dom.amountInput.value = state.amount > 0 ? inputNumber(state.amount) : "";
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

    dom.networkControls.addEventListener("input", (event) => {
      const input = event.target.closest("[data-network]");
      if (!input) return;
      const key = input.dataset.network;
      const value = clamp(input.value, 0, 100, state.networkBps[key]);
      state.networkBps[key] = value;
      const output = input.parentElement.querySelector("output");
      if (output) output.textContent = `${value} bp`;
      saveState();
      renderResults();
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

  function init() {
    if (!RATES || !CARDS || !PATHS || !CURRENCIES) {
      console.error("汇率数据未加载。");
      return;
    }

    $$(".js-snapshot").forEach((element) => {
      element.textContent = `牌价快照 · ${compactSnapshot()}`;
    });

    dom.amountInput.value = inputNumber(state.amount);
    renderCurrencyChips();
    updateCurrencyUI();
    renderNetworkControls();
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




