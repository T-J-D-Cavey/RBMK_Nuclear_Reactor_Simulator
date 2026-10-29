// The control-room briefing (lib/tutorial): its order in every mode, and where the guide goes. Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { GUIDE_EDGE, planGuide, tutorialSteps } from "../../lib/tutorial"

test("briefing: every mode opens with the welcome and ends with Begin; each reading comes before the control that moves it", () => {
  for (const mode of ["easy", "hard", "safety_test", "free"] as const) {
    const ids = tutorialSteps(mode).map((s) => s.id)
    assert.equal(ids[0], "welcome", mode)
    assert.equal(ids.at(-1), "begin", mode)
    for (const [reading, control] of [["radioactivity", "rods"], ["temperature", "pumps"], ["steam", "turbine"], ["time", "xenon"]]) {
      assert.equal(ids.indexOf(control), ids.indexOf(reading) + 1, `${mode}: ${reading} then ${control}`)
    }
    assert.equal(new Set(ids).size, ids.length, `${mode}: no step twice`)
  }
  assert.equal(tutorialSteps("easy").length, 16)
  // Free mode has no target, so its performance never moves and the step is left out
  assert.ok(!tutorialSteps("free").some((s) => s.id === "performance"))
})

const phone = { width: 390, height: 844, scrollY: 0, maxScroll: 1800 }
const desk = { width: 1440, height: 900, scrollY: 0, maxScroll: 400 }

test("briefing: on a phone the guide docks at the bottom and the page scrolls the subject clear of it", () => {
  const guide = { width: 390, height: 300 }
  // Already clear: no scroll
  assert.deepEqual(planGuide({ top: 200, bottom: 300, left: 20, right: 140 }, phone, guide, true), { scrollY: 0, dock: "bottom", corner: "left" })
  // Further down the page: scrolled up just far enough to clear the guide
  const low = planGuide({ top: 1000, bottom: 1300, left: 6, right: 384 }, phone, guide, true)
  assert.equal(low.dock, "bottom")
  assert.ok(1300 - low.scrollY <= phone.height - guide.height - GUIDE_EDGE && 1000 - low.scrollY >= 0, `scroll ${low.scrollY}`)
  // At the very end of the page it can't scroll far enough, so the guide moves to the top
  const end = planGuide({ top: 2500, bottom: 2640, left: 6, right: 384 }, phone, guide, true)
  assert.equal(end.scrollY, phone.maxScroll)
  assert.equal(end.dock, "top")
})

test("briefing: on a wide screen the guide takes the bottom corner opposite the subject, or the top edge if it is low", () => {
  const guide = { width: 540, height: 350 }
  // A reading on the left of the panel: the guide goes bottom right, and nothing scrolls
  assert.deepEqual(planGuide({ top: 200, bottom: 290, left: 490, right: 640 }, desk, guide, false), { scrollY: 0, dock: "bottom", corner: "right" })
  // On the right of the panel: bottom left
  assert.equal(planGuide({ top: 200, bottom: 290, left: 780, right: 930 }, desk, guide, false).corner, "left")
  // The alarm monitor and shift log across the bottom of the screen: the guide moves to the top rather than scrolling far
  const wide = planGuide({ top: 494, bottom: 894, left: 18, right: 1422 }, desk, guide, false)
  assert.equal(wide.dock, "top")
  assert.ok(wide.scrollY <= 20, `scroll ${wide.scrollY}`)
})
