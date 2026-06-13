import assert from "node:assert/strict";
import { encodeAbiParameters, encodeEventTopics, parseAbiParameters, parseAbiItem, type Hex } from "viem";
import {
  createViolationProof,
  encodeX402Payment,
  quoteMonitorReward,
  verifyProof,
  verifyX402Payment,
  type X402PaymentPayload,
} from "./index.js";
import { paymentReceiptHasMatchingTransfer } from "./live-submit.js";

const quote = quoteMonitorReward(
  "/violations",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
);

const payment: X402PaymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: quote.accepts[0].network,
  payload: {
    asset: quote.accepts[0].asset,
    amount: quote.accepts[0].amount,
    payTo: quote.accepts[0].payTo,
    resource: quote.accepts[0].resource,
    txHash: "0x69c8cc10152fa6132d6ee3b4d03fe1aa7a1134b595c5bd192a6ddfc01a681d11",
  },
};

const encoded = encodeX402Payment(payment);
assert.equal(verifyX402Payment(encoded, quote).payload.txHash, payment.payload.txHash);

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const matchingPaymentLog = {
  address: payment.payload.asset,
  topics: encodeEventTopics({
    abi: [transferEvent],
    eventName: "Transfer",
    args: {
      from: "0x4444444444444444444444444444444444444444",
      to: payment.payload.payTo,
    },
  }) as readonly Hex[],
  data: encodeAbiParameters(parseAbiParameters("uint256"), [BigInt(payment.payload.amount)]),
};
assert.equal(paymentReceiptHasMatchingTransfer(payment, [matchingPaymentLog]), true);

const underpaidLog = {
  ...matchingPaymentLog,
  data: encodeAbiParameters(parseAbiParameters("uint256"), [BigInt(payment.payload.amount) - 1n]),
};
assert.equal(paymentReceiptHasMatchingTransfer(payment, [underpaidLog]), false);

const mismatchedPayment = encodeX402Payment({
  ...payment,
  payload: { ...payment.payload, amount: "2" },
});
assert.throws(() => verifyX402Payment(mismatchedPayment, quote), /does not satisfy quote/);
assert.throws(() => verifyX402Payment("not-json-or-base64", quote), /Unexpected token|invalid/i);

const proof = createViolationProof({
  vault: "0x1111111111111111111111111111111111113001",
  owner: "0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7",
  agent: "0x3507A251bbd388eb31C630627E2DdFE10Eb5aD6F",
  beneficiary: "0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7",
  slashAmount: 100_000_000n,
  reason: "TradingWindowClosed",
  blockNumber: 12_345n,
  simulationHash: "0x8ee3ccb23fcd05185b901a6c029b2f16a601514a89f8a7a4e68675bcb017a5c5",
});
assert.equal(verifyProof(proof), true);

console.log("WARDEN monitor market tests passed");
