/*
 * 牌价快照。由 scripts/fetch-rates.mjs 生成。
 * 银行牌价单位：人民币 / 1 外币。
 * 中间价单位：人民币 / 1 外币。
 */
window.FX_RATES = {
  "fetchedAt": "2026-11-04T03:48:50.714Z",
  "asOfLabel": "2026年11月4日 11:48",
  "sources": [
    {
      "name": "中国银行外汇牌价",
      "url": "https://www.boc.cn/sourcedb/whpj/"
    },
    {
      "name": "工商银行人民币即期外汇牌价",
      "url": "https://www.icbc.com.cn/column/1438058341489590354.html"
    },
    {
      "name": "招商银行外汇实时汇率",
      "url": "https://fx.cmbchina.com/hq/"
    },
    {
      "name": "交通银行外汇牌价",
      "url": "https://www.bankcomm.com/BankCommSite/shtml/jyjr/cn/7158/list.shtml?channelId=7158"
    },
    {
      "name": "ExchangeRate-API 中间价",
      "url": "https://www.exchangerate-api.com/"
    }
  ],
  "mid": {
    "USD": 6.68400051,
    "EUR": 7.4711055,
    "GBP": 8.9561596,
    "JPY": 0.04216542,
    "HKD": 0.85191357,
    "SGD": 5.218553,
    "AUD": 4.6536303,
    "CAD": 4.77256349,
    "CHF": 8.13855069,
    "KRW": 0.004961,
    "THB": 0.19797468,
    "MYR": 1.64329896,
    "NZD": 3.72975675,
    "MOP": 0.8271066
  },
  "banks": {
    "boc": {
      "label": "中国银行",
      "short": "中行",
      "updated": "11:45",
      "rates": {
        "AUD": {
          "buy": 4.6401,
          "sell": 4.677
        },
        "CAD": {
          "buy": 4.7714,
          "sell": 4.8088
        },
        "CHF": {
          "buy": 8.1793,
          "sell": 8.2425
        },
        "EUR": {
          "buy": 7.4957,
          "sell": 7.5506
        },
        "GBP": {
          "buy": 8.971,
          "sell": 9.0376
        },
        "HKD": {
          "buy": 0.8503,
          "sell": 0.8537
        },
        "JPY": {
          "buy": 0.042247,
          "sell": 0.042573
        },
        "KRW": {
          "buy": 0.004957,
          "sell": 0.005061
        },
        "MOP": {
          "buy": 0.8254,
          "sell": 0.8292
        },
        "MYR": {
          "buy": 1.6354,
          "sell": 1.6501
        },
        "NZD": {
          "buy": 3.7287,
          "sell": 3.7568
        },
        "SGD": {
          "buy": 5.206,
          "sell": 5.2452
        },
        "THB": {
          "buy": 0.1975,
          "sell": 0.1991
        },
        "USD": {
          "buy": 6.6723,
          "sell": 6.7004
        }
      }
    },
    "icbc": {
      "label": "中国工商银行",
      "short": "工行",
      "updated": "11:47",
      "rates": {
        "GBP": {
          "buy": 8.9558,
          "sell": 9.0386
        },
        "HKD": {
          "buy": 0.8497,
          "sell": 0.854
        },
        "USD": {
          "buy": 6.6649,
          "sell": 6.6996
        },
        "CHF": {
          "buy": 8.1673,
          "sell": 8.2428
        },
        "SGD": {
          "buy": 5.1983,
          "sell": 5.2463
        },
        "JPY": {
          "buy": 0.042195,
          "sell": 0.042585
        },
        "CAD": {
          "buy": 4.7629,
          "sell": 4.8069
        },
        "AUD": {
          "buy": 4.6292,
          "sell": 4.672
        },
        "MYR": {
          "buy": 1.6327,
          "sell": 1.6478
        },
        "EUR": {
          "buy": 7.4828,
          "sell": 7.552
        },
        "MOP": {
          "buy": 0.8241,
          "sell": 0.8296
        },
        "THB": {
          "buy": 0.1972,
          "sell": 0.199
        },
        "NZD": {
          "buy": 3.7205,
          "sell": 3.7549
        },
        "KRW": {
          "buy": 0.004946,
          "sell": 0.005044
        }
      }
    },
    "cmb": {
      "label": "招商银行",
      "short": "招行",
      "updated": "11:48",
      "rates": {
        "HKD": {
          "buy": 0.85033,
          "sell": 0.85373
        },
        "NZD": {
          "buy": 3.72485,
          "sell": 3.75477
        },
        "AUD": {
          "buy": 4.63426,
          "sell": 4.67148
        },
        "USD": {
          "buy": 6.67183,
          "sell": 6.70091
        },
        "EUR": {
          "buy": 7.49164,
          "sell": 7.55182
        },
        "CAD": {
          "buy": 4.76827,
          "sell": 4.80657
        },
        "GBP": {
          "buy": 8.96627,
          "sell": 9.03829
        },
        "JPY": {
          "buy": 0.0422428,
          "sell": 0.042582
        },
        "SGD": {
          "buy": 5.20399,
          "sell": 5.24579
        },
        "CHF": {
          "buy": 8.17669,
          "sell": 8.24237
        }
      }
    },
    "bocom": {
      "label": "交通银行",
      "short": "交行",
      "updated": "",
      "rates": {
        "USD": {
          "buy": 6.6731,
          "sell": 6.7018
        },
        "EUR": {
          "buy": 7.4944,
          "sell": 7.5515
        },
        "GBP": {
          "buy": 8.9699,
          "sell": 9.0383
        },
        "AUD": {
          "buy": 4.6391,
          "sell": 4.6743
        }
      }
    }
  },
  "networkBps": {
    "mastercard": 25,
    "visa": 35,
    "unionpay": 30
  }
};
