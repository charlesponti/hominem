import "dotenv/config";
import path from "node:path";

console.log("path is", path.resolve(__dirname, ".env"));

import "@total-typescript/ts-reset";
import { startServer } from "./server";

startServer();
