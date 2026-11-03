/*
 * 牌价快照。由 scripts/fetch-rates.mjs 生成。
 * 银行牌价单位：人民币 / 1 外币。
 * 中间价单位：人民币 / 1 外币。
 */
window.FX_RATES = {
  "fetchedAt": "2026-11-03T15:07:25.475Z",
  "asOfLabel": "2026年11月3日 23:07",
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
      "name": "ExchangeRate-API 中间价",
      "url": "https://www.exchangerate-api.com/"
    }
  ],
  "mid": {
    "USD": 6.66528917,
    "EUR": 7.45317543,
    "GBP": 8.92809314,
    "JPY": 0.04218812,
    "HKD": 0.84954982,
    "SGD": 5.21197085,
    "AUD": 4.66515827,
    "CAD": 4.76637608,
    "CHF": 8.11998084,
    "KRW": 0.004994,
    "THB": 0.19779044,
    "MYR": 1.64959882,
    "NZD": 3.73552484,
    "MOP": 0.82481778
  },
  "banks": {
    "boc": {
      "label": "中国银行",
      "short": "中行",
      "updated": "23:04",
      "rates": {
        "USD": {
          "buy": 6.6594,
          "sell": 6.6874
        },
        "EUR": {
          "buy": 7.4414,
          "sell": 7.4959
        },
        "GBP": {
          "buy": 8.9271,
          "sell": 8.9934
        },
        "JPY": {
          "buy": 0.041956,
          "sell": 0.04228
        },
        "HKD": {
          "buy": 0.8487,
          "sell": 0.8521
        },
        "SGD": {
          "buy": 5.19,
          "sell": 5.229
        },
        "AUD": {
          "buy": 4.6445,
          "sell": 4.6814
        },
        "CAD": {
          "buy": 4.7526,
          "sell": 4.79
        },
        "CHF": {
          "buy": 8.1028,
          "sell": 8.1654
        },
        "KRW": {
          "buy": 0.004926,
          "sell": 0.005029
        },
        "THB": {
          "buy": 0.197,
          "sell": 0.1986
        },
        "MYR": {
          "buy": 1.6306,
          "sell": 1.6453
        },
        "NZD": {
          "buy": 3.7355,
          "sell": 3.7636
        },
        "MOP": {
          "buy": 0.8239,
          "sell": 0.8277
        }
      }
    },
    "icbc": {
      "label": "中国工商银行",
      "short": "工行",
      "updated": "23:05",
      "rates": {
        "USD": {
          "buy": 6.6524,
          "sell": 6.6871
        },
        "EUR": {
          "buy": 7.429,
          "sell": 7.4977
        },
        "GBP": {
          "buy": 8.9121,
          "sell": 8.9945
        },
        "JPY": {
          "buy": 0.041894,
          "sell": 0.042282
        },
        "HKD": {
          "buy": 0.848,
          "sell": 0.8523
        },
        "SGD": {
          "buy": 5.1822,
          "sell": 5.2301
        },
        "AUD": {
          "buy": 4.6353,
          "sell": 4.6782
        },
        "CAD": {
          "buy": 4.7445,
          "sell": 4.7883
        },
        "CHF": {
          "buy": 8.0912,
          "sell": 8.1661
        },
        "KRW": {
          "buy": 0.004912,
          "sell": 0.00501
        },
        "THB": {
          "buy": 0.1966,
          "sell": 0.1984
        },
        "MYR": {
          "buy": 1.6281,
          "sell": 1.6432
        },
        "NZD": {
          "buy": 3.7286,
          "sell": 3.763
        },
        "MOP": {
          "buy": 0.8225,
          "sell": 0.828
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
