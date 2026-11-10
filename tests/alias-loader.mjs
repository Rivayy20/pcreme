import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const srcDir = path.resolve(process.cwd(), "src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    let resolvedPath = path.join(srcDir, subpath);
    if (!fs.existsSync(resolvedPath)) {
      if (fs.existsSync(resolvedPath + ".ts")) {
        resolvedPath += ".ts";
      } else if (fs.existsSync(resolvedPath + ".tsx")) {
        resolvedPath += ".tsx";
      } else if (fs.existsSync(path.join(resolvedPath, "index.ts"))) {
        resolvedPath = path.join(resolvedPath, "index.ts");
      }
    }
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }
  return nextResolve(specifier, context);
}
