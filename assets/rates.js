/*
 * 牌价快照。由 scripts/fetch-rates.mjs 生成。
 * 银行牌价单位：人民币 / 1 外币。
 * 中间价单位：人民币 / 1 外币。
 */
window.FX_RATES = {
  "fetchedAt": "2026-11-03T15:31:30.177Z",
  "asOfLabel": "2026年11月3日 23:31",
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
      "updated": "23:29",
      "rates": {
        "AUD": {
          "buy": 4.6398,
          "sell": 4.6767
        },
        "CAD": {
          "buy": 4.7499,
          "sell": 4.7872
        },
        "CHF": {
          "buy": 8.09,
          "sell": 8.1525
        },
        "EUR": {
          "buy": 7.4307,
          "sell": 7.4851
        },
        "GBP": {
          "buy": 8.9165,
          "sell": 8.9827
        },
        "HKD": {
          "buy": 0.8487,
          "sell": 0.8521
        },
        "JPY": {
          "buy": 0.04191,
          "sell": 0.042234
        },
        "KRW": {
          "buy": 0.004923,
          "sell": 0.005026
        },
        "MOP": {
          "buy": 0.8239,
          "sell": 0.8277
        },
        "MYR": {
          "buy": 1.6306,
          "sell": 1.6453
        },
        "NZD": {
          "buy": 3.7322,
          "sell": 3.7603
        },
        "SGD": {
          "buy": 5.188,
          "sell": 5.227
        },
        "THB": {
          "buy": 0.1968,
          "sell": 0.1984
        },
        "USD": {
          "buy": 6.6594,
          "sell": 6.6874
        }
      }
    },
    "icbc": {
      "label": "中国工商银行",
      "short": "工行",
      "updated": "23:29",
      "rates": {
        "GBP": {
          "buy": 8.9021,
          "sell": 8.9844
        },
        "HKD": {
          "buy": 0.848,
          "sell": 0.8523
        },
        "USD": {
          "buy": 6.6524,
          "sell": 6.6871
        },
        "CHF": {
          "buy": 8.0797,
          "sell": 8.1544
        },
        "SGD": {
          "buy": 5.1805,
          "sell": 5.2284
        },
        "JPY": {
          "buy": 0.041868,
          "sell": 0.042255
        },
        "CAD": {
          "buy": 4.7419,
          "sell": 4.7857
        },
        "AUD": {
          "buy": 4.6322,
          "sell": 4.6751
        },
        "MYR": {
          "buy": 1.6281,
          "sell": 1.6432
        },
        "EUR": {
          "buy": 7.4193,
          "sell": 7.4879
        },
        "MOP": {
          "buy": 0.8225,
          "sell": 0.828
        },
        "THB": {
          "buy": 0.1965,
          "sell": 0.1983
        },
        "NZD": {
          "buy": 3.7265,
          "sell": 3.7609
        },
        "KRW": {
          "buy": 0.004911,
          "sell": 0.005009
        }
      }
    },
    "cmb": {
      "label": "招商银行",
      "short": "招行",
      "updated": "23:31",
      "rates": {
        "HKD": {
          "buy": 0.84853,
          "sell": 0.85193
        },
        "NZD": {
          "buy": 3.73001,
          "sell": 3.75997
        },
        "AUD": {
          "buy": 4.63626,
          "sell": 4.6735
        },
        "USD": {
          "buy": 6.65846,
          "sell": 6.68748
        },
        "EUR": {
          "buy": 7.42746,
          "sell": 7.48712
        },
        "CAD": {
          "buy": 4.74716,
          "sell": 4.78528
        },
        "GBP": {
          "buy": 8.91109,
          "sell": 8.98267
        },
        "JPY": {
          "buy": 0.0419002,
          "sell": 0.0422368
        },
        "SGD": {
          "buy": 5.18505,
          "sell": 5.22669
        },
        "CHF": {
          "buy": 8.08779,
          "sell": 8.15275
        }
      }
    },
    "bocom": {
      "label": "交通银行",
      "short": "交行",
      "updated": "",
      "rates": {
        "USD": {
          "buy": 6.6594,
          "sell": 6.688
        },
        "EUR": {
          "buy": 7.431,
          "sell": 7.4875
        },
        "GBP": {
          "buy": 8.9176,
          "sell": 8.9855
        },
        "AUD": {
          "buy": 4.6399,
          "sell": 4.6751
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
