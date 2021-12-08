import { concat as rconcat } from "ramda";
import fs from "fs";
import type { FileContent } from "./interfaces";
import { Config } from "./config";

export function spacing(json: string, defaults: number = 2) {
  const [, spacing] = json.match(/\{[\n\r]+(\s+|(\t)+)+"[a-z0-9]/i);
  return spacing || defaults;
}

export function concat(k, l, r) {
  return Array.isArray(l) ? rconcat(l, r) : r;
}

export async function read(filepath: string): Promise<FileContent> {
  const raw = await fs.promises.readFile(filepath, "utf-8");
  const indentation = spacing(raw);
  const content = JSON.parse(raw);

  return {
    raw,
    indentation,
    content,
  };
}

export async function save(
  config: Config,
  json: any,
  indentation: string | number = 2
) {
  return fs.promises.writeFile(
    config.file.full,
    JSON.stringify(json, null, indentation)
  );
}
