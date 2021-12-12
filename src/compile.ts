import path from "path";
import { search } from "jmespath";
import {
  pipe,
  mergeDeepWithKey,
  clone,
  isEmpty,
  is,
  isNil,
  not,
  trim,
  prop,
  evolve,
  map,
} from "ramda";

import type { Config } from "./config";
import type { FileContent } from "./interfaces";
import { concat } from "./utils";

export function compile(config: Config, file: FileContent) {
  const compiled = pipe(
    prop("imports"),
    imports(config),
    mergeDeepWithKey(concat, file.content),
    convert,
    evolve({
      config: {
        [config.library.name]: {
          imports: map(path.normalize),
        },
      },
    })
  )(config);

  return compiled;
}

export function convert(value: any) {
  const result = clone(value);

  const inner = (acc: any) => {
    if (isNil(acc) || isEmpty(acc)) return acc;

    if (is(String, acc)) {
      acc = acc
        .split("||")
        .map((e) => transform(result, e))
        .find(pipe(isNil, not));
    }

    if (is(Array, acc)) {
      for (let i = 0; i < acc.length; i++) {
        acc[i] = inner(acc[i]);
      }
    }

    if (is(Object, acc)) {
      for (const key of Object.keys(acc)) {
        acc[key] = inner(acc[key]);
      }
    }

    return acc;
  };

  return inner(result);
}

export function transform(source: any, val: any) {
  if (isNil(val) || isEmpty(val)) return val;

  const [key, value] = val.split(":").map(trim);
  const result = {
    env: () => process.env[value],
    ref: () => search(source, value),
    default: () => key,
  }[key];

  return result ? result() : key;
}

export function imports(config: Config) {
  return (collection: string[]) => {
    return paths(config, collection)
      .filter((e) => e)
      .reduce(mergeDeepWithKey(concat), {});
  };
}

export function paths(
  config: Config,
  collection: string[],
  memory = new Set()
) {
  if (isNil(collection) || isEmpty(collection)) return [];

  return collection.flatMap((filename) => {
    const filepath = path.resolve(config.file.dir, filename);

    if (memory.has(filepath)) return [];
    memory.add(filepath);

    const value = require(filepath);
    let imports = value.config?.[config.library.name]?.imports;

    if (imports) {
      imports = imports
        .map((e) => {
          const folder = path.dirname(filepath);
          const fullpath = path.resolve(folder, e);
          return path.relative(config.file.dir, fullpath);
        })
        .filter((e) => !memory.has(path.resolve(config.file.dir, e)));
      value.config[config.library.name].imports = imports;
    }

    const innerPaths = paths(config, imports, memory);

    return [value, ...innerPaths];
  });
}
