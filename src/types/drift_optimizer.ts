/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drift_optimizer.json`.
 */
export type DriftOptimizer = {
  "address": "BcwrzHi4JyZ83g47onQThJweVGCTpP79rKbTUPcZss3i",
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
              "name": "protocolTraderPda"
            },
            {
              "name": "paystreamVault"
            },
            {
              "name": "protocolVault"
            },
            {
              "name": "mint"
            },
            {
              "name": "sysIx"
            },
            {
              "name": "tokenProgram"
            },
            {
              "name": "protocolProgram"
            }
          ]
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
          "name": "sysIx"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "mint"
        },
        {
          "name": "protocolTraderPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  97,
                  100,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
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
          "name": "state",
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
          "name": "protocolProgram"
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
      "args": []
    },
    {
      "name": "updateState",
      "discriminator": [
        135,
        112,
        215,
        75,
        247,
        185,
        53,
        176
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
              "name": "protocolTraderPda"
            },
            {
              "name": "paystreamVault"
            },
            {
              "name": "protocolVault"
            },
            {
              "name": "mint"
            },
            {
              "name": "sysIx"
            },
            {
              "name": "tokenProgram"
            },
            {
              "name": "protocolProgram"
            }
          ]
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
      "name": "driftOptimizer",
      "discriminator": [
        198,
        176,
        94,
        58,
        239,
        121,
        203,
        45
      ]
    }
  ],
  "types": [
    {
      "name": "driftOptimizer",
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
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
