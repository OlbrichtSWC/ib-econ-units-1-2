import { describe, expect, it } from 'vitest';
import {
  checkScore, conceptMarksAtRisk, CONCEPTS, IA_UNITS, LEAVE_REASONS, leaveReason, LENS_DRAW, LENS_GOAL, lensWon, MAX_AGE_MONTHS,
  planFromCompass, planProblems, RULES_GOAL, SCOUT_DRAW, SCOUT_GOAL, scoutWon, trailWon, unitCompass,
} from '../src/activities/ia-helper/model';
import type { Concept, ScoutArticle, Unit } from '../src/activities/ia-helper/model';
import content from '../public/content/activities/ia-helper.json';

type Opt = { text: string; correct?: boolean; feedback: string };
const t = content.try as unknown as {
  units: Record<string, {
    questions: { id: string; options: { topic: string; concept: string }[] }[];
    topics: { id: string; codes: string[]; diagram: string; ideas: string[] }[];
  }>;
  themes: { id: string; codes: string[] }[];
  rules: { id: string; options: Opt[] }[];
  articles: (ScoutArticle & { id: string; why: string })[];
  reasonNames: Record<string, string>;
  lenses: { id: string; concept: string; diagrams: Opt[]; links: Opt[] }[];
};

describe('IA Trailhead: the rules from the guide', () => {
  it('a plan needs three different units from 2, 3 and 4, and three different key concepts', () => {
    expect(planProblems([{ unit: 2, concept: 'equity' }, { unit: 3, concept: 'change' }, { unit: 4, concept: 'interdependence' }])).toEqual([]);
    expect(planProblems([{ unit: 1, concept: 'scarcity' }, { unit: 3, concept: 'change' }, { unit: 4, concept: 'equity' }])).toEqual(['unit1']);
    expect(planProblems([{ unit: 2, concept: 'equity' }, { unit: 2, concept: 'change' }, { unit: 4, concept: 'choice' }])).toEqual(['sameUnit']);
    expect(planProblems([{ unit: 2, concept: 'equity' }, { unit: 3, concept: 'equity' }, { unit: 4, concept: 'choice' }])).toEqual(['sameConcept']);
    expect(planProblems([{ unit: 2, concept: null }, { unit: 3, concept: 'equity' }, { unit: null, concept: 'choice' }])).toContain('missing');
  });
  it('reusing a key concept risks 3 marks in criterion D, or 6 if it is used three times', () => {
    expect(conceptMarksAtRisk(['equity', 'change', 'choice'])).toBe(0);
    expect(conceptMarksAtRisk(['equity', 'equity', 'choice'])).toBe(3);
    expect(conceptMarksAtRisk(['equity', 'equity', 'equity'])).toBe(6);
  });
  it('an article must not be from TV or radio, more than a year old, given by the teacher, or without Unit 2 to 4 theory', () => {
    const ok: ScoutArticle = { source: 'online', ageMonths: 3, unit: 2 };
    expect(leaveReason(ok)).toBeNull();
    expect(leaveReason({ ...ok, ageMonths: MAX_AGE_MONTHS })).toBeNull();
    expect(leaveReason({ ...ok, ageMonths: 13 })).toBe('old');
    expect(leaveReason({ ...ok, source: 'tv' })).toBe('broadcast');
    expect(leaveReason({ ...ok, source: 'radio' })).toBe('broadcast');
    expect(leaveReason({ ...ok, fromTeacher: true })).toBe('teacher');
    expect(leaveReason({ ...ok, unit: null })).toBe('noTheory');
    expect(leaveReason({ ...ok, unit: 1 })).toBe('noTheory');
    expect(IA_UNITS).toEqual([2, 3, 4]);
    expect(CONCEPTS).toHaveLength(9);
  });
  it('the unit compass ranks topics and key concepts by the answers given', () => {
    const r = unitCompass([{ topic: 'fiscal', concept: 'change' }, { topic: 'fiscal', concept: 'equity' }, { topic: 'growth', concept: 'change' }], ['growth', 'inflation', 'fiscal']);
    expect(r.topics.map((x) => x.topic)).toEqual(['fiscal', 'growth', 'inflation']);
    expect(r.concepts[0]).toEqual({ concept: 'change', points: 2 });
    expect(unitCompass([], ['a', 'b']).topics.map((x) => x.topic)).toEqual(['a', 'b']);
  });
  it('a plan from the compass has one commentary per unit and three different key concepts', () => {
    const p = planFromCompass({ 2: { topic: 'markets', concepts: ['equity', 'choice'] }, 3: { topic: 'fiscal', concepts: ['equity', 'change'] } });
    expect(p).toEqual([{ unit: 2, concept: 'equity' }, { unit: 3, concept: 'change' }, { unit: 4, concept: 'scarcity' }]);
    expect(planProblems(p)).toEqual([]);
    expect(planProblems(planFromCompass({}))).toEqual([]);
    const same = planFromCompass({ 2: { topic: 'a', concepts: ['equity'] }, 3: { topic: 'b', concepts: ['equity'] }, 4: { topic: 'c', concepts: ['equity'] } });
    expect(planProblems(same)).toEqual([]);
  });
  it('strengths need at least three answers', () => {
    expect(checkScore(2, 2)).toBeNull();
    expect(checkScore(3, 4)).toBe(75);
    expect(checkScore(0, 5)).toBe(0);
  });
  it('goals', () => {
    const good = [{ unit: 2 as Unit, concept: 'equity' as Concept }, { unit: 3 as Unit, concept: 'change' as Concept }, { unit: 4 as Unit, concept: 'choice' as Concept }];
    expect(trailWon(RULES_GOAL, good)).toBe(true);
    expect(trailWon(RULES_GOAL - 1, good)).toBe(false);
    expect(trailWon(5, [good[0], good[0], good[2]])).toBe(false);
    expect(scoutWon(SCOUT_GOAL)).toBe(true);
    expect(scoutWon(SCOUT_GOAL - 1)).toBe(false);
    expect(lensWon(LENS_GOAL)).toBe(true);
    expect(lensWon(LENS_GOAL - 1)).toBe(false);
    expect(SCOUT_GOAL).toBeLessThanOrEqual(SCOUT_DRAW * 2);
    expect(LENS_GOAL).toBeLessThanOrEqual(LENS_DRAW * 2);
    expect(RULES_GOAL).toBeLessThanOrEqual(t.rules.length);
  });
});

describe('IA Trailhead: content', () => {
  it('Units 2, 3 and 4 each have five questions with three options, a real topic and a real key concept', () => {
    expect(Object.keys(t.units).sort()).toEqual(['2', '3', '4']);
    for (const u of IA_UNITS) {
      const unit = t.units[String(u)];
      const ids = unit.topics.map((x) => x.id);
      expect(unit.questions).toHaveLength(5);
      for (const q of unit.questions) {
        expect(q.options).toHaveLength(3);
        for (const o of q.options) {
          expect(ids).toContain(o.topic);
          expect(CONCEPTS).toContain(o.concept);
        }
      }
      // Every topic can win, and every topic names its syllabus codes, a diagram and article ideas.
      for (const topic of unit.topics) {
        expect(unit.questions.some((q) => q.options.some((o) => o.topic === topic.id))).toBe(true);
        expect(topic.codes.every((c) => c.startsWith(`${u}.`))).toBe(true);
        expect(topic.diagram.length).toBeGreaterThan(5);
        expect(topic.ideas.length).toBeGreaterThanOrEqual(3);
      }
    }
    // Unit 2 topics match the strengths themes, so the strengths panel and the compass agree.
    expect(t.units['2'].topics.map((x) => x.id)).toEqual(t.themes.map((x) => x.id));
  });

  it('strength themes cover every Unit 2 sub-topic once', () => {
    const codes = t.themes.flatMap((th) => th.codes).sort();
    expect(codes).toEqual(['2.1', '2.10', '2.11', '2.12', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9']);
  });
  it('every rule and lens question has exactly one right answer', () => {
    for (const r of t.rules) expect(r.options.filter((o) => o.correct).length, r.id).toBe(1);
    for (const l of t.lenses) {
      expect(l.diagrams.filter((o) => o.correct).length, l.id).toBe(1);
      expect(l.links.filter((o) => o.correct).length, l.id).toBe(1);
      expect(CONCEPTS, l.id).toContain(l.concept);
    }
    expect(t.lenses.length).toBeGreaterThan(LENS_DRAW);
  });
  it('the article pool is bigger than a round, has keeps for every unit and a leave for every reason', () => {
    expect(t.articles.length).toBeGreaterThan(SCOUT_DRAW);
    const reasons = t.articles.map((a) => leaveReason(a));
    for (const r of LEAVE_REASONS) expect(reasons, r).toContain(r);
    for (const u of IA_UNITS) expect(t.articles.some((a) => leaveReason(a) === null && a.unit === u), String(u)).toBe(true);
    for (const r of LEAVE_REASONS) expect(t.reasonNames[r]).toBeTruthy();
    expect(new Set(t.articles.map((a) => a.id)).size).toBe(t.articles.length);
  });
  it('hand-checked article verdicts', () => {
    const by = Object.fromEntries(t.articles.map((a) => [a.id, leaveReason(a) ?? `keep ${a.unit}`]));
    expect(by).toEqual({
      parking: 'keep 2', rates: 'keep 3', steel: 'keep 4', milktv: 'broadcast', jobsradio: 'broadcast', sugarold: 'old', fuelold: 'old',
      cupfinal: 'noTheory', garden: 'noTheory', teacherbags: 'teacher', wheat: 'keep 2', jobs: 'keep 3', currency: 'keep 4', rentcap: 'keep 2',
      inflation: 'keep 3', wells: 'keep 4',
    });
  });
});
