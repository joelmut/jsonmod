import path from "path";
import {
  pipe,
  mergeDeepWithKey,
  set,
  lensPath,
  clone,
  path as rpath,
  isEmpty,
  is,
  isNil,
  not,
  trim,
  prop,
} from "ramda";

import type { Config } from "./config";
import type { FileContent } from "./interfaces";
import { concat } from "./utils";

export function compile(config: Config, file: FileContent) {
  const compiled = pipe(
    prop("imports"),
    imports(config),
    mergeDeepWithKey(concat, file.content),
    convert
  )(config);

  return compiled;
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
    let imports = value.config?.[config.library]?.imports;

    if (imports) {
      imports = imports
        .map((e) => {
          const folder = path.dirname(filepath);
          const fullpath = path.resolve(folder, e);
          return path.relative(config.file.dir, fullpath);
        })
        .filter((e) => !memory.has(path.resolve(config.file.dir, e)));
      value.config[config.library].imports = imports;
    }

    const innerPaths = paths(config, imports, memory);

    return [value, ...innerPaths];
  });
}

export function convert(value: any, keyPath = [], result = clone(value)) {
  if (isNil(value) || isEmpty(value)) return value;

  if (is(String, value)) {
    return value
      .split("|")
      .map((val) => transform(result, val))
      .find(pipe(isNil, not));
  }

  if (is(Array, value)) {
    return value.map((e, i) => convert(e, keyPath, result));
  }

  if (is(Object, value)) {
    const isArray = is(Array, rpath(keyPath, result));

    const obj = {};

    for (const [key, val] of Object.entries(value)) {
      const fullkey = [...keyPath, key];
      const converted = convert(val, fullkey, result);

      if (isArray) {
        obj[key] = converted;
      } else {
        result = set(lensPath(fullkey), converted, result);
      }
    }

    if (!isEmpty(obj)) return obj;

    return rpath(keyPath)(result);
  }

  return value;
}

export function transform(source: any, val: any) {
  if (isNil(val) || isEmpty(val)) return val;

  const [key, value] = val.split(":").map(trim);
  const result = {
    env: () => process.env[value],
    ref: () => rpath(value.split("."), source),
    default: () => key,
  }[key];

  return result ? result() : key;
}
