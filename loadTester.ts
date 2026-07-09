import { scanWifiDevices } from './electron/scanner.js';
import * as fs from 'fs';
import { LOAD_TEST_DELAY_MS } from './src/constants.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runLoadTest() {
  const TOTAL_RUNS = 1000;
  let successCount = 0;
  let failureCount = 0;
  const logFile = 'loadtest_failures.log';

  fs.writeFileSync(logFile, `Starting load test for ${TOTAL_RUNS} runs...\n`);

  console.log(`Starting discovery load test for ${TOTAL_RUNS} runs...`);
  console.log(`Success criteria: Exactly 2 devices found.`);
  console.log(`Failures will be logged to ${logFile}\n`);

  for (let i = 1; i <= TOTAL_RUNS; i++) {
    try {
      // scanWifiDevices defaults to port 5555
      const devices = await scanWifiDevices();
      
      if (devices.length === 2) {
        successCount++;
      } else {
        failureCount++;
        fs.appendFileSync(logFile, `[Run ${i}] Failed: Expected 2 devices, but found ${devices.length} (no error thrown).\n`);
      }

      // Use carriage return to continuously overwrite the same line
      process.stdout.write(`\rProgress: [${i}/${TOTAL_RUNS}] | Success: ${successCount} | Failures: ${failureCount} (Last run found: ${devices.length})`);
    } catch (error: any) {
      failureCount++;
      fs.appendFileSync(logFile, `[Run ${i}] Failed: Error thrown - ${error.message || error}\n`);
      process.stdout.write(`\rProgress: [${i}/${TOTAL_RUNS}] | Success: ${successCount} | Failures: ${failureCount} (Error: ${error.message})`);
    }

    // Delay between attempts
    await delay(LOAD_TEST_DELAY_MS);
  }

  console.log(`\n\n=== Load Test Complete ===`);
  console.log(`Total Runs: ${TOTAL_RUNS}`);
  console.log(`Successes : ${successCount} (${((successCount / TOTAL_RUNS) * 100).toFixed(2)}%)`);
  console.log(`Failures  : ${failureCount} (${((failureCount / TOTAL_RUNS) * 100).toFixed(2)}%)`);
}

runLoadTest().catch((err) => {
  console.error('\nFatal Error running load test:', err);
});
