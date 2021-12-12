#!/usr/bin/env node

import { spawn } from "child_process";
import { Command } from "commander";
import {
  __,
  defaultTo,
  mergeDeepRight,
  omit,
  pipe,
  isEmpty,
  prop,
  isNil,
} from "ramda";
import { backup } from "./backup";
import { compile } from "./compile";
import { read, save } from "./utils";
import { config } from "./config";

const program = new Command();

program
  .name(config.library.name)
  .version(config.library.version, "-v, --version")
  .requiredOption("-f, --file <path>", "path to the .json file to process.")
  .option(
    "-c, --command <command...>",
    "command to execute in the 'file' folder."
  )
  .option(
    "-b, --backup <name>",
    "name of the backup file.",
    "{file}.backup.json"
  )
  .option(
    "-i, --imports <paths...>",
    "paths to other .json files to merge into."
  )
  .option("-nb, --no-backup", "process the 'file' without making a backup.")
  .option(
    "-nr, --no-restore",
    "process the 'file' without restore it from backup.",
    false
  )
  .usage('--file <file-path> --command "<command>"')
  .addHelpText(
    "after",
    `
    Examples:
      $ ${config.library.name} --file package.json
      $ ${config.library.name} --file package.json --command "yarn install"
      $ ${config.library.name} --file package.json --command "npm install"
    `
  )
  .action(run)
  .parse(process.argv);

async function run(props: any) {
  const file = await read(props.file);

  pipe(
    prop(config.library.name),
    defaultTo({}),
    omit(["file"]),
    mergeDeepRight(props),
    config.set
  )(file.content?.config);

  const { restore } = await backup(config);

  const json = compile(config, file);

  await save(config, json, file.indentation);

  if (!isNil(config.command) && !isEmpty(config.command)) {
    const child = spawn("cmd", ["/C", config.command], {
      stdio: "inherit",
      cwd: config.file.dir,
    });

    child.on("close", async () => await restore());
    return;
  }

  await restore();
}
