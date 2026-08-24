import type { Command } from "../types.js";
import { register } from "./register.js";
import { solved } from "./solved.js";
import { streak } from "./streak.js";
import { list } from "./list.js";
import { sync } from "./sync.js";

export const commands: Command[] = [register, solved, streak, list, sync];
