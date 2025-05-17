import * as beet from "@metaplex-foundation/beet";
import * as beetSolana from "@metaplex-foundation/beet-solana";
import { PublicKey } from "@solana/web3.js";
import { MatchState, TraderState } from "./types";

export const traderStateBeet = new beet.BeetArgsStruct<TraderState>(
  [
    ["onVaultLends", beet.u64],
    ["inP2pLends", beet.u64],
    ["onVaultBorrows", beet.u64],
    ["inP2pBorrows", beet.u64],
    ["collateralAmount", beet.u64],
    ["flags", beet.u64],
  ],
  "TraderState"
);

export const matchStateBeet = new beet.BeetArgsStruct<MatchState>(
  [
    ["lenderIndex", beet.u64],
    ["borrowerIndex", beet.u64],
    ["amountInP2p", beet.u64],
    ["originalAmount", beet.u64],
    ["matchTimestamp", beet.u64],
    ["lastInterestPaymentTimestamp", beet.u64],
    ["totalInterestPaid", beet.u64],
  ],
  "MatchState"
);

type PubkeyWrapper = {
  publicKey: PublicKey;
};

export const publicKeyBeet = new beet.BeetArgsStruct<PubkeyWrapper>(
  [["publicKey", beetSolana.publicKey]],
  "PubkeyWrapper"
);

export type MatchIdWrapper = {
  matchId: beet.bignum;
};

export const matchIdBeet = new beet.BeetArgsStruct<MatchIdWrapper>(
  [["matchId", beet.u64]],
  "MatchIdWrapper"
);

/**
 * Deserializes a RedBlackTree from a given buffer
 * @description This deserialized the RedBlackTree defined in the sokoban library: https://github.com/Ellipsis-Labs/sokoban/tree/master
 *
 * @param data The data buffer to deserialize
 * @param keyDeserializer The deserializer for the tree key
 * @param valueDeserializer The deserializer for the tree value
 * @param keyTransform Optional function to transform the key after deserialization
 */
export function deserializeRedBlackTree<Key, Value, TransformedKey = Key>(
  data: Buffer,
  keyDeserializer: beet.BeetArgsStruct<Key>,
  valueDeserializer: beet.BeetArgsStruct<Value>,
  keyTransform?: (key: Key) => TransformedKey
): Map<TransformedKey | Key, Value> {
  const tree = new Map<TransformedKey | Key, Value>();
  const treeNodes = deserializeRedBlackTreeNodes(
    data,
    keyDeserializer,
    valueDeserializer
  );

  const nodes = treeNodes[0];
  const freeNodes = treeNodes[1];

  for (const [index, [key, value]] of nodes.entries()) {
    if (!freeNodes.has(index)) {
      const transformedKey = keyTransform ? keyTransform(key) : key;
      tree.set(transformedKey, value);
    }
  }

  return tree;
}

/**
 * Deserializes the RedBlackTree to return a map of keys to indices
 *
 * @param data The trader data buffer to deserialize
 * @param keyDeserializer The deserializer for the tree key
 * @param valueDeserializer The deserializer for the tree value
 */
export function getNodeIndices<Key, Value>(
  data: Buffer,
  keyDeserializer: beet.BeetArgsStruct<Key>,
  valueDeserializer: beet.BeetArgsStruct<Value>
): Map<Key, number> {
  const indexMap = new Map<Key, number>();
  const treeNodes = deserializeRedBlackTreeNodes(
    data,
    keyDeserializer,
    valueDeserializer
  );

  const nodes = treeNodes[0];
  const freeNodes = treeNodes[1];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [index, [key]] of nodes.entries()) {
    if (!freeNodes.has(index)) {
      indexMap.set(key, index + 1);
    }
  }

  return indexMap;
}

/**
 * Deserializes a RedBlackTree from a given buffer and returns the nodes and free nodes
 * @description This deserializes the RedBlackTree defined in the sokoban library: https://github.com/Ellipsis-Labs/sokoban/tree/master
 *
 * @param data The data buffer to deserialize
 * @param keyDeserializer The deserializer for the tree key
 * @param valueDeserializer The deserializer for the tree value
 */
function deserializeRedBlackTreeNodes<Key, Value>(
  data: Buffer,
  keyDeserializer: beet.BeetArgsStruct<Key>,
  valueDeserializer: beet.BeetArgsStruct<Value>
): [Array<[Key, Value]>, Set<number>] {
  let offset = 0;
  const keySize = keyDeserializer.byteSize;
  const valueSize = valueDeserializer.byteSize;

  const nodes = new Array<[Key, Value]>();

  // Skip RBTree header
  offset += 16;

  // Skip node allocator size
  offset += 8;
  const bumpIndex = data.readInt32LE(offset);
  offset += 4;
  let freeListHead = data.readInt32LE(offset);
  offset += 4;

  const freeListPointers = new Array<[number, number]>();

  for (let index = 0; offset < data.length && index < bumpIndex - 1; index++) {
    const registers = new Array<number>();
    for (let i = 0; i < 4; i++) {
      registers.push(data.readInt32LE(offset)); // skip padding
      offset += 4;
    }
    const [key] = keyDeserializer.deserialize(
      data.subarray(offset, offset + keySize)
    );
    offset += keySize;
    const [value] = valueDeserializer.deserialize(
      data.subarray(offset, offset + valueSize)
    );
    offset += valueSize;
    nodes.push([key, value]);
    freeListPointers.push([index, registers[0]]);
  }
  const freeNodes = new Set<number>();
  let indexToRemove = freeListHead - 1;

  let counter = 0;
  // If there's an infinite loop here, that means that the state is corrupted
  while (freeListHead < bumpIndex) {
    // We need to subtract 1 because the node allocator is 1-indexed
    const next = freeListPointers[freeListHead - 1];
    [indexToRemove, freeListHead] = next;
    freeNodes.add(indexToRemove);
    counter += 1;
    if (counter > bumpIndex) {
      throw new Error("Infinite loop detected");
    }
  }

  return [nodes, freeNodes];
}
