import { seed as staticSeed } from "./static-initial";

export async function seed() {
  await staticSeed();
}
