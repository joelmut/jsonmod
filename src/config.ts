import path from "path";
import {
  pipe,
  pickAll,
  evolve,
  is,
  trim,
  map,
  mergeDeepLeft,
  join,
  when,
} from "ramda";
import type { FileSpecs } from "./interfaces";
import { name } from "../package.json";

export let config = {
  library: name,
  command: "",
  file: {} as FileSpecs,
  backup: {} as FileSpecs,
  imports: [],
  restore: true,
  set(props) {
    const fields = pipe(
      pickAll(["file", "command", "restore", "backup", "imports"]),
      evolve({
        file: (e) => {
          const full = path.resolve(process.cwd(), e);
          return {
            ...path.parse(full),
            full,
          };
        },
        command: pipe(
          when(is(String), trim),
          when(is(Array), pipe(map(trim), join(" ")))
        ),
        backup: (e) => {
          if (!is(String)) return {};
          const { dir, name } = path.parse(props.file);
          const parsed = e.replace("{file}", name);
          const full = path.resolve(dir, parsed);
          return {
            ...path.parse(full),
            full,
          };
        },
        restore: (e) => !!props.backup && e,
        imports: when(is(Array), map(path.normalize)),
      })
    )(props);
    config = mergeDeepLeft(fields, config);
  },
};

export type Config = typeof config;
