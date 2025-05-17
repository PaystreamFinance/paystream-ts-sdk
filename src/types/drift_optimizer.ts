/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drift_optimizer.json`.
 */
export type DriftOptimizer = {
  "address": "GMAnYXJ4AApsVDMwyHWG1rXHWGrM7uybfzQiaqpXU784",
  "metadata": {
    "name": "driftOptimizer",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "accounts",
          "accounts": [
            {
              "name": "paystreamVault",
              "writable": true
            },
            {
              "name": "protocolVault",
              "writable": true
            },
            {
              "name": "mint"
            },
            {
              "name": "paystreamVaultAuthority",
              "signer": true
            },
            {
              "name": "protocolVaultAuthority"
            },
            {
              "name": "sysIx",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "tokenProgram"
            },
            {
              "name": "protocolProgram"
            },
            {
              "name": "oracle"
            },
            {
              "name": "collateralOracle"
            }
          ]
        },
        {
          "name": "marketOptimizerState"
        },
        {
          "name": "state"
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
      "name": "getApys",
      "discriminator": [
        46,
        166,
        111,
        74,
        7,
        34,
        8,
        154
      ],
      "accounts": [
        {
          "name": "state"
        },
        {
          "name": "marketOptimizerState"
        }
      ],
      "args": [
        {
          "name": "mint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeDriftState",
      "discriminator": [
        189,
        151,
        83,
        248,
        88,
        184,
        84,
        166
      ],
      "accounts": [
        {
          "name": "caller",
          "address": "f9Gfo7RHWxGwPZN6EVDHWydyiyQUt4NA9JaF7cSWwcU"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "5P9goJxgRVgueT4Cix9SrnuRL8fG1hSo79m9WH4dsd55"
        },
        {
          "name": "optimizerState",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "authority",
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
            ],
            "program": {
              "kind": "const",
              "value": [
                9,
                197,
                107,
                253,
                126,
                146,
                6,
                20,
                214,
                52,
                236,
                231,
                160,
                150,
                45,
                35,
                186,
                6,
                173,
                66,
                95,
                100,
                241,
                51,
                197,
                150,
                27,
                137,
                172,
                251,
                107,
                25
              ]
            }
          }
        },
        {
          "name": "driftUserAccount",
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
                "path": "authority"
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
                "path": "authority"
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
          "name": "driftState",
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
          "name": "driftProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
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
      "name": "initializeMarketOptimizer",
      "discriminator": [
        155,
        29,
        135,
        254,
        6,
        171,
        222,
        222
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
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
            ]
          }
        },
        {
          "name": "market"
        },
        {
          "name": "mint"
        },
        {
          "name": "marketOptimizerState",
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
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "driftMarketIndex",
          "type": "u16"
        },
        {
          "name": "collateralMarketIndex",
          "type": "u16"
        }
      ]
    },
    {
      "name": "updateDriftState",
      "discriminator": [
        93,
        122,
        106,
        181,
        18,
        46,
        183,
        217
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
          "name": "state",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "programCaller",
          "type": "pubkey"
        },
        {
          "name": "protocolProgram",
          "type": "pubkey"
        },
        {
          "name": "driftState",
          "type": "pubkey"
        },
        {
          "name": "driftUserAccount",
          "type": "pubkey"
        },
        {
          "name": "driftUserStatsAccount",
          "type": "pubkey"
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
          "name": "state",
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
      "name": "updateMarketOptimizerState",
      "discriminator": [
        39,
        250,
        251,
        64,
        44,
        50,
        191,
        17
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
          "name": "state"
        },
        {
          "name": "marketOptimizerState",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "mint",
          "type": "pubkey"
        },
        {
          "name": "market",
          "type": "pubkey"
        },
        {
          "name": "marketIndex",
          "type": "u16"
        },
        {
          "name": "collateralMarketIndex",
          "type": "u16"
        },
        {
          "name": "driftSpotMarketAccount",
          "type": "pubkey"
        },
        {
          "name": "driftSpotCollateralMarketAccount",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdraw",
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
          "name": "accounts",
          "accounts": [
            {
              "name": "paystreamVault",
              "writable": true
            },
            {
              "name": "protocolVault",
              "writable": true
            },
            {
              "name": "mint"
            },
            {
              "name": "paystreamVaultAuthority",
              "signer": true
            },
            {
              "name": "protocolVaultAuthority"
            },
            {
              "name": "sysIx",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "tokenProgram"
            },
            {
              "name": "protocolProgram"
            },
            {
              "name": "oracle"
            },
            {
              "name": "collateralOracle"
            }
          ]
        },
        {
          "name": "marketOptimizerState"
        },
        {
          "name": "state"
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
      "name": "driftOptimizerState",
      "discriminator": [
        72,
        142,
        136,
        99,
        188,
        12,
        80,
        86
      ]
    },
    {
      "name": "marketOptimizerState",
      "discriminator": [
        236,
        204,
        181,
        8,
        147,
        92,
        67,
        218
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidProgramId",
      "msg": "Invalid program id"
    },
    {
      "code": 6001,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6002,
      "name": "invalidMarket",
      "msg": "Invalid market"
    },
    {
      "code": 6003,
      "name": "invalidMint",
      "msg": "Invalid mint"
    },
    {
      "code": 6004,
      "name": "invalidProtocolProgram",
      "msg": "Invalid protocol program"
    },
    {
      "code": 6005,
      "name": "invalidRemainingAccounts",
      "msg": "Invalid remaining accounts"
    }
  ],
  "types": [
    {
      "name": "driftOptimizerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programCaller",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "protocolProgram",
            "type": "pubkey"
          },
          {
            "name": "driftState",
            "type": "pubkey"
          },
          {
            "name": "driftUserAccount",
            "type": "pubkey"
          },
          {
            "name": "driftUserStatsAccount",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketOptimizerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "marketIndex",
            "type": "u16"
          },
          {
            "name": "collateralMarketIndex",
            "type": "u16"
          },
          {
            "name": "driftSpotMarketAccount",
            "type": "pubkey"
          },
          {
            "name": "driftSpotCollateralMarketAccount",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
