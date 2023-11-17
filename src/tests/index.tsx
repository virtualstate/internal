/* c8 ignore start */

import * as dotenv from "dotenv";

dotenv.config();

import why from "why-is-node-still-running";
import {isRedis} from "../data";

declare var Bun: unknown;

const {isRedisMemory, listProducts, seed, startRedisMemory, stopData, stopRedisMemory} = await import("../data");

try {
  if (isRedisMemory()) {
    await startRedisMemory()
  }

  await seed();

  const products = await listProducts();

  if (products.length < 3 || !process.env.IS_LOCAL) {
    await import("./client");
    console.log("after client");
    await import("./remote");
    console.log("after remote");
  }
  await import("./scenarios");
  await import("./storage");
  await import("./schedule");
  await import("./cache");

  // Redis is a stable store... need to replace the default local
  // store for workers, but that is a later task
  if (isRedis() && typeof Bun === "undefined") {
    await import("./worker");
  }

  // Ensure any data clients are closed
  await stopData();

  if (isRedisMemory()) {
    await stopRedisMemory();
  }

  console.log("Tests successful");

} catch (error) {
  console.error(error);
  if (typeof process !== "undefined") {
    process.exit(1);
  }
  throw error;
}

if (process.env.TESTS_REPORT_HANDLES) {
  why.whyIsNodeStillRunning();
}

// Force closing, but reporting of handles above
process.exit(0);

export default 1;
