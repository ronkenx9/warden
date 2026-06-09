import { createViolationProof, encodeSlashSubmission, quoteMonitorReward, verifyProof } from "./index.js";

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
  "0x1111111111111111111111111111111111111002",
  "0x1111111111111111111111111111111114001",
);

console.log("WARDEN monitor demo: x402-style paid violation submission.");
console.log("HTTP 402 quote:");
console.log(quote);
console.log("Violation proof:");
console.log(proof);
console.log(`Proof verifies locally: ${verifyProof(proof)}`);
console.log("SlashPool.submitViolation payload:");
console.log(encodeSlashSubmission(proof));
