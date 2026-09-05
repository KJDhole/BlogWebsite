# Signal Ledger V3 — Screenshot Critic Round 2

> Review mode: screenshot-only manual critic. The available harness has no independent subagent context; this document does not claim an independent-model review. Judgement was made from generated screenshots rather than implementation rationale.

## Visual-language diagnosis

Round 1 made the system calmer, but the page still had two inconsistencies: the homepage utility cluster behaved visually like a tiny nav, and the article system exposed a serious mobile layout regression that numeric overflow QA did not catch. This round therefore became partly a visual-stability review rather than a purely aesthetic refinement.

## 3 serious problems

1. **Homepage Search / Theme still reads as navigation chrome.** It is inside the content system, but its stacked treatment makes it look like a replacement navbar rather than a quiet utility record.
2. **Mobile article H1 collapsed into an extremely narrow column after a desktop grid override.** There was no global horizontal overflow, so the old QA falsely passed a visibly broken layout.
3. **The QA stress article rendered a duplicate document H1 inside the body.** The fixture source included its own Markdown H1 while the Astro article layout already rendered the title from frontmatter, making the screenshot unlike a normal published article.

## 3 strengths

1. Desktop Home now has a clear editorial hierarchy and the Signal Rail reads consistently from opening to Writing ledger.
2. Archive is strong: chronology, year register, month register, and entry rows form one coherent information instrument without card UI.
3. Search is visually restrained and content-first; it does not resemble a command-palette product overlay despite using dialog mechanics.

## 5 next actions

1. Collapse Search / Theme into one compact `TOOLS` record rather than separate stacked links.
2. Restore a one-column mobile article opening at <=760px and explicitly reset the title grid placement.
3. Add a browser regression gate that fails when the mobile article H1 width collapses below a reasonable fraction of the viewport.
4. Normalize only the generated QA copy of the saved stress source by removing its duplicate top-level document title; keep the saved fixture itself unchanged.
5. Tighten the article opening-to-body rhythm without adding decoration or another visual motif.

## Accepted changes

All five were accepted. The mobile layout issue was treated as a blocking visual regression rather than a cosmetic problem.

## Verification outcome

The new mobile geometry guard later measured the 390px article H1 at **350px width inside a 390px viewport**, proving the narrow-column regression was removed.

## Score

**6.5 / 10 after repair** — the design language is stable enough for a final critic pass, but article scale and context-rail legibility still need one more calibration round.
