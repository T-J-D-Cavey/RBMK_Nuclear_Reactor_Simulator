// Lets Node run the game's TypeScript directly: resolves extensionless and "@/..." imports to .ts files.
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null
    if (specifier.startsWith("@/")) target = path.join(root, specifier.slice(2))
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:"))
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    if (target && !path.extname(target)) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        if (existsSync(target + ext)) return nextResolve(pathToFileURL(target + ext).href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
