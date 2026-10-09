// Prints a second-by-second table for a named scenario, for tuning by eye.
// Usage: node --run sim:trace -- <scenario> [every]
import { scenarios } from "./scenarios"
import { formatTrace } from "./harness"

const [name, every = "1"] = process.argv.slice(2)
const scenario = scenarios[name]
if (!scenario) {
  console.log(`Unknown scenario "${name ?? ""}". Available:\n  ${Object.keys(scenarios).join("\n  ")}`)
  process.exit(1)
}
console.log(`# ${name}: ${scenario.description}\n`)
console.log(formatTrace(scenario.run(), Number(every)))
