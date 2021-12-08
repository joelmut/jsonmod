import fs from "fs";
import type { Config } from "./config";

export async function backup(config: Config) {
  const {
    restore,
    file: { full: filepath },
    backup: { full: backuppath },
  } = config;

  if (!backuppath) return { restore: async () => {} };

  await fs.promises.copyFile(filepath, backuppath);

  return {
    async restore() {
      if (!restore || !fs.existsSync(backuppath)) return;

      await fs.promises.rm(filepath);
      await fs.promises.rename(backuppath, filepath);
    },
  };
}
