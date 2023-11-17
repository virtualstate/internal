import * as happening from "./happening";
import { Seed, SeedOptions } from "./type";
import { ok } from "../../is";
import {getConfig} from "../../config";

export type Seeds = Record<string, Seed>;

export interface SeedConfig {
  seeds?: Seeds;
}

export const DEFAULT_SEEDS: Seeds = {
  happening,
};

export const DEFAULT_SEED = "happening";

export async function seed(options?: SeedOptions) {
  const name = options?.seed || DEFAULT_SEED;
  const { seeds: givenSeeds } = getConfig();
  const seeds = {
    ...DEFAULT_SEEDS,
    ...givenSeeds
  }
  const value = seeds[name];
  if (!value) {
    console.warn(`Expected seed name ${name} to be available, seeds: ${Object.keys(seeds)}`);
    return;
  }
  await value.seed({
    ...options,
    seed: name,
  });
}

export async function autoSeed() {
  const { ENABLE_SEED } = process.env;
  if (!ENABLE_SEED?.length) return;
  if (ENABLE_SEED === "true" || ENABLE_SEED === "1") {
    return await seed();
  }
  return await seed({
    seed: ENABLE_SEED,
  });
}
