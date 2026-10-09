/**
 * Every activity in the app, in IB syllabus order.
 * An activity with `load` is built; one without shows as "coming later".
 * Teachers turn activities on or off in public/config/settings.json.
 */
import type { ActivityMeta } from '../shared/activity/types';

export const SUBTOPICS: { code: string; unit: 1 | 2; title: string; hl?: boolean }[] = [
  { code: '1.1', unit: 1, title: 'What is economics?' },
  { code: '1.2', unit: 1, title: 'How do economists approach the world?' },
  { code: '2.1', unit: 2, title: 'Demand' },
  { code: '2.2', unit: 2, title: 'Supply' },
  { code: '2.3', unit: 2, title: 'Competitive market equilibrium' },
  { code: '2.4', unit: 2, title: 'Critique of the maximizing behaviour of consumers and producers', hl: true },
  { code: '2.5', unit: 2, title: 'Elasticities of demand' },
  { code: '2.6', unit: 2, title: 'Elasticity of supply' },
  { code: '2.7', unit: 2, title: 'Role of government in microeconomics' },
  { code: '2.8', unit: 2, title: 'Market failure: externalities and common pool or common access resources' },
  { code: '2.9', unit: 2, title: 'Market failure: public goods' },
  { code: '2.10', unit: 2, title: 'Market failure: asymmetric information', hl: true },
  { code: '2.11', unit: 2, title: 'Market failure: market power', hl: true },
  { code: '2.12', unit: 2, title: "The market's inability to achieve equity", hl: true },
];

export const UNITS = [
  { unit: 1 as const, title: 'Unit 1: Introduction to economics' },
  { unit: 2 as const, title: 'Unit 2: Microeconomics' },
];

export const ACTIVITIES: ActivityMeta[] = [
  {
    id: 'ppc-explorer', tag: '1.1 PPC', code: '1.1', unit: 1, title: 'PPC Explorer', style: 'Strategy missions',
    blurb: 'Run an island economy. Move workers between two goods, take on missions and react to events.',
    goal: { name: 'Island Planner', how: 'Level 1 of Four seasons: finish the year with every need met and at least 2 of 3 predictions right.', icon: 'island' },
    goals: [
      { name: 'Storm Planner', how: 'Level 2 of Four seasons: tighter needs and four events. Meet every need and get 3 of 4 predictions right.', icon: 'island' },
      { name: 'Island Council', how: 'Level 3 of Four seasons: spot the need that cannot be met, plan the rest, and get all 4 predictions right.', icon: 'island' },
    ],
    load: () => import('../activities/ppc-explorer'),
  },
  {
    id: 'island-economy', tag: '1.1 Scarcity and economic systems', code: '1.1', unit: 1, title: 'Castaway Council', style: 'Island story',
    blurb: 'Shipwrecked! Sort what washes ashore into the factors of production, then run a village three different ways.',
    goal: { name: 'Beachcomber', how: 'Level 1 of Castaway Council: sort 10 finds right first time and name the opportunity cost first time.', icon: 'hut' },
    goals: [
      { name: 'Village Builder', how: 'Level 2 of Castaway Council: answer what, how and for whom in three villages, 8 of 9 right first time.', icon: 'hut' },
      { name: 'System Detective', how: 'Level 3 of Castaway Council: name the economic system from clues, 5 of 6 with your first guess.', icon: 'hut' },
    ],
    load: () => import('../activities/island-economy'),
  },
  {
    id: 'circular-flow', tag: '1.1 Circular flow', code: '1.1', unit: 1, title: 'Money River', style: 'River builder',
    blurb: 'Build the economy as a river. Coins flow along your channels, drains leak money out and springs bring it back.',
    goal: { name: 'River Builder', how: 'Level 1 of Money River: build the two-sector flow with no more than 2 mistakes and spot 4 of 5 flows first time.', icon: 'flow' },
    goals: [
      { name: 'Drain Spotter', how: 'Level 2 of Money River: place the leakages and injections with no more than 2 mistakes and spot 5 of 6 first time.', icon: 'flow' },
      { name: 'Flow Forecaster', how: 'Level 3 of Money River: forecast national income from leakages and injections, 5 of 6 right first time.', icon: 'flow' },
    ],
    load: () => import('../activities/circular-flow'),
  },
  {
    id: 'positive-normative', tag: '1.2 How economists approach the world', code: '1.2', unit: 1, title: 'Fact Lab', style: 'Lab conveyor belt',
    blurb: 'Stamp statements positive or normative as they roll in, hunt for value words, then test ideas like an economist.',
    goal: { name: 'Fact Finder', how: 'Level 1 of Fact Lab: stamp 10 of 12 statements right first time.', icon: 'flask' },
    goals: [
      { name: 'Value Spotter', how: 'Level 2 of Fact Lab: find the value word in 7 of 8 statements right first time.', icon: 'flask' },
      { name: 'Lab Scientist', how: 'Level 3 of Fact Lab: order the method, make claims testable and build the timeline. Score 12 of 15.', icon: 'flask' },
    ],
    load: () => import('../activities/positive-normative'),
  },
  {
    id: 'market-shock', tag: '2.1 to 2.3 Demand, supply, equilibrium', code: '2.1', unit: 2, hl: 'part', title: 'Market Shock Simulator', style: 'Prediction game',
    blurb: 'Read a scenario, predict which curve shifts, then drag it and watch the market react.',
    goal: { name: 'Market Mover', how: 'Level 1 of Market Shock: play a full round of 8 scenarios and get at least 6 right.', icon: 'shift' },
    goals: [
      { name: 'Trap Spotter', how: 'Level 2 of Market Shock: trap scenarios and different shift sizes. Predict the curve and the new price and quantity.', icon: 'shift' },
      { name: 'Double Shock', how: 'Level 3 of Market Shock: two events at once. Say what you can and cannot tell about price and quantity.', icon: 'shift' },
    ],
    load: () => import('../activities/market-shock'),
  },
  {
    id: 'surplus-shader', tag: '2.3 Consumer and producer surplus', code: '2.3', unit: 2, hl: 'part', title: 'Surplus Shader', style: 'Price dial lab',
    blurb: 'Drag the price and watch consumer, producer and community surplus change. Find the welfare loss.',
    goal: { name: 'Surplus Painter', how: 'Level 1 of Paint the surplus: paint three areas with a score of at least 85%.', icon: 'brush' },
    goals: [
      { name: 'Shift Painter', how: 'Level 2 of Paint the surplus: a curve shifts first. Paint three areas with 85% or more.', icon: 'brush' },
      { name: 'Master Painter', how: 'Level 3 of Paint the surplus: community surplus and no markers. Paint three areas with 92% or more.', icon: 'brush' },
    ],
    load: () => import('../activities/surplus-shader'),
  },
  {
    id: 'bias-lab', tag: '2.4 Behavioural economics', code: '2.4', unit: 2, hl: 'all', title: 'Mind Tricks Lab', style: 'Experiment lab',
    blurb: 'Take part in quick experiments, watch the curtain reveal the trick, then hunt for biases and design nudges.',
    goal: { name: 'Test Subject', how: 'Level 1 of Mind Tricks Lab (HL): take part in 5 experiments and name the bias at work in 4 right first time.', icon: 'brain' },
    goals: [
      { name: 'Bias Hunter', how: 'Level 2 of Mind Tricks Lab (HL): spot the bias or limit to rational choice in 8 of 10 scenarios right first time.', icon: 'brain' },
      { name: 'Nudge Designer', how: 'Level 3 of Mind Tricks Lab (HL): design 4 nudges and match 5 firms to their objectives. Score 10 of 13 first-try points.', icon: 'brain' },
    ],
    load: () => import('../activities/bias-lab'),
  },
  {
    id: 'elasticity-cafe', tag: '2.5 PED', code: '2.5', unit: 2, title: 'The Elasticity Café', style: 'Business simulation',
    blurb: 'Run a café for a week. Set prices, read your sales and discover the hidden PED.',
    goal: { name: 'Café Tycoon', how: 'Level 1 of the café: in 3 of 4 weeks, grow revenue and say correctly whether demand is elastic or inelastic.', icon: 'cup' },
    goals: [
      { name: 'Sweet Spot Finder', how: 'Level 2 of the café: in 2 of 3 weeks, find the price that earns the most revenue.', icon: 'cup' },
      { name: 'Number Cruncher', how: 'Level 3 of the café: work out each PED yourself and find the best price in 2 of 3 weeks.', icon: 'cup' },
    ],
    load: () => import('../activities/elasticity-cafe'),
  },
  {
    id: 'ped-line', tag: '2.5 PED along a straight line', code: '2.5', unit: 2, hl: 'all', title: 'Same Slope, Different PED', style: 'Explorer',
    blurb: 'Slide along one demand curve and see PED and total revenue change.',
    goal: { name: 'Point Hunter', how: 'Level 1 of the mystery mode: find three hidden points without using Show me.', icon: 'target' },
    goals: [
      { name: 'Sharp Shooter', how: 'Level 2 of the mystery mode: harder clues and only 4 checks. Find three hidden points.', icon: 'target' },
      { name: 'Curve Master', how: 'Level 3 of the mystery mode: a new curve and only 3 checks. Find three hidden points.', icon: 'target' },
    ],
    load: () => import('../activities/ped-line'),
  },
  {
    id: 'hints-yed', tag: '2.5 PED determinants and YED', code: '2.5', unit: 2, hl: 'part', title: 'HINTS Market', style: 'Market stall',
    blurb: 'Sort goods at a market stall with HINTS, watch Engel curves draw as income rises, then calculate PED and YED.',
    goal: { name: 'Stall Sorter', how: 'Level 1 of HINTS Market: choose the HINTS determinant and the right crate for 8 of 10 goods, first time.', icon: 'basket' },
    goals: [
      { name: 'Income Explorer', how: 'Level 2 of HINTS Market: classify 5 of 6 goods as necessity, luxury or inferior from their Engel curves, first time.', icon: 'basket' },
      { name: 'Elasticity Analyst', how: 'Level 3 of HINTS Market: calculate and classify 5 of 6 PEDs and YEDs right first time (one round is HL).', icon: 'basket' },
    ],
    load: () => import('../activities/hints-yed'),
  },
  {
    id: 'supply-speed', tag: '2.6 PES', code: '2.6', unit: 2, hl: 'part', title: 'Supply Speed', style: 'Producer race',
    blurb: 'Race producers after a price rise. See how time, spare capacity and stock change PES, then measure it.',
    goal: { name: 'Supply Scout', how: 'Level 1 of Supply Speed: rank the producers and name the determinant, 8 of 10 right first time.', icon: 'gauge' },
    goals: [
      { name: 'Time Traveller', how: 'Level 2 of Supply Speed: choose what a producer can do in each time period, 10 of 12 right first time.', icon: 'gauge' },
      { name: 'PES Pro', how: 'Level 3 of Supply Speed (includes HL): calculate and classify PES, 5 of 6 rounds with no wrong try.', icon: 'gauge' },
    ],
    load: () => import('../activities/supply-speed'),
  },
  {
    id: 'gov-toolkit', tag: '2.7 Government intervention', code: '2.7', unit: 2, hl: 'part', title: 'Government Toolkit', style: "Minister's missions",
    blurb: 'Read a mission brief, choose a maximum price, minimum price, tax or subsidy, and see who wins and who loses.',
    goal: { name: 'Policy Maker', how: 'Level 1 of Government Toolkit: choose the right tool first time and meet the goal in 3 missions.', icon: 'pillars' },
    goals: [
      { name: 'Policy Predictor', how: 'Level 2 of Government Toolkit: also predict all four effects correctly in 3 missions.', icon: 'pillars' },
      { name: 'Treasury Analyst', how: 'Level 3 of Government Toolkit (HL): also calculate the values correctly in 3 missions.', icon: 'pillars' },
    ],
    load: () => import('../activities/gov-toolkit'),
  },
  {
    id: 'externality-fixer', tag: '2.8 Externalities', code: '2.8', unit: 2, hl: 'part', title: 'Smoke and Sunshine', style: 'Town fixer',
    blurb: 'Spot the spillovers in a smoky town, then choose and size the policy that clears the smoke and brings out the sun.',
    goal: { name: 'Spillover Spotter', how: 'Level 1 of Smoke and Sunshine: name the externality and its diagram gap for 8 of 10 scenarios right first time.', icon: 'factory' },
    goals: [
      { name: 'Town Fixer', how: 'Level 2 of Smoke and Sunshine: choose the right policy and set its size to reach Q*, 5 of 6 markets right first time.', icon: 'factory' },
      { name: 'Welfare Judge', how: 'Level 3 of Smoke and Sunshine (HL): calculate the welfare loss and judge each policy. Score 15 of 18 first-try points.', icon: 'factory' },
    ],
    load: () => import('../activities/externality-fixer'),
  },
  {
    id: 'fish-pond', tag: '2.8 Common pool resources', code: '2.8', unit: 2, title: 'Fish Pond', style: 'Shared pond',
    blurb: 'Fish a shared pond with three computer fishers, test the rules that can save it, then stop a cheat before the stock collapses.',
    goal: { name: 'Pond Keeper', how: 'Level 1 of Fish Pond: keep the pond alive for 8 seasons and answer 6 of 8 questions right first time.', icon: 'fish' },
    goals: [
      { name: 'Rule Maker', how: 'Level 2 of Fish Pond: predict and judge 5 rules for the pond. Score 12 of 15 first-try points.', icon: 'fish' },
      { name: 'Pond Guardian', how: 'Level 3 of Fish Pond: stop a cheating fisher. End 10 seasons with at least 50 fish and 5 of 6 answers right first time.', icon: 'fish' },
    ],
    load: () => import('../activities/fish-pond'),
  },
  {
    id: 'streetlight-fund', tag: '2.9 Public goods', code: '2.9', unit: 2, title: 'Streetlight Fund', style: 'Neighbourhood game',
    blurb: 'Light up a dark street. Sort the goods, try to fund the lamps with neighbours who free ride, then help the council pay with a tax.',
    goal: { name: 'Goods Sorter', how: 'Level 1 of Streetlight Fund: place goods in the rival and excludable grid, 8 of 10 right first time.', icon: 'lamp' },
    goals: [
      { name: 'Free Rider Detective', how: 'Level 2 of Streetlight Fund: play the six weeks of the street fund and answer 5 of 6 questions right first time.', icon: 'lamp' },
      { name: 'Town Planner', how: 'Level 3 of Streetlight Fund: name direct provision or contracting out, set the tax per household and judge it. Score 10 of 12 first-try points.', icon: 'lamp' },
    ],
    load: () => import('../activities/streetlight-fund'),
  },
  {
    id: 'used-car-lot', tag: '2.10 Asymmetric information', code: '2.10', unit: 2, hl: 'all', title: 'Used Car Lot', style: 'Car lot auction',
    blurb: 'Bid on cars you cannot see inside. Watch good cars drive away, bring them back with signals and rules, then spot moral hazard.',
    goal: { name: 'Smart Buyer', how: 'Level 1 of Used Car Lot (HL): find the buyers\' price and who drives away, 12 of 15 right first time.', icon: 'car' },
    goals: [
      { name: 'Signal Reader', how: 'Level 2 of Used Car Lot (HL): name the response to asymmetric information, 8 of 10 cases right first time.', icon: 'car' },
      { name: 'Risk Watcher', how: 'Level 3 of Used Car Lot (HL): spot adverse selection or moral hazard and choose the response. Score 13 of 16 first-try points.', icon: 'car' },
    ],
    load: () => import('../activities/used-car-lot'),
  },
  {
    id: 'monopoly-game', tag: '2.11 Market power', code: '2.11', unit: 2, hl: 'all', title: 'Rival Pricing', style: 'Coffee street duel',
    blurb: 'Two cafés, one street. Map market structures, find the profit where MC = MR, then fight a price war with a payoff matrix.',
    goal: { name: 'Market Mapper', how: 'Level 1 of Rival Pricing (HL): map the market structure for 8 of 10 markets right first time.', icon: 'crown' },
    goals: [
      { name: 'Profit Finder', how: 'Level 2 of Rival Pricing (HL): find the output, price, profit and kind of profit. Score 16 of 20 first-try points.', icon: 'crown' },
      { name: 'Game Theorist', how: 'Level 3 of Rival Pricing (HL): read the payoff matrix, play the price duel and judge collusion. Score 15 of 18 first-try points.', icon: 'crown' },
    ],
    load: () => import('../activities/monopoly-game'),
  },
  {
    id: 'fair-efficient', tag: '2.12 Equity', code: '2.12', unit: 2, hl: 'all', title: 'Fair or Efficient?', style: 'Balance scale',
    blurb: 'Tip the scale between efficiency and equity. Sort fair from equal, judge market outcomes, then follow the money to see why incomes are unequal.',
    goal: { name: 'Equity Spotter', how: 'Level 1 of Fair or Efficient?: sort 10 of 12 cases as equity or equality right first time.', icon: 'scale' },
    goals: [
      { name: 'Fair Judge', how: 'Level 2 of Fair or Efficient?: judge 6 of 8 market outcomes and their reasons with no wrong try.', icon: 'scale' },
      { name: 'Flow Detective', how: 'Level 3 of Fair or Efficient?: find the causes, calculate income shares and match the responses. Score 11 of 14.', icon: 'scale' },
    ],
    load: () => import('../activities/fair-efficient'),
  },
];

/**
 * Fixed list used inside progress codes. APPEND ONLY: never remove, rename or reorder,
 * or older progress codes will load into the wrong activities.
 */
export const PROGRESS_ID_TABLE: readonly string[] = [
  'ppc-explorer', 'island-economy', 'circular-flow', 'positive-normative', 'market-shock', 'surplus-shader',
  'bias-lab', 'elasticity-cafe', 'ped-line', 'hints-yed', 'supply-speed', 'gov-toolkit', 'externality-fixer',
  'fish-pond', 'streetlight-fund', 'used-car-lot', 'monopoly-game', 'fair-efficient',
  'diagram-doctor', 'command-terms', 'build-break-judge',
];

export function findActivity(id: string) {
  return ACTIVITIES.find((a) => a.id === id);
}
