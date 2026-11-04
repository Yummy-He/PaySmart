/*
 * 牌价快照。由 scripts/fetch-rates.mjs 生成。
 * 银行牌价单位：人民币 / 1 外币。
 * 中间价单位：人民币 / 1 外币。
 */
window.FX_RATES = {
  "fetchedAt": "2026-11-04T04:24:51.748Z",
  "asOfLabel": "2026年11月4日 12:24",
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
      "updated": "12:22",
      "rates": {
        "AUD": {
          "buy": 4.6367,
          "sell": 4.6735
        },
        "CAD": {
          "buy": 4.7716,
          "sell": 4.809
        },
        "CHF": {
          "buy": 8.1779,
          "sell": 8.2411
        },
        "EUR": {
          "buy": 7.492,
          "sell": 7.5469
        },
        "GBP": {
          "buy": 8.9726,
          "sell": 9.0392
        },
        "HKD": {
          "buy": 0.8502,
          "sell": 0.8536
        },
        "JPY": {
          "buy": 0.042246,
          "sell": 0.042572
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
          "buy": 1.6355,
          "sell": 1.6502
        },
        "NZD": {
          "buy": 3.7272,
          "sell": 3.7553
        },
        "SGD": {
          "buy": 5.2058,
          "sell": 5.245
        },
        "THB": {
          "buy": 0.1974,
          "sell": 0.199
        },
        "USD": {
          "buy": 6.672,
          "sell": 6.7001
        }
      }
    },
    "icbc": {
      "label": "中国工商银行",
      "short": "工行",
      "updated": "12:23",
      "rates": {
        "GBP": {
          "buy": 8.957,
          "sell": 9.0398
        },
        "HKD": {
          "buy": 0.8497,
          "sell": 0.854
        },
        "USD": {
          "buy": 6.6653,
          "sell": 6.7
        },
        "CHF": {
          "buy": 8.1677,
          "sell": 8.2432
        },
        "SGD": {
          "buy": 5.1982,
          "sell": 5.2462
        },
        "JPY": {
          "buy": 0.042192,
          "sell": 0.042582
        },
        "CAD": {
          "buy": 4.7631,
          "sell": 4.8071
        },
        "AUD": {
          "buy": 4.6282,
          "sell": 4.671
        },
        "MYR": {
          "buy": 1.633,
          "sell": 1.6481
        },
        "EUR": {
          "buy": 7.4797,
          "sell": 7.5489
        },
        "MOP": {
          "buy": 0.8241,
          "sell": 0.8296
        },
        "THB": {
          "buy": 0.197,
          "sell": 0.1988
        },
        "NZD": {
          "buy": 3.7209,
          "sell": 3.7553
        },
        "KRW": {
          "buy": 0.004943,
          "sell": 0.005041
        }
      }
    },
    "cmb": {
      "label": "招商银行",
      "short": "招行",
      "updated": "12:24",
      "rates": {
        "HKD": {
          "buy": 0.85033,
          "sell": 0.85373
        },
        "NZD": {
          "buy": 3.72502,
          "sell": 3.75494
        },
        "AUD": {
          "buy": 4.6338,
          "sell": 4.67102
        },
        "USD": {
          "buy": 6.67213,
          "sell": 6.70121
        },
        "EUR": {
          "buy": 7.48799,
          "sell": 7.54813
        },
        "CAD": {
          "buy": 4.76815,
          "sell": 4.80645
        },
        "GBP": {
          "buy": 8.96601,
          "sell": 9.03803
        },
        "JPY": {
          "buy": 0.0422394,
          "sell": 0.0425786
        },
        "SGD": {
          "buy": 5.20381,
          "sell": 5.24561
        },
        "CHF": {
          "buy": 8.17505,
          "sell": 8.24071
        }
      }
    },
    "bocom": {
      "label": "交通银行",
      "short": "交行",
      "updated": "",
      "rates": {
        "USD": {
          "buy": 6.6723,
          "sell": 6.701
        },
        "EUR": {
          "buy": 7.4912,
          "sell": 7.5483
        },
        "GBP": {
          "buy": 8.9705,
          "sell": 9.0389
        },
        "AUD": {
          "buy": 4.6355,
          "sell": 4.6707
        }
      }
    }
  },
  "networkBps": {
    "mastercard": 0,
    "visa": 0,
    "unionpay": 0
  }
};
