import type { ParsedPath } from "path";

export interface FileSpecs extends ParsedPath {
  full: string;
}

export interface FileContent {
  raw: string;
  indentation: string | number;
  content: any;
}
