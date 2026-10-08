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
    load: () => import('../activities/ppc-explorer'),
  },
  { id: 'island-economy', tag: '1.1 Economic systems', code: '1.1', unit: 1, title: 'Island Economy', style: 'Story choices', blurb: 'Answer what, how and for whom under three economic systems.' },
  { id: 'circular-flow', tag: '1.1 Circular flow', code: '1.1', unit: 1, title: 'Circular Flow Builder', style: 'Build and connect', blurb: 'Connect households, firms and more. Add leakages and injections.' },
  { id: 'positive-normative', tag: '1.2 Positive and normative', code: '1.2', unit: 1, title: 'Positive or Normative?', style: 'Quick sort', blurb: 'Sort statements, then rewrite a normative claim as a testable one.' },
  {
    id: 'market-shock', tag: '2.1 to 2.3 Demand, supply, equilibrium', code: '2.1', unit: 2, hl: 'part', title: 'Market Shock Simulator', style: 'Prediction card game',
    blurb: 'Draw an event card, predict which curve shifts, then drag it and watch the market react.',
    load: () => import('../activities/market-shock'),
  },
  {
    id: 'surplus-shader', tag: '2.3 Consumer and producer surplus', code: '2.3', unit: 2, hl: 'part', title: 'Surplus Shader', style: 'Price dial lab',
    blurb: 'Drag the price and watch consumer, producer and community surplus change. Find the welfare loss.',
    load: () => import('../activities/surplus-shader'),
  },
  { id: 'bias-lab', tag: '2.4 Behavioural economics', code: '2.4', unit: 2, hl: 'all', title: 'Bias Lab', style: 'Experiments', blurb: 'Take part in short experiments on anchoring, framing and defaults, then design a nudge.' },
  {
    id: 'elasticity-cafe', tag: '2.5 PED', code: '2.5', unit: 2, title: 'The Elasticity Café', style: 'Business simulation',
    blurb: 'Run a café for a week. Set prices, read your sales and discover the hidden PED.',
    load: () => import('../activities/elasticity-cafe'),
  },
  {
    id: 'ped-line', tag: '2.5 PED along a straight line', code: '2.5', unit: 2, hl: 'all', title: 'Same Slope, Different PED', style: 'Explorer',
    blurb: 'Slide along one demand curve and see PED and total revenue change.',
    load: () => import('../activities/ped-line'),
  },
  { id: 'hints-yed', tag: '2.5 PED determinants and YED', code: '2.5', unit: 2, hl: 'part', title: 'HINTS Sorter and YED Lab', style: 'Sort and explore', blurb: 'Sort goods by PED using HINTS, then explore Engel curves.' },
  { id: 'supply-speed', tag: '2.6 PES', code: '2.6', unit: 2, hl: 'part', title: 'Supply Speed', style: 'Producer game', blurb: 'React to a price rise as a producer. See how time and capacity change PES.' },
  { id: 'gov-toolkit', tag: '2.7 Government intervention', code: '2.7', unit: 2, hl: 'part', title: 'Government Toolkit', style: 'Policy sandbox', blurb: 'Apply ceilings, floors, taxes and subsidies. See who wins and who loses.' },
  { id: 'externality-fixer', tag: '2.8 Externalities', code: '2.8', unit: 2, hl: 'part', title: 'Externality Fixer', style: 'Policy puzzle', blurb: 'Choose a policy that moves output to the social optimum.' },
  { id: 'fish-pond', tag: '2.8 Common pool resources', code: '2.8', unit: 2, title: 'Fish Pond', style: 'Multiplayer simulation', blurb: 'Fish a shared pond with computer players. Can the stock survive?' },
  { id: 'streetlight-fund', tag: '2.9 Public goods', code: '2.9', unit: 2, title: 'Streetlight Fund', style: 'Contribution game', blurb: 'Fund a public good with computer players who may free ride.' },
  { id: 'used-car-lot', tag: '2.10 Asymmetric information', code: '2.10', unit: 2, hl: 'all', title: 'Used Car Lot', style: 'Trading game', blurb: 'Buy cars without seeing their quality. Watch good cars leave the market.' },
  { id: 'monopoly-game', tag: '2.11 Market power', code: '2.11', unit: 2, hl: 'all', title: 'Monopoly and Game Theory', style: 'Rival pricing game', blurb: 'Find MC = MR, then play a pricing game against a rival firm.' },
  { id: 'fair-efficient', tag: '2.12 Equity', code: '2.12', unit: 2, hl: 'all', title: 'Fair or Efficient?', style: 'Judgement cards', blurb: 'Judge market outcomes as equitable, efficient, both or neither.' },
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
