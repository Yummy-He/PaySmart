/*
 * 牌价快照。由 scripts/fetch-rates.mjs 生成。
 * 银行牌价单位：人民币 / 1 外币。
 * 中间价单位：人民币 / 1 外币。
 */
window.FX_RATES = {
  "fetchedAt": "2026-11-04T09:49:25.087Z",
  "asOfLabel": "2026年11月4日 17:49",
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
      "name": "快易理财网卡组织汇率",
      "url": "https://www.kylc.com/upcurrency.html"
    },
    {
      "name": "ExchangeRate-API 中间价",
      "url": "https://www.exchangerate-api.com/"
    },
    {
      "name": "中信银行外汇牌价",
      "url": "https://www.citicbank.com/common/financialnews/news/202408/t20240829_3716.html"
    },
    {
      "name": "中国农业银行结售汇牌价",
      "url": "https://ewealth.abchina.com/foreignexchange/listprice/"
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
      "updated": "17:44",
      "rates": {
        "AUD": {
          "buy": 4.6625,
          "sell": 4.6995
        },
        "CAD": {
          "buy": 4.7677,
          "sell": 4.8051
        },
        "CHF": {
          "buy": 8.1409,
          "sell": 8.2038
        },
        "EUR": {
          "buy": 7.4867,
          "sell": 7.5415
        },
        "GBP": {
          "buy": 8.9722,
          "sell": 9.0388
        },
        "HKD": {
          "buy": 0.8489,
          "sell": 0.8523
        },
        "JPY": {
          "buy": 0.041983,
          "sell": 0.042307
        },
        "KRW": {
          "buy": 0.004939,
          "sell": 0.005042
        },
        "MOP": {
          "buy": 0.8241,
          "sell": 0.8279
        },
        "MYR": {
          "buy": 1.6361,
          "sell": 1.6508
        },
        "NZD": {
          "buy": 3.7473,
          "sell": 3.7755
        },
        "SGD": {
          "buy": 5.2027,
          "sell": 5.2419
        },
        "THB": {
          "buy": 0.1977,
          "sell": 0.1993
        },
        "USD": {
          "buy": 6.6613,
          "sell": 6.6894
        }
      }
    },
    "icbc": {
      "label": "中国工商银行",
      "short": "工行",
      "updated": "17:46",
      "rates": {
        "GBP": {
          "buy": 8.9586,
          "sell": 9.0414
        },
        "HKD": {
          "buy": 0.8482,
          "sell": 0.8525
        },
        "USD": {
          "buy": 6.6545,
          "sell": 6.6892
        },
        "CHF": {
          "buy": 8.1324,
          "sell": 8.2076
        },
        "SGD": {
          "buy": 5.1958,
          "sell": 5.2438
        },
        "JPY": {
          "buy": 0.041922,
          "sell": 0.04231
        },
        "CAD": {
          "buy": 4.7595,
          "sell": 4.8035
        },
        "AUD": {
          "buy": 4.6558,
          "sell": 4.6989
        },
        "MYR": {
          "buy": 1.6336,
          "sell": 1.6487
        },
        "EUR": {
          "buy": 7.4761,
          "sell": 7.5453
        },
        "MOP": {
          "buy": 0.8227,
          "sell": 0.8282
        },
        "THB": {
          "buy": 0.1974,
          "sell": 0.1992
        },
        "NZD": {
          "buy": 3.7419,
          "sell": 3.7765
        },
        "KRW": {
          "buy": 0.004928,
          "sell": 0.005026
        }
      }
    },
    "cmb": {
      "label": "招商银行",
      "short": "招行",
      "updated": "17:48",
      "rates": {
        "HKD": {
          "buy": 0.84883,
          "sell": 0.85223
        },
        "NZD": {
          "buy": 3.74553,
          "sell": 3.77561
        },
        "AUD": {
          "buy": 4.66148,
          "sell": 4.69892
        },
        "USD": {
          "buy": 6.66125,
          "sell": 6.69028
        },
        "EUR": {
          "buy": 7.48242,
          "sell": 7.54252
        },
        "CAD": {
          "buy": 4.76447,
          "sell": 4.80273
        },
        "GBP": {
          "buy": 8.96668,
          "sell": 9.0387
        },
        "JPY": {
          "buy": 0.0419628,
          "sell": 0.0422998
        },
        "SGD": {
          "buy": 5.20102,
          "sell": 5.2428
        },
        "CHF": {
          "buy": 8.13873,
          "sell": 8.20411
        }
      }
    },
    "bocom": {
      "label": "交通银行",
      "short": "交行",
      "updated": "",
      "rates": {
        "USD": {
          "buy": 6.6614,
          "sell": 6.69
        },
        "EUR": {
          "buy": 7.4896,
          "sell": 7.5467
        },
        "GBP": {
          "buy": 8.9735,
          "sell": 9.0419
        },
        "AUD": {
          "buy": 4.6619,
          "sell": 4.6973
        }
      }
    },
    "citic": {
      "label": "中信银行",
      "short": "中信",
      "updated": "2026年11月04日 15:35:49",
      "rates": {
        "USD": {
          "buy": 6.6645,
          "sell": 6.6934
        },
        "GBP": {
          "buy": 8.9638,
          "sell": 9.0308
        },
        "EUR": {
          "buy": 7.4779,
          "sell": 7.5262
        },
        "JPY": {
          "buy": 0.042013,
          "sell": 0.042433
        },
        "HKD": {
          "buy": 0.84927,
          "sell": 0.85264
        },
        "CAD": {
          "buy": 4.7619,
          "sell": 4.8032
        },
        "CHF": {
          "buy": 8.1474,
          "sell": 8.2007
        },
        "NZD": {
          "buy": 3.7318,
          "sell": 3.7691
        },
        "AUD": {
          "buy": 4.6491,
          "sell": 4.689
        },
        "SGD": {
          "buy": 5.2034,
          "sell": 5.2363
        },
        "KRW": {
          "buy": 0.004939,
          "sell": 0.005021
        },
        "THB": {
          "buy": 0.1963,
          "sell": 0.2001
        },
        "MOP": {
          "buy": 0.8228,
          "sell": 0.8285
        }
      }
    },
    "abc": {
      "label": "中国农业银行",
      "short": "农行",
      "updated": "2026-11-04 18:38:53",
      "rates": {
        "GBP": {
          "buy": 8.966660000000001,
          "sell": 9.02964
        },
        "HKD": {
          "buy": 0.84879,
          "sell": 0.8521899999999999
        },
        "USD": {
          "buy": 6.6596,
          "sell": 6.68763
        },
        "CHF": {
          "buy": 8.13299,
          "sell": 8.19831
        },
        "SGD": {
          "buy": 5.20253,
          "sell": 5.239070000000001
        },
        "JPY": {
          "buy": 0.04196,
          "sell": 0.04226
        },
        "CAD": {
          "buy": 4.76262,
          "sell": 4.80088
        },
        "AUD": {
          "buy": 4.66402,
          "sell": 4.69678
        },
        "EUR": {
          "buy": 7.48212,
          "sell": 7.53468
        },
        "MOP": {
          "buy": 0.82365,
          "sell": 0.82695
        },
        "THB": {
          "buy": 0.19751000000000002,
          "sell": 0.1991
        },
        "NZD": {
          "buy": 4.3625,
          "sell": 4.3888
        },
        "KRW": {
          "buy": 0.00481,
          "sell": 0.00517
        }
      }
    }
  },
  "networks": {
    "visa": {
      "label": "Visa",
      "cny": {
        "USD": 6.67116654,
        "EUR": 7.47703598,
        "GBP": 8.96670598,
        "JPY": 0.04229481,
        "HKD": 0.8504468,
        "SGD": 5.21918313,
        "AUD": 4.67448172,
        "CAD": 4.7832221,
        "CHF": 8.18748143,
        "KRW": 0.00498853,
        "THB": 0.19829855,
        "MYR": 1.63950845,
        "NZD": 3.75786436,
        "MOP": 0.82624801
      },
      "usd": {
        "EUR": 1.12079888,
        "GBP": 1.34409866,
        "JPY": 0.00633994,
        "HKD": 0.12748097,
        "SGD": 0.7823494,
        "AUD": 0.7006993,
        "CAD": 0.71699935,
        "CHF": 1.22729381,
        "KRW": 0.00074778,
        "THB": 0.02972472,
        "MYR": 0.24576038,
        "NZD": 0.56329944,
        "MOP": 0.1238536
      },
      "updated": "2026-11-04",
      "sourceUrl": "https://www.kylc.com/huilv/i-visa/cny/usd.html"
    },
    "mastercard": {
      "label": "万事达",
      "cny": {
        "USD": 6.6769,
        "EUR": 7.484802,
        "GBP": 8.9744124,
        "JPY": 0.0423312,
        "HKD": 0.8511786,
        "SGD": 5.2240826,
        "AUD": 4.6885182,
        "CAD": 4.7873378,
        "CHF": 8.1945263,
        "KRW": 0.0049917,
        "THB": 0.198363,
        "MYR": 1.6409191,
        "NZD": 3.7617652,
        "MOP": 0.826349
      },
      "usd": {
        "EUR": 1.1209996,
        "GBP": 1.3440987,
        "JPY": 0.0063399,
        "HKD": 0.1274811,
        "SGD": 0.7824114,
        "AUD": 0.7021999,
        "CAD": 0.7170001,
        "CHF": 1.227295,
        "KRW": 0.0007476,
        "THB": 0.0297089,
        "MYR": 0.2457606,
        "NZD": 0.5634,
        "MOP": 0.1237624
      },
      "updated": "2026-11-03",
      "sourceUrl": "https://www.kylc.com/huilv/i-mastercard/cny/usd.html"
    },
    "unionpay": {
      "label": "银联",
      "cny": {
        "USD": 6.695,
        "EUR": 7.5365998,
        "GBP": 9.03819995,
        "JPY": 0.042506,
        "HKD": 0.8531,
        "SGD": 5.23809993,
        "AUD": 4.67900001,
        "CAD": 4.80250007,
        "CHF": 8.20860023,
        "KRW": 0.00501421,
        "THB": 0.19894475,
        "MYR": 1.65322929,
        "NZD": 3.75906138,
        "MOP": 0.8287
      },
      "updated": "2026-11-04",
      "sourceUrl": "https://www.kylc.com/upcurrency.html"
    }
  }
};
