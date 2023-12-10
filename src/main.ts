#!/usr/bin/env node
import "./references";

import * as dotenv from "dotenv";

dotenv.config();

const { start } = await import("./start");

export const stop = await start();