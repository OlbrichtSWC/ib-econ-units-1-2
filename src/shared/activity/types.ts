/**
 * The activity framework: every activity has the same four steps.
 *   1. Learn it   short explanation with a diagram
 *   2. Try it     the game or simulation
 *   3. Check it   questions with a hint ladder and feedback that explains why
 *   4. Self-rate  the student rates themselves on the proficiency scale
 */
import type { ComponentType } from 'preact';
import type { GoalStamp } from '../fun/stampDefs';

export interface TableData {
  caption?: string;
  headers: string[];
  rows: (string | number)[][];
}

interface QuestionBase {
  id: string;
  /** "core" checks understanding; "apply" uses it in a new situation. Exemplary needs apply questions. */
  level: 'core' | 'apply';
  /** Markdown. */
  prompt: string;
  /** Optional schedule or data table shown with the question. */
  table?: TableData;
  /** Hint 1 nudges, hint 2 narrows it down. */
  hints: [string, string];
  /** Worked example of a similar problem (shown after both hints). */
  worked: string;
  /** Why the right answer is right (shown once answered). */
  explanation: string;
  hl?: boolean;
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  /** Each option has its own feedback, so a wrong choice explains the mistake. */
  options: { text: string; correct?: boolean; feedback: string }[];
}

export interface NumberQuestion extends QuestionBase {
  type: 'number';
  answer: number;
  /** Accepted distance from the answer (default 0.01). */
  tolerance?: number;
  /** Shown before the box, for example "$". */
  prefix?: string;
  /** Shown after the box, for example "%" or "units". */
  suffix?: string;
  /** Common wrong answers with feedback that explains the slip. */
  mistakes?: { value: number; feedback: string }[];
}

export type Question = ChoiceQuestion | NumberQuestion;

/** The shape of each content/activities/<id>.json file. */
export interface ActivityContent {
  id: string;
  /** "I can ..." statement for the self-rating. */
  outcome: string;
  learn: {
    /** Markdown, 3 to 5 sentences. */
    text: string;
    /** Caption under the Learn it diagram. */
    caption?: string;
  };
  /** Activity-specific settings and text for the game. */
  try: Record<string, unknown> & {
    intro: string;
    /** One line shown above the game. When present, the intro is folded away under "How to play". */
    goal?: string;
  };
  check: Question[];
  /** A short written task with sentence frames. The draft is saved in this browser only, never sent. */
  explain?: {
    prompt: string;
    frames: string[];
    /** What a strong answer does, for the student to check their own writing against. */
    checklist?: string[];
  };
  /** Shown only in the teacher view. */
  teacherNotes?: string;
}

export interface TryProps {
  content: ActivityContent;
  /** Call once the student has done enough of the game to move on. */
  onComplete: () => void;
  /** Call when the student reaches a game level's goal (1, 2 or 3). Awards that level's stamp. */
  onGoal: (level?: number) => void;
  /** Stamps earned so far in this activity (STAMP bitmask). Levels 2 and 3 open with the stamp before them. */
  stamps: number;
  teacher: boolean;
}

/** What each activity's code module provides. */
export interface ActivityModule {
  Try: ComponentType<TryProps>;
  LearnDiagram?: ComponentType<{ content: ActivityContent }>;
}

export interface ActivityMeta {
  /** Stable id. Also used in progress codes, so never rename it. */
  id: string;
  /** Syllabus tag, for example "2.5 PED". */
  tag: string;
  /** Syllabus sub-topic code, for example "2.5". Used for ordering. */
  code: string;
  title: string;
  unit: 1 | 2;
  /** 'all' = the whole activity is HL only; 'part' = some parts are HL. */
  hl?: 'all' | 'part';
  /** What kind of game this is, shown on the home screen. */
  style: string;
  blurb: string;
  /** The stamp for reaching this game's Level 1 goal (built activities only). */
  goal?: GoalStamp;
  /** Stamps for the Level 2 and Level 3 goals. */
  goals?: [GoalStamp, GoalStamp];
  /** Present when the activity is built. */
  load?: () => Promise<ActivityModule>;
}
