/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/paystream_v1.json`.
 */
export type PaystreamV1 = {
  "address": "f9Gfo7RHWxGwPZN6EVDHWydyiyQUt4NA9JaF7cSWwcU",
  "metadata": {
    "name": "paystreamV1",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "allocateSeat",
      "discriminator": [
        168,
        26,
        240,
        212,
        37,
        206,
        127,
        195
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The admin with authority to approve seats"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "trader"
        },
        {
          "name": "seat",
          "docs": [
            "The seat account to be approved"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  97,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketHeader"
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "approveSeat",
      "docs": [
        "Approves a trader's request for a seat in the market.",
        "",
        "Only market administrators can approve seat requests.",
        "Once approved, the trader can deposit funds and participate in the market."
      ],
      "discriminator": [
        54,
        208,
        161,
        60,
        191,
        220,
        112,
        139
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The admin with authority to approve seats"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "seat",
          "docs": [
            "The seat account to be approved"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "borrow",
      "docs": [
        "Allows a trader to borrow assets from the market.",
        "",
        "The trader must have sufficient collateral in their deposit.",
        "Borrowed amounts are subject to the market's loan-to-value ratio."
      ],
      "discriminator": [
        228,
        253,
        131,
        202,
        207,
        116,
        89,
        18
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "collateralMarketHeader",
          "docs": [
            "The collateral market header account"
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Borrows"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "collateralMarket",
          "docs": [
            "The collateral market account"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralVault",
          "docs": [
            "The collateral market vault where assets will be stored"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "collateralMarket"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralTokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "changeMarketStatus",
      "discriminator": [
        221,
        127,
        224,
        41,
        177,
        145,
        126,
        8
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority that creates and manages the market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "updateMarketStatus",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dangerouslyMutateCollateral",
      "docs": [
        "DANGEROUSLY MUTATE TRADER STATE",
        "ONLY USE IF YOU KNOW WHAT YOU ARE DOING",
        "VERY DANGEROUS, WILL BREAK THE CONTRACT IF USED INCORRECTLY",
        "THIS WILL BE REMOVED SOON"
      ],
      "discriminator": [
        43,
        80,
        201,
        26,
        21,
        27,
        236,
        117
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "trader",
          "writable": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "seat",
            "marketHeader"
          ]
        }
      ],
      "args": [
        {
          "name": "isIncrease",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dangerouslyMutateOnVaultBorrow",
      "discriminator": [
        87,
        149,
        67,
        237,
        20,
        236,
        117,
        209
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "trader",
          "writable": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "seat",
            "marketHeader"
          ]
        }
      ],
      "args": [
        {
          "name": "isIncrease",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dangerouslyMutateOnVaultLends",
      "discriminator": [
        207,
        164,
        109,
        18,
        174,
        24,
        246,
        69
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "trader",
          "writable": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "seat",
            "marketHeader"
          ]
        }
      ],
      "args": [
        {
          "name": "isIncrease",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dangerouslyMutateP2pBorrow",
      "discriminator": [
        43,
        189,
        243,
        166,
        66,
        98,
        34,
        231
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "trader",
          "writable": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "seat",
            "marketHeader"
          ]
        }
      ],
      "args": [
        {
          "name": "isIncrease",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dangerouslyMutateP2pLends",
      "discriminator": [
        45,
        35,
        162,
        221,
        185,
        169,
        197,
        163
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "trader",
          "writable": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "seat",
            "marketHeader"
          ]
        }
      ],
      "args": [
        {
          "name": "isIncrease",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositCollateral",
      "docs": [
        "Allows a trader to deposit assets to the market.",
        "",
        "The trader must have an approved seat.",
        "The deposited assets can be used either as collateral for borrowing",
        "or for lending in the peer-to-peer market."
      ],
      "discriminator": [
        156,
        131,
        142,
        116,
        146,
        247,
        162,
        120
      ],
      "accounts": [
        {
          "name": "trader",
          "docs": [
            "The trader lending assets"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header account that will be initialized and stores market metadata"
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting deposits"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being deposited"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeDriftAccounts",
      "docs": [
        "Initializes a new drift user account.",
        "",
        "This function creates a new drift user account for the paystream program to manage funds with drift."
      ],
      "discriminator": [
        111,
        17,
        1,
        7,
        109,
        160,
        225,
        192
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "5P9goJxgRVgueT4Cix9SrnuRL8fG1hSo79m9WH4dsd55"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "driftProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "driftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  102,
                  116,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                9,
                84,
                219,
                190,
                158,
                201,
                96,
                201,
                138,
                122,
                41,
                63,
                226,
                19,
                54,
                150,
                111,
                225,
                128,
                209,
                81,
                174,
                75,
                129,
                121,
                86,
                31,
                137,
                133,
                74,
                83,
                246
              ]
            }
          }
        },
        {
          "name": "driftUserAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "paystreamVaultAuthority"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                9,
                84,
                219,
                190,
                158,
                201,
                96,
                201,
                138,
                122,
                41,
                63,
                226,
                19,
                54,
                150,
                111,
                225,
                128,
                209,
                81,
                174,
                75,
                129,
                121,
                86,
                31,
                137,
                133,
                74,
                83,
                246
              ]
            }
          }
        },
        {
          "name": "driftUserStatsAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "paystreamVaultAuthority"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                9,
                84,
                219,
                190,
                158,
                201,
                96,
                201,
                138,
                122,
                41,
                63,
                226,
                19,
                54,
                150,
                111,
                225,
                128,
                209,
                81,
                174,
                75,
                129,
                121,
                86,
                31,
                137,
                133,
                74,
                83,
                246
              ]
            }
          }
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMarket",
      "docs": [
        "Initializes a new lending market.",
        "",
        "This function creates a new market account and associated vault for storing tokens.",
        "The market will track lending positions and collateral positions separately."
      ],
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority that creates and manages the market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header account that will be initialized and stores market metadata"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  104,
                  101,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "The market account that will be initialized"
          ]
        },
        {
          "name": "collateralMarket",
          "docs": [
            "The collateral market account that will be initialized"
          ]
        },
        {
          "name": "marketVault",
          "docs": [
            "The token vault associated with the market for storing assets",
            "Should be a PDA derived from the market and token mint"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "The token mint that this market will use"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral token mint that this market will use"
          ]
        },
        {
          "name": "collateralTokenProgram",
          "docs": [
            "The collateral token program that this market will use"
          ]
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program interface"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "optimizerProgram",
          "docs": [
            "The optimizer program"
          ]
        }
      ],
      "args": [
        {
          "name": "feeRecipient",
          "type": "pubkey"
        },
        {
          "name": "marketId",
          "type": "u64"
        },
        {
          "name": "oraclePubkey",
          "type": "pubkey"
        },
        {
          "name": "oracleSource",
          "type": "u8"
        },
        {
          "name": "collateralOraclePubkey",
          "type": "pubkey"
        },
        {
          "name": "collateralOracleSource",
          "type": "u8"
        },
        {
          "name": "ltvRatio",
          "type": "u64"
        },
        {
          "name": "liquidationThreshold",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lend",
      "docs": [
        "Allows a trader to lend assets in the peer-to-peer market.",
        "",
        "The trader must have previously deposited funds.",
        "Only non-collateral funds can be used for peer-to-peer lending."
      ],
      "discriminator": [
        89,
        34,
        75,
        168,
        122,
        47,
        185,
        45
      ],
      "accounts": [
        {
          "name": "trader",
          "docs": [
            "The trader lending assets"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header account that will be initialized and stores market metadata"
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Lends"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Lended"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "liquidateByLtv",
      "docs": [
        "Allows anyone to liquidate a borrower's position which is undercollateralized."
      ],
      "discriminator": [
        195,
        69,
        232,
        57,
        171,
        231,
        197,
        0
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidatee",
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Borrows"
          ],
          "writable": true,
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMarket",
          "docs": [
            "The collateral market account"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralVault",
          "docs": [
            "The collateral market vault where assets will be stored"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "collateralMarket"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "liquidatorTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "liquidator"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "liquidatorCollateralTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "liquidator"
              },
              {
                "kind": "account",
                "path": "collateralTokenProgram"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralTokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "assetAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "liquidateByOverdue",
      "docs": [
        "Allows anyone to liquidate a borrower's position which is overdue."
      ],
      "discriminator": [
        52,
        219,
        140,
        149,
        80,
        175,
        53,
        21
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidatee",
          "writable": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Borrows"
          ],
          "writable": true,
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMarket",
          "docs": [
            "The collateral market account"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral mint of the asset being Borrowed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralVault",
          "docs": [
            "The collateral market vault where assets will be stored"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "collateralMarket"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "liquidatorTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "liquidator"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "liquidatorCollateralTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "liquidator"
              },
              {
                "kind": "account",
                "path": "collateralTokenProgram"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralTokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "assetAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "markAsCollateral",
      "discriminator": [
        150,
        79,
        29,
        32,
        159,
        55,
        26,
        178
      ],
      "accounts": [
        {
          "name": "trader",
          "docs": [
            "The trader lending assets"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header account that will be initialized and stores market metadata"
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting deposits"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "repay",
      "docs": [
        "Allows a trader to repay borrowed assets to the market.",
        "",
        "Repayments cover both principal and accrued interest.",
        "Excess repayment amounts are ignored."
      ],
      "discriminator": [
        234,
        103,
        67,
        82,
        208,
        234,
        219,
        166
      ],
      "accounts": [
        {
          "name": "trader",
          "docs": [
            "The trader lending assets"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header account that will be initialized and stores market metadata"
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Repays"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Repayed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral mint of the asset being Repayed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "requestSeat",
      "docs": [
        "Allows a trader to request a seat in the market.",
        "",
        "A seat is required to participate in lending and borrowing activities.",
        "The request must be approved by a market administrator before the trader can participate."
      ],
      "discriminator": [
        45,
        147,
        28,
        81,
        244,
        235,
        148,
        143
      ],
      "accounts": [
        {
          "name": "trader",
          "docs": [
            "The trader requesting a seat"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "docs": [
            "The market header"
          ]
        },
        {
          "name": "seat",
          "docs": [
            "The seat account to be created"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  97,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketHeader"
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "toggleP2pLending",
      "discriminator": [
        82,
        246,
        226,
        131,
        141,
        251,
        33,
        91
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "seat",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "enableP2pLending",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateMarketAuthority",
      "discriminator": [
        117,
        110,
        157,
        95,
        174,
        56,
        208,
        146
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority that creates and manages the market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateMarketHeader",
      "discriminator": [
        56,
        209,
        36,
        255,
        215,
        166,
        203,
        132
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The authority that creates and manages the market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "optimizerProgram",
          "docs": [
            "The optimizer program"
          ]
        }
      ],
      "args": [
        {
          "name": "feeRecipient",
          "type": "pubkey"
        },
        {
          "name": "updateMarketStatus",
          "type": "u64"
        },
        {
          "name": "oraclePubkey",
          "type": "pubkey"
        },
        {
          "name": "oracleSource",
          "type": "u8"
        },
        {
          "name": "collateralOraclePubkey",
          "type": "pubkey"
        },
        {
          "name": "collateralOracleSource",
          "type": "u8"
        },
        {
          "name": "ltvRatio",
          "type": "u64"
        },
        {
          "name": "liquidationThreshold",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "Allows a trader to withdraw their deposited assets from the market.",
        "",
        "The trader can only withdraw funds that are not being used as collateral",
        "or actively lent in peer-to-peer matches."
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true,
          "relations": [
            "seat"
          ]
        },
        {
          "name": "marketHeader",
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The market receiving the lent assets",
            "Verify market is active and accepting Withdraws"
          ],
          "writable": true,
          "relations": [
            "marketHeader",
            "seat"
          ]
        },
        {
          "name": "collateralMarket",
          "docs": [
            "The collateral market account"
          ],
          "writable": true,
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the asset being Withdrawed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralMint",
          "docs": [
            "The collateral mint of the asset being Withdrawed"
          ],
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "vault",
          "docs": [
            "The market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralVault",
          "docs": [
            "The collateral market vault where assets will be stored"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "collateralMarket"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "seat",
          "docs": [
            "The trader's seat in the market"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralTokenProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "paystreamVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  115,
                  116,
                  114,
                  101,
                  97,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "optimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "marketOptimizerState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  111,
                  112,
                  116,
                  105,
                  109,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "optimizerProgram"
            }
          }
        },
        {
          "name": "sysIx",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "oracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "collateralOracle",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "optimizerProgram",
          "relations": [
            "marketHeader"
          ]
        },
        {
          "name": "protocolProgram"
        },
        {
          "name": "protocolVault",
          "writable": true
        },
        {
          "name": "protocolVaultAuthority"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "marketHeader",
      "discriminator": [
        56,
        105,
        191,
        242,
        226,
        243,
        198,
        164
      ]
    },
    {
      "name": "seat",
      "discriminator": [
        90,
        228,
        22,
        90,
        162,
        86,
        173,
        26
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6001,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6002,
      "name": "insufficientFunds",
      "msg": "Insufficient funds, Tried to withdraw more than available, or collateral is frozen due to borrowing"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6004,
      "name": "invalidAuthority",
      "msg": "Invalid authority, only admin can make this call"
    },
    {
      "code": 6005,
      "name": "failedToLoadMarketFromAccount",
      "msg": "Failed to load market from account"
    },
    {
      "code": 6006,
      "name": "invalidMarketParameters",
      "msg": "Invalid market parameters"
    },
    {
      "code": 6007,
      "name": "marketAlreadyInitialized",
      "msg": "Market is already initialized"
    },
    {
      "code": 6008,
      "name": "invalidSeat",
      "msg": "Invalid seat"
    },
    {
      "code": 6009,
      "name": "marketNotActive",
      "msg": "Market is not active"
    },
    {
      "code": 6010,
      "name": "invalidMarketVault",
      "msg": "Invalid market vault"
    },
    {
      "code": 6011,
      "name": "orderNotFound",
      "msg": "Order not found"
    },
    {
      "code": 6012,
      "name": "orderAlreadyMatched",
      "msg": "Order already matched"
    },
    {
      "code": 6013,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6014,
      "name": "invalidTrader",
      "msg": "Invalid trader"
    },
    {
      "code": 6015,
      "name": "invalidOrderAmount",
      "msg": "Invalid order amount"
    },
    {
      "code": 6016,
      "name": "traderCapacityReached",
      "msg": "Trader capacity reached"
    },
    {
      "code": 6017,
      "name": "traderNotFound",
      "msg": "Trader not found"
    },
    {
      "code": 6018,
      "name": "insufficientCollateral",
      "msg": "Insufficient collateral"
    },
    {
      "code": 6019,
      "name": "p2pMatchingAlreadyEnabled",
      "msg": "P2P matching already enabled"
    },
    {
      "code": 6020,
      "name": "p2pMatchingAlreadyDisabled",
      "msg": "P2P matching already disabled"
    },
    {
      "code": 6021,
      "name": "p2pDisabled",
      "msg": "P2P disabled"
    },
    {
      "code": 6022,
      "name": "p2pDisabledByTrader",
      "msg": "P2P disabled by trader"
    },
    {
      "code": 6023,
      "name": "p2pEnabledByTrader",
      "msg": "P2P enabled by trader"
    },
    {
      "code": 6024,
      "name": "invalidCollateralMint",
      "msg": "Invalid collateral mint"
    },
    {
      "code": 6025,
      "name": "identicalMarketAndCollateralMarket",
      "msg": "Identical market and collateral market, both cannot be the same"
    },
    {
      "code": 6026,
      "name": "invalidBorrower",
      "msg": "Invalid borrower"
    },
    {
      "code": 6027,
      "name": "seatAlreadyApproved",
      "msg": "Seat already approved"
    },
    {
      "code": 6028,
      "name": "alreadyBorrowingCannotLend",
      "msg": "Already borrowing can't lend"
    },
    {
      "code": 6029,
      "name": "alreadyLendingCannotBorrow",
      "msg": "Already lending can't borrow"
    },
    {
      "code": 6030,
      "name": "repaymentFailed",
      "msg": "Repayment failed, Amount resolved to zero as repayment amount"
    },
    {
      "code": 6031,
      "name": "castingFailure",
      "msg": "Casting error"
    },
    {
      "code": 6032,
      "name": "mathError",
      "msg": "Math error"
    },
    {
      "code": 6033,
      "name": "invalidOptimizerProgram",
      "msg": "Invalid optimizer program"
    },
    {
      "code": 6034,
      "name": "invalidRepaymentAmount",
      "msg": "Invalid repayment amount"
    },
    {
      "code": 6035,
      "name": "unableToLoadOracle",
      "msg": "Unable to load oracle"
    },
    {
      "code": 6036,
      "name": "invalidOracle",
      "msg": "Invalid oracle"
    },
    {
      "code": 6037,
      "name": "insufficientOracleDataPoints",
      "msg": "Insufficient oracle data points"
    },
    {
      "code": 6038,
      "name": "oracleDelayTooHigh",
      "msg": "Oracle delay too high"
    },
    {
      "code": 6039,
      "name": "liquidationThresholdNotMet",
      "msg": "Liquidation threshold not met"
    },
    {
      "code": 6040,
      "name": "noDebtToLiquidate",
      "msg": "No debt to liquidate"
    },
    {
      "code": 6041,
      "name": "matchNotFound",
      "msg": "Match not found"
    }
  ],
  "types": [
    {
      "name": "marketHeader",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "type": "u64"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "collateralMarket",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "tokenProgram",
            "type": "pubkey"
          },
          {
            "name": "collateralTokenProgram",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "optimizerProgram",
            "type": "pubkey"
          },
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "oracleSource",
            "type": "u8"
          },
          {
            "name": "collateralOracle",
            "type": "pubkey"
          },
          {
            "name": "collateralOracleSource",
            "type": "u8"
          },
          {
            "name": "ltvRatio",
            "type": "u64"
          },
          {
            "name": "liquidationThreshold",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                48
              ]
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "seat",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "approvalState",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "marketHeaderSeed",
      "type": "bytes",
      "value": "[109, 97, 114, 107, 101, 116, 95, 104, 101, 97, 100, 101, 114]"
    },
    {
      "name": "marketVaultSeed",
      "type": "bytes",
      "value": "[109, 97, 114, 107, 101, 116, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "paystreamVaultAuthoritySeed",
      "type": "bytes",
      "value": "[112, 97, 121, 115, 116, 114, 101, 97, 109, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]"
    },
    {
      "name": "pricePrecision",
      "type": "u64",
      "value": "1000000"
    },
    {
      "name": "ratePrecision",
      "type": "u64",
      "value": "10000"
    },
    {
      "name": "ratioPrecision",
      "type": "u64",
      "value": "10000"
    },
    {
      "name": "seatSeed",
      "type": "bytes",
      "value": "[115, 101, 97, 116]"
    },
    {
      "name": "sevenDays",
      "type": "u64",
      "value": "604800"
    }
  ]
};
