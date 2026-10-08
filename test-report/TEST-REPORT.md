# Test report

Run on 2026-10-07.

**164 of 164 tests passed.**

Each line is one automated check. A checkmark (✓) means the app calculated the expected answer.

## tests/calc.test.ts

**Percentage change**

- ✓ rise from 4 to 5 is +25%
- ✓ fall from 5 to 4 is -20%
- ✓ no change is 0%
- ✓ refuses an original value of 0

**PED**

- ✓ price $4 to $5, quantity 100 to 80 gives PED -0.8 (inelastic)
- ✓ price $10 to $9, quantity 50 to 60 gives PED -2 (elastic)
- ✓ equal percentage changes give unitary PED
- ✓ no change in quantity is perfectly inelastic
- ✓ rearranged: PED -1.5 and a 10% price rise means a 15% fall in quantity
- ✓ elasticity refuses a zero change in the cause

**YED**

- ✓ income $50 000 to $55 000, quantity 10 to 9 gives YED -1 (inferior)
- ✓ YED 0.5 is a necessity
- ✓ YED 2 is a luxury

**PES**

- ✓ price $2 to $3, quantity supplied 100 to 200 gives PES 2
- ✓ price $2 to $3, quantity supplied 100 to 120 gives PES 0.4

**Total revenue**

- ✓ TR = P x Q
- ✓ splits a price rise into price and quantity effects
- ✓ splits a price cut without overlapping areas
- ✓ price and quantity effects always add up to the change in TR

**Straight-line curves**

- ✓ reads price and quantity off a line
- ✓ finds the equilibrium Q 40, P $6
- ✓ parallel lines have no intersection

**PED along a straight-line demand curve (HL)**

- ✓ is unitary at the midpoint
- ✓ is elastic above the midpoint
- ✓ is inelastic below the midpoint
- ✓ matches the percentage-change formula for a price change starting at that point
- ✓ total revenue is greatest at the midpoint, where PED = 1

**Consumer, producer and community surplus (2.3)**

- ✓ at equilibrium: CS $80, PS $80, community surplus $160, no welfare loss
- ✓ matches the IB triangle method
- ✓ price above equilibrium ($8): Q 20, CS $20, PS $100, welfare loss $40, excess supply 40
- ✓ price below equilibrium ($4): Q 20, CS $100, PS $20, welfare loss $40, excess demand 40
- ✓ community surplus is greatest at the equilibrium price
- ✓ community surplus plus welfare loss always equals the maximum

**Indirect taxes and subsidies (2.7 HL)**

- ✓ specific tax of $2: Q 30, consumers pay $7, producers keep $5
- ✓ tax burdens add up to government revenue
- ✓ ad valorem tax of 50%: Q 28, consumers pay $7.20, producers keep $4.80
- ✓ subsidy of $2: Q 50, consumers pay $5, producers receive $7
- ✓ subsidy spending = consumer gain + producer gain + welfare loss

**Price controls (2.7)**

- ✓ a $4 price ceiling creates a shortage of 40
- ✓ a ceiling above equilibrium does nothing
- ✓ an $8 price floor creates a surplus of 40, costing $320 to buy up

**PPC and opportunity cost (1.1)**

- ✓ opportunity cost per extra unit of X rises: 1, 2, 3, 4
- ✓ a straight-line PPC has constant opportunity cost
- ✓ reads the maximum Y between schedule points
- ✓ classifies points inside, on and outside the curve

**Rounding for display**

- ✓ rounds 2.675 to 2.68
- ✓ rounds to 1 decimal place

## tests/elasticity-cafe.test.ts

**Elasticity Café scenarios (content JSON)**

- ✓ has at least 3 scenarios, including a mystery one
- ✓ each price range lies wholly on one side of unitary PED (checked at both ends)
- ✓ start prices are inside the range and on the $0.25 grid
- ✓ cups sold are whole numbers that fit on the diagram
- ✓ ANY price change inside the range gives a PED on the expected side of 1 (from whole cups)
- ✓ total revenue always moves the way PED predicts

**snapPrice**

- ✓ rounds to $0.25 and clamps to the range

**salesLog**

- ✓ day 1 has no changes
- ✓ uses the previous day as the original value (IB formula)
- ✓ a day with no price change has no PED but a change in TR of 0
- ✓ a price cut: price pull is a loss, quantity pull is a gain
- ✓ the PED shown agrees with the % changes shown (from whole cups)
- ✓ inelastic lodge: a price rise raises revenue

**summarize and the end-of-week decision**

- ✓ summarises a week of latte sales
- ✓ summarises a week of lodge sales
- ✓ has no data verdict when the price never changes
- ✓ the best move for revenue

**display helpers**

- ✓ formats money, % and PED without dashes
- ✓ fills templates

**Check it answers (hand-checked)**

- ✓ q1: $4 to $5, 200 to 170 gives PED -0.6
- ✓ q7: new TR after a 10% rise with PED -1.5 is $1,402.50
- ✓ every check question has the required parts

## tests/market-shock.test.ts

**Market Shock: the base market**

- ✓ demand and supply cross at $5 and 50 bags

**Market Shock: checking predictions**

- ✓ right answer
- ✓ right curve, wrong direction
- ✓ wrong curve
- ✓ said no shift when a curve shifts
- ✓ said shift on a trap card
- ✓ trap card answered correctly
- ✓ parses and builds shift codes

**Market Shock: dragging**

- ✓ small drags do not count yet
- ✓ a drag of 6 bags or more has a direction
- ✓ snaps to a 2-bag grid and stays within 30 bags

**Market Shock: new equilibrium after each shift**

- ✓ D-right: new equilibrium 60 bags at $6, matching theory
- ✓ D-left: new equilibrium 40 bags at $4, matching theory
- ✓ S-right: new equilibrium 60 bags at $4, matching theory
- ✓ S-left: new equilibrium 40 bags at $6, matching theory
- ✓ expected outcomes from theory
- ✓ a shift leaves the other curve unchanged
- ✓ summary in words

**Market Shock: gap at the old price (price mechanism)**

- ✓ demand right 20: shortage of 20 at $5
- ✓ supply right 20: surplus of 20 at $5
- ✓ no gap at equilibrium
- ✓ the price moves from P1 to P2 and stops there
- ✓ the gap closes as the price reaches the new equilibrium

**Market Shock: drawing segments**

- ✓ base demand runs from $9 to $1
- ✓ a curve shifted left is cut at the price axis
- ✓ a curve shifted right is cut at the right edge

**Market Shock: dealing the deck**

- ✓ normal mode deals shift cards only
- ✓ trap mode alternates trap and shift cards
- ✓ a new seed rotates the deck

**Market Shock: content**

- ✓ has 14 to 18 shift cards and every answer is a real shift
- ✓ covers every non-price determinant in the guide
- ✓ trap cards all have the answer "no shift"

## tests/mastery.test.ts

**Suggested proficiency level (honest thresholds)**

- ✓ no suggestion with fewer than 3 questions
- ✓ a perfect score on easy core questions alone is only Proficient, never Exemplary
- ✓ Exemplary needs all apply questions right without hints
- ✓ one apply question is not enough evidence for Exemplary
- ✓ lots of hints keep a high score at Proficient 1
- ✓ maps low scores to Beginning and Developing

## tests/ped-line.test.ts

**Same Slope, Different PED: bike rental model**

- ✓ snaps prices to $0.50 and keeps them between $1 and $19
- ✓ maps a dragged point to the nearest price on the line
- ✓ PED at a point uses slope x P/Q: same slope, different PED
- ✓ finds the zone: upper half elastic, midpoint unitary, lower half inelastic
- ✓ the TR curve rises to a peak of $1000 at Q = 100, then falls
- ✓ the IB formula check for a $1 cut matches PED at the point
- ✓ a unitary PED curve has the same spending P x Q at every point
- ✓ the schedule lists P, Q and TR every $2
- ✓ checks the discovery challenges

## tests/ppc-model.test.ts

**PPC Explorer island model**

- ✓ the island PPC runs from 55 timber to 55 fish
- ✓ shows increasing opportunity cost: each extra fish costs more timber
- ✓ constant mode gives a straight-line PPC
- ✓ unemployed workers put the economy inside the PPC
- ✓ full employment puts the economy on the PPC
- ✓ better fishing technology lets the economy reach points outside the old PPC

## tests/progress.test.ts

**Progress code: round trip**

- ✓ a code made on one device restores identical progress on another
- ✓ round-trips random progress 500 times
- ✓ keeps codes short: 5 finished activities fit in under 60 characters
- ✓ forgives lower case, spaces, and O / I / L look-alikes
- ✓ an empty progress record makes a valid code

**Progress code: mistakes are rejected safely**

- ✓ rejects every single mistyped character
- ✓ rejects two neighbouring characters swapped
- ✓ rejects a missing or extra character
- ✓ gives a friendly reason, never an error
- ✓ random garbage never loads

**Progress code: versions**

- ✓ a code from a newer app version gives a clear message
- ✓ codes still load after new activities are added to the end of the id table
- ✓ base32 round-trips bytes

**Loading a code on a device that already has progress**

- ✓ lists the activities that differ
- ✓ replace: the device ends up with exactly the code's progress
- ✓ keep newer: each activity keeps whichever side changed more recently

**Local storage**

- ✓ reset clears all progress
- ✓ ignores damaged saved data instead of crashing
- ✓ works when the browser blocks storage

## tests/surplus-shader.test.ts

**Surplus Shader ski hill market**

- ✓ equilibrium is 400 passes at $50
- ✓ every shifted market has a whole-dollar equilibrium
- ✓ snaps the price to whole dollars between the two price-axis intercepts

**Surplus shapes match welfareAtPrice (shoelace formula)**

- ✓ at $31
- ✓ at $38
- ✓ at $45
- ✓ at $49.5
- ✓ at $50
- ✓ at $50.5
- ✓ at $60
- ✓ at $74
- ✓ at $89
- ✓ also in shifted markets
- ✓ at the supply intercept nothing is traded and the whole community surplus is lost

**IB working, hand-checked**

- ✓ at equilibrium: CS = ½ × 400 × 40 = 8000, PS = ½ × 400 × 20 = 4000, no welfare loss
- ✓ at $60 (above): Q = 300; CS = ½ × 300 × 30 = 4500; PS = 15 × 300 + ½ × 300 × 15 = 6750; WL = ½ × 100 × 15 = 750
- ✓ at $38 (below): Qs = 160; CS = 36 × 160 + ½ × 160 × 16 = 7040; PS = ½ × 160 × 8 = 640; WL = ½ × 240 × 36 = 4320
- ✓ at $74 (above): Qd = 160; CS = ½ × 160 × 16 = 1280; PS = 36 × 160 + ½ × 160 × 8 = 6400

**Calculate it: checking answers and spotting slips**

- ✓ accepts the right answer, within $1
- ✓ CS at $74: forgot ½ (2560), height from 0 (½ × 160 × 90 = 7200), used equilibrium (8000), used Qs as base (½ × 880 × 16 = 7040)
- ✓ CS at $38: one big triangle (½ × 160 × 52 = 4160), rectangle only (5760), triangle only (1280), forgot ½ (8320)
- ✓ welfare loss at $38: forgot ½ (8640), height to Pe (½ × 240 × 12 = 1440), height from Pe to demand (½ × 240 × 24 = 2880)
- ✓ a slip is never reported when it gives the right answer
