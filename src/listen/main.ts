#!/usr/bin/env node
import "../references";

import * as dotenv from "dotenv";

dotenv.config();

import "../tracing";

await import("../scheduled");

const { listen } = await import("./listen");

export const close = await listen();