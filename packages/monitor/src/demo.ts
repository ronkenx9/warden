import {
  createViolationProof,
  encodeSlashSubmission,
  encodeX402Payment,
  quoteMonitorReward,
  verifyProof,
  verifyX402Payment,
} from "./index.js";

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

const quote = quoteMonitorReward(
  "/violations/submit",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
);
const payment = {
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
} as const;
const paymentHeader = encodeX402Payment(payment);

console.log("WARDEN monitor demo: x402-style paid violation submission.");
console.log("HTTP 402 quote:");
console.log(quote);
console.log("x-payment header:");
console.log(paymentHeader);
console.log(`Payment satisfies quote: ${verifyX402Payment(paymentHeader, quote).payload.txHash === payment.payload.txHash}`);
console.log("Violation proof:");
console.log(proof);
console.log(`Proof verifies locally: ${verifyProof(proof)}`);
console.log("SlashPool.submitViolation payload:");
console.log(encodeSlashSubmission(proof));
