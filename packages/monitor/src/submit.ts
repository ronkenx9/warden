import { submitViolationFromEnv } from "./live-submit.js";

submitViolationFromEnv()
  .then((result) => {
    console.log("WARDEN monitor submitted violation");
    console.log(`Chain: ${result.chainId}`);
    console.log(`Monitor: ${result.monitor}`);
    console.log(`Agent identity id: ${result.agentId}`);
    console.log(`Proof: ${result.proofHash}`);
    console.log(`Slash amount: ${result.slashAmount}`);
    console.log(`Tx: ${result.tx}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
