// AUTO-GENERATED from idea/CEFR_Tool_Evaluation_Automated (2).xlsx (RUBRIC_QUESTIONS_22 POINT),
// then extended to the full 25 micro-level scale. The human evaluator set is
// 25 micro-levels x 6 skills x 2 questions. The B2.5 levels carry "To be filled"
// placeholder questions until authored. Levels come from the shared canonical
// source (lib/cefr-levels.ts) so the CEFR stage and VITAL never drift apart.
import { CANONICAL_CEFR_LEVELS } from '../lib/cefr-levels'

export type CefrSkillSeed = { name: string; group: 'LS' | 'RWVG'; order: number }
export type CefrLevelSeed = { code: string; label: string; order: number }
export type CefrQuestionSeed = { levelCode: string; skillName: string; num: number; text: string; quickReference: string | null }

export const CEFR_SKILLS: CefrSkillSeed[] = [
  {
    "name": "Speaking",
    "group": "LS",
    "order": 1
  },
  {
    "name": "Listening",
    "group": "LS",
    "order": 2
  },
  {
    "name": "Writing",
    "group": "RWVG",
    "order": 3
  },
  {
    "name": "Reading",
    "group": "RWVG",
    "order": 4
  },
  {
    "name": "Grammar",
    "group": "RWVG",
    "order": 5
  },
  {
    "name": "Vocabulary",
    "group": "RWVG",
    "order": 6
  }
]

export const CEFR_LEVELS: CefrLevelSeed[] = CANONICAL_CEFR_LEVELS.map((l) => ({
  code: l.code,
  label: l.label,
  order: l.order,
}))

export const CEFR_QUESTIONS: CefrQuestionSeed[] = [
  {
    "levelCode": "A0",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Single words'?",
    "quickReference": "Single words"
  },
  {
    "levelCode": "A0",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A0 level?",
    "quickReference": "Single words"
  },
  {
    "levelCode": "A0",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Own name'?",
    "quickReference": "Own name"
  },
  {
    "levelCode": "A0",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A0 level under appropriate conditions?",
    "quickReference": "Own name"
  },
  {
    "levelCode": "A0",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Copy letters'?",
    "quickReference": "Copy letters"
  },
  {
    "levelCode": "A0",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A0 level?",
    "quickReference": "Copy letters"
  },
  {
    "levelCode": "A0",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Own name/logos'?",
    "quickReference": "Own name / logos"
  },
  {
    "levelCode": "A0",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A0 level?",
    "quickReference": "Own name / logos"
  },
  {
    "levelCode": "A0",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'None'?",
    "quickReference": "None"
  },
  {
    "levelCode": "A0",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A0?",
    "quickReference": "None"
  },
  {
    "levelCode": "A0",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with '5-10 words'?",
    "quickReference": "5–10 words"
  },
  {
    "levelCode": "A0",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A0 level?",
    "quickReference": "5–10 words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Memorised phrases'?",
    "quickReference": "Memorised phrases"
  },
  {
    "levelCode": "A1-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A1- level?",
    "quickReference": "Memorised phrases"
  },
  {
    "levelCode": "A1-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Slow, clear, isolated words'?",
    "quickReference": "Slow, clear, isolated words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A1- level under appropriate conditions?",
    "quickReference": "Slow, clear, isolated words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Copy words/phrases'?",
    "quickReference": "Copy words/phrases"
  },
  {
    "levelCode": "A1-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A1- level?",
    "quickReference": "Copy words/phrases"
  },
  {
    "levelCode": "A1-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Recognise familiar words'?",
    "quickReference": "Recognise familiar words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A1- level?",
    "quickReference": "Recognise familiar words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Very limited'?",
    "quickReference": "Very limited"
  },
  {
    "levelCode": "A1-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A1-?",
    "quickReference": "Very limited"
  },
  {
    "levelCode": "A1-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Isolated words'?",
    "quickReference": "Isolated words"
  },
  {
    "levelCode": "A1-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A1- level?",
    "quickReference": "Isolated words"
  },
  {
    "levelCode": "A1",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Simple sentences'?",
    "quickReference": "Simple sentences"
  },
  {
    "levelCode": "A1",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A1 level?",
    "quickReference": "Simple sentences"
  },
  {
    "levelCode": "A1",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Very slow, simple phrases'?",
    "quickReference": "Very slow, simple phrases"
  },
  {
    "levelCode": "A1",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A1 level under appropriate conditions?",
    "quickReference": "Very slow, simple phrases"
  },
  {
    "levelCode": "A1",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Very simple sentences'?",
    "quickReference": "Very simple sentences"
  },
  {
    "levelCode": "A1",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A1 level?",
    "quickReference": "Very simple sentences"
  },
  {
    "levelCode": "A1",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Simple signs/notices'?",
    "quickReference": "Simple signs/notices"
  },
  {
    "levelCode": "A1",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A1 level?",
    "quickReference": "Simple signs/notices"
  },
  {
    "levelCode": "A1",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Limited simple structures'?",
    "quickReference": "Limited simple structures"
  },
  {
    "levelCode": "A1",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A1?",
    "quickReference": "Limited simple structures"
  },
  {
    "levelCode": "A1",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Basic concrete words'?",
    "quickReference": "Basic concrete words"
  },
  {
    "levelCode": "A1",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A1 level?",
    "quickReference": "Basic concrete words"
  },
  {
    "levelCode": "A1+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Simple Q&A'?",
    "quickReference": "Simple Q&A"
  },
  {
    "levelCode": "A1+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A1+ level?",
    "quickReference": "Simple Q&A"
  },
  {
    "levelCode": "A1+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Simple directions'?",
    "quickReference": "Simple directions"
  },
  {
    "levelCode": "A1+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A1+ level under appropriate conditions?",
    "quickReference": "Simple directions"
  },
  {
    "levelCode": "A1+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Link sentences with and/but'?",
    "quickReference": "Link sentences with 'and/but'"
  },
  {
    "levelCode": "A1+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A1+ level?",
    "quickReference": "Link sentences with 'and/but'"
  },
  {
    "levelCode": "A1+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Short, simple sentences'?",
    "quickReference": "Short, simple sentences"
  },
  {
    "levelCode": "A1+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A1+ level?",
    "quickReference": "Short, simple sentences"
  },
  {
    "levelCode": "A1+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Basic patterns with errors'?",
    "quickReference": "Basic patterns with errors"
  },
  {
    "levelCode": "A1+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A1+?",
    "quickReference": "Basic patterns with errors"
  },
  {
    "levelCode": "A1+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Everyday needs'?",
    "quickReference": "Everyday needs"
  },
  {
    "levelCode": "A1+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A1+ level?",
    "quickReference": "Everyday needs"
  },
  {
    "levelCode": "A2-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Routine tasks'?",
    "quickReference": "Routine tasks"
  },
  {
    "levelCode": "A2-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A2- level?",
    "quickReference": "Routine tasks"
  },
  {
    "levelCode": "A2-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Immediate needs, slow speech'?",
    "quickReference": "Immediate needs, slow speech"
  },
  {
    "levelCode": "A2-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A2- level under appropriate conditions?",
    "quickReference": "Immediate needs, slow speech"
  },
  {
    "levelCode": "A2-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Short messages'?",
    "quickReference": "Short messages"
  },
  {
    "levelCode": "A2-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A2- level?",
    "quickReference": "Short messages"
  },
  {
    "levelCode": "A2-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Very short texts with support'?",
    "quickReference": "Very short texts with support"
  },
  {
    "levelCode": "A2-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A2- level?",
    "quickReference": "Very short texts with support"
  },
  {
    "levelCode": "A2-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Systematic basic errors'?",
    "quickReference": "Systematic basic errors"
  },
  {
    "levelCode": "A2-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A2-?",
    "quickReference": "Systematic basic errors"
  },
  {
    "levelCode": "A2-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Concrete situations'?",
    "quickReference": "Concrete situations"
  },
  {
    "levelCode": "A2-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A2- level?",
    "quickReference": "Concrete situations"
  },
  {
    "levelCode": "A2",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Short exchanges'?",
    "quickReference": "Short exchanges"
  },
  {
    "levelCode": "A2",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A2 level?",
    "quickReference": "Short exchanges"
  },
  {
    "levelCode": "A2",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Main point of messages'?",
    "quickReference": "Main point of messages"
  },
  {
    "levelCode": "A2",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A2 level under appropriate conditions?",
    "quickReference": "Main point of messages"
  },
  {
    "levelCode": "A2",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Connected sentences'?",
    "quickReference": "Connected sentences"
  },
  {
    "levelCode": "A2",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A2 level?",
    "quickReference": "Connected sentences"
  },
  {
    "levelCode": "A2",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Short, simple texts'?",
    "quickReference": "Short, simple texts"
  },
  {
    "levelCode": "A2",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A2 level?",
    "quickReference": "Short, simple texts"
  },
  {
    "levelCode": "A2",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Systematic mistakes'?",
    "quickReference": "Systematic mistakes"
  },
  {
    "levelCode": "A2",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A2?",
    "quickReference": "Systematic mistakes"
  },
  {
    "levelCode": "A2",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Routine transactions'?",
    "quickReference": "Routine transactions"
  },
  {
    "levelCode": "A2",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A2 level?",
    "quickReference": "Routine transactions"
  },
  {
    "levelCode": "A2+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Short conversations'?",
    "quickReference": "Short conversations"
  },
  {
    "levelCode": "A2+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the A2+ level?",
    "quickReference": "Short conversations"
  },
  {
    "levelCode": "A2+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Concrete needs'?",
    "quickReference": "Concrete needs"
  },
  {
    "levelCode": "A2+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the A2+ level under appropriate conditions?",
    "quickReference": "Concrete needs"
  },
  {
    "levelCode": "A2+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Short paragraphs'?",
    "quickReference": "Short paragraphs"
  },
  {
    "levelCode": "A2+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the A2+ level?",
    "quickReference": "Short paragraphs"
  },
  {
    "levelCode": "A2+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'High frequency vocab texts'?",
    "quickReference": "High frequency vocab texts"
  },
  {
    "levelCode": "A2+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the A2+ level?",
    "quickReference": "High frequency vocab texts"
  },
  {
    "levelCode": "A2+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Improving accuracy'?",
    "quickReference": "Improving accuracy"
  },
  {
    "levelCode": "A2+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at A2+?",
    "quickReference": "Improving accuracy"
  },
  {
    "levelCode": "A2+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Basic communicative needs'?",
    "quickReference": "Basic communicative needs"
  },
  {
    "levelCode": "A2+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the A2+ level?",
    "quickReference": "Basic communicative needs"
  },
  {
    "levelCode": "B1-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Maintain conversation'?",
    "quickReference": "Maintain conversation"
  },
  {
    "levelCode": "B1-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1- level?",
    "quickReference": "Maintain conversation"
  },
  {
    "levelCode": "B1-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Straightforward info'?",
    "quickReference": "Straightforward info"
  },
  {
    "levelCode": "B1-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1- level under appropriate conditions?",
    "quickReference": "Straightforward info"
  },
  {
    "levelCode": "B1-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Basic paragraphs'?",
    "quickReference": "Basic paragraphs"
  },
  {
    "levelCode": "B1-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1- level?",
    "quickReference": "Basic paragraphs"
  },
  {
    "levelCode": "B1-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Scan for information'?",
    "quickReference": "Scan for information"
  },
  {
    "levelCode": "B1-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1- level?",
    "quickReference": "Scan for information"
  },
  {
    "levelCode": "B1-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Reasonable routines'?",
    "quickReference": "Reasonable routines"
  },
  {
    "levelCode": "B1-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1-?",
    "quickReference": "Reasonable routines"
  },
  {
    "levelCode": "B1-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Everyday topics'?",
    "quickReference": "Everyday topics"
  },
  {
    "levelCode": "B1-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1- level?",
    "quickReference": "Everyday topics"
  },
  {
    "levelCode": "B1",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Travel, opinions'?",
    "quickReference": "Travel, opinions"
  },
  {
    "levelCode": "B1",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1 level?",
    "quickReference": "Travel, opinions"
  },
  {
    "levelCode": "B1",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Main points, clear speech'?",
    "quickReference": "Main points, clear speech"
  },
  {
    "levelCode": "B1",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1 level under appropriate conditions?",
    "quickReference": "Main points, clear speech"
  },
  {
    "levelCode": "B1",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Connected text'?",
    "quickReference": "Connected text"
  },
  {
    "levelCode": "B1",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1 level?",
    "quickReference": "Connected text"
  },
  {
    "levelCode": "B1",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Main points of input'?",
    "quickReference": "Main points of input"
  },
  {
    "levelCode": "B1",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1 level?",
    "quickReference": "Main points of input"
  },
  {
    "levelCode": "B1",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Reasonable accuracy'?",
    "quickReference": "Reasonable accuracy"
  },
  {
    "levelCode": "B1",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1?",
    "quickReference": "Reasonable accuracy"
  },
  {
    "levelCode": "B1",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Get by with circumlocution'?",
    "quickReference": "Get by with circumlocution"
  },
  {
    "levelCode": "B1",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1 level?",
    "quickReference": "Get by with circumlocution"
  },
  {
    "levelCode": "B1+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Unprepared conversation'?",
    "quickReference": "Unprepared conversation"
  },
  {
    "levelCode": "B1+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1+ level?",
    "quickReference": "Unprepared conversation"
  },
  {
    "levelCode": "B1+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Main points + details'?",
    "quickReference": "Main points + details"
  },
  {
    "levelCode": "B1+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1+ level under appropriate conditions?",
    "quickReference": "Main points + details"
  },
  {
    "levelCode": "B1+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Personal letters'?",
    "quickReference": "Personal letters"
  },
  {
    "levelCode": "B1+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1+ level?",
    "quickReference": "Personal letters"
  },
  {
    "levelCode": "B1+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Main points + details'?",
    "quickReference": "Main points + details"
  },
  {
    "levelCode": "B1+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1+ level?",
    "quickReference": "Main points + details"
  },
  {
    "levelCode": "B1+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Good in familiar contexts'?",
    "quickReference": "Good in familiar contexts"
  },
  {
    "levelCode": "B1+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1+?",
    "quickReference": "Good in familiar contexts"
  },
  {
    "levelCode": "B1+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Opinions, descriptions'?",
    "quickReference": "Opinions, descriptions"
  },
  {
    "levelCode": "B1+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1+ level?",
    "quickReference": "Opinions, descriptions"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Abstract cultural topics'?",
    "quickReference": "Abstract cultural topics"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1.5- level?",
    "quickReference": "Abstract cultural topics"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Straightforward info'?",
    "quickReference": "Straightforward info"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1.5- level under appropriate conditions?",
    "quickReference": "Straightforward info"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Solid connected text'?",
    "quickReference": "Solid connected text"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1.5- level?",
    "quickReference": "Solid connected text"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Solid factual texts'?",
    "quickReference": "Solid factual texts"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1.5- level?",
    "quickReference": "Solid factual texts"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Good in familiar contexts'?",
    "quickReference": "Good in familiar contexts"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1.5-?",
    "quickReference": "Good in familiar contexts"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Most everyday topics'?",
    "quickReference": "Most everyday topics"
  },
  {
    "levelCode": "B1.5-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1.5- level?",
    "quickReference": "Most everyday topics"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Describe, give reasons'?",
    "quickReference": "Describe, give reasons"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1.5 level?",
    "quickReference": "Describe, give reasons"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Main points, clear speech'?",
    "quickReference": "Main points, clear speech"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1.5 level under appropriate conditions?",
    "quickReference": "Main points, clear speech"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Good paragraphs'?",
    "quickReference": "Good paragraphs"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1.5 level?",
    "quickReference": "Good paragraphs"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Good straightforward texts'?",
    "quickReference": "Good straightforward texts"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1.5 level?",
    "quickReference": "Good straightforward texts"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Relatively high control'?",
    "quickReference": "Relatively high control"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1.5?",
    "quickReference": "Relatively high control"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Most topics'?",
    "quickReference": "Most topics"
  },
  {
    "levelCode": "B1.5",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1.5 level?",
    "quickReference": "Most topics"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Develop arguments'?",
    "quickReference": "Develop arguments"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B1.5+ level?",
    "quickReference": "Develop arguments"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Radio, documentaries'?",
    "quickReference": "Radio, documentaries"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B1.5+ level under appropriate conditions?",
    "quickReference": "Radio, documentaries"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Consistent paragraphs'?",
    "quickReference": "Consistent paragraphs"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B1.5+ level?",
    "quickReference": "Consistent paragraphs"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Good inference'?",
    "quickReference": "Good inference"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B1.5+ level?",
    "quickReference": "Good inference"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'High control, rare errors'?",
    "quickReference": "High control, rare errors"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B1.5+?",
    "quickReference": "High control, rare errors"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Good range for familiar'?",
    "quickReference": "Good range for familiar"
  },
  {
    "levelCode": "B1.5+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B1.5+ level?",
    "quickReference": "Good range for familiar"
  },
  {
    "levelCode": "B2-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Near-B2, less fluent'?",
    "quickReference": "Near-B2, less fluent"
  },
  {
    "levelCode": "B2-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B2- level?",
    "quickReference": "Near-B2, less fluent"
  },
  {
    "levelCode": "B2-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Near-B2, slower'?",
    "quickReference": "Near-B2, slower"
  },
  {
    "levelCode": "B2-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B2- level under appropriate conditions?",
    "quickReference": "Near-B2, slower"
  },
  {
    "levelCode": "B2-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Near-B2, less consistent'?",
    "quickReference": "Near-B2, less consistent"
  },
  {
    "levelCode": "B2-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B2- level?",
    "quickReference": "Near-B2, less consistent"
  },
  {
    "levelCode": "B2-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Near-B2, slower'?",
    "quickReference": "Near-B2, slower"
  },
  {
    "levelCode": "B2-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B2- level?",
    "quickReference": "Near-B2, slower"
  },
  {
    "levelCode": "B2-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Occasional errors'?",
    "quickReference": "Occasional errors"
  },
  {
    "levelCode": "B2-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B2-?",
    "quickReference": "Occasional errors"
  },
  {
    "levelCode": "B2-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Good for own field'?",
    "quickReference": "Good for own field"
  },
  {
    "levelCode": "B2-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B2- level?",
    "quickReference": "Good for own field"
  },
  {
    "levelCode": "B2",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Fluent interaction'?",
    "quickReference": "Fluent interaction"
  },
  {
    "levelCode": "B2",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B2 level?",
    "quickReference": "Fluent interaction"
  },
  {
    "levelCode": "B2",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Standard speech, complex ideas'?",
    "quickReference": "Standard speech, complex ideas"
  },
  {
    "levelCode": "B2",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B2 level under appropriate conditions?",
    "quickReference": "Standard speech, complex ideas"
  },
  {
    "levelCode": "B2",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Clear, detailed texts'?",
    "quickReference": "Clear, detailed texts"
  },
  {
    "levelCode": "B2",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B2 level?",
    "quickReference": "Clear, detailed texts"
  },
  {
    "levelCode": "B2",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Main ideas of complex texts'?",
    "quickReference": "Main ideas of complex texts"
  },
  {
    "levelCode": "B2",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B2 level?",
    "quickReference": "Main ideas of complex texts"
  },
  {
    "levelCode": "B2",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Good control, occasional slips'?",
    "quickReference": "Good control, occasional slips"
  },
  {
    "levelCode": "B2",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B2?",
    "quickReference": "Good control, occasional slips"
  },
  {
    "levelCode": "B2",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Good range for field'?",
    "quickReference": "Good range for field"
  },
  {
    "levelCode": "B2",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B2 level?",
    "quickReference": "Good range for field"
  },
  {
    "levelCode": "B2+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Argue convincingly'?",
    "quickReference": "Argue convincingly"
  },
  {
    "levelCode": "B2+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the B2+ level?",
    "quickReference": "Argue convincingly"
  },
  {
    "levelCode": "B2+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'TV, films, animated conversation'?",
    "quickReference": "TV, films, animated conversation"
  },
  {
    "levelCode": "B2+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the B2+ level under appropriate conditions?",
    "quickReference": "TV, films, animated conversation"
  },
  {
    "levelCode": "B2+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Systematic arguments'?",
    "quickReference": "Systematic arguments"
  },
  {
    "levelCode": "B2+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the B2+ level?",
    "quickReference": "Systematic arguments"
  },
  {
    "levelCode": "B2+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Articles with stances'?",
    "quickReference": "Articles with stances"
  },
  {
    "levelCode": "B2+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the B2+ level?",
    "quickReference": "Articles with stances"
  },
  {
    "levelCode": "B2+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Rare, non-impeding errors'?",
    "quickReference": "Rare, non-impeding errors"
  },
  {
    "levelCode": "B2+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at B2+?",
    "quickReference": "Rare, non-impeding errors"
  },
  {
    "levelCode": "B2+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Wide range, common+uncommon'?",
    "quickReference": "Wide range, common+uncommon"
  },
  {
    "levelCode": "B2+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the B2+ level?",
    "quickReference": "Wide range, common+uncommon"
  },
  {
    "levelCode": "C1-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Fluent on complex topics'?",
    "quickReference": "Fluent on complex topics"
  },
  {
    "levelCode": "C1-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C1- level?",
    "quickReference": "Fluent on complex topics"
  },
  {
    "levelCode": "C1-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Extended speech, not clearly structured'?",
    "quickReference": "Extended speech, not clearly structured"
  },
  {
    "levelCode": "C1-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C1- level under appropriate conditions?",
    "quickReference": "Extended speech, not clearly structured"
  },
  {
    "levelCode": "C1-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Well-structured complex texts'?",
    "quickReference": "Well-structured complex texts"
  },
  {
    "levelCode": "C1-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C1- level?",
    "quickReference": "Well-structured complex texts"
  },
  {
    "levelCode": "C1-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Demanding, longer texts'?",
    "quickReference": "Demanding, longer texts"
  },
  {
    "levelCode": "C1-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C1- level?",
    "quickReference": "Demanding, longer texts"
  },
  {
    "levelCode": "C1-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'High accuracy, rare errors'?",
    "quickReference": "High accuracy, rare errors"
  },
  {
    "levelCode": "C1-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C1-?",
    "quickReference": "High accuracy, rare errors"
  },
  {
    "levelCode": "C1-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Broad repertoire, idioms'?",
    "quickReference": "Broad repertoire, idioms"
  },
  {
    "levelCode": "C1-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C1- level?",
    "quickReference": "Broad repertoire, idioms"
  },
  {
    "levelCode": "C1",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Spontaneous, flexible'?",
    "quickReference": "Spontaneous, flexible"
  },
  {
    "levelCode": "C1",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C1 level?",
    "quickReference": "Spontaneous, flexible"
  },
  {
    "levelCode": "C1",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'TV/films without effort'?",
    "quickReference": "TV/films without effort"
  },
  {
    "levelCode": "C1",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C1 level under appropriate conditions?",
    "quickReference": "TV/films without effort"
  },
  {
    "levelCode": "C1",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Well-structured, expand with reasons'?",
    "quickReference": "Well-structured, expand with reasons"
  },
  {
    "levelCode": "C1",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C1 level?",
    "quickReference": "Well-structured, expand with reasons"
  },
  {
    "levelCode": "C1",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Demanding texts, implicit meaning'?",
    "quickReference": "Demanding texts, implicit meaning"
  },
  {
    "levelCode": "C1",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C1 level?",
    "quickReference": "Demanding texts, implicit meaning"
  },
  {
    "levelCode": "C1",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Very high accuracy'?",
    "quickReference": "Very high accuracy"
  },
  {
    "levelCode": "C1",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C1?",
    "quickReference": "Very high accuracy"
  },
  {
    "levelCode": "C1",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Broad + idioms'?",
    "quickReference": "Broad + idioms"
  },
  {
    "levelCode": "C1",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C1 level?",
    "quickReference": "Broad + idioms"
  },
  {
    "levelCode": "C1+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Finer shades of meaning'?",
    "quickReference": "Finer shades of meaning"
  },
  {
    "levelCode": "C1+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C1+ level?",
    "quickReference": "Finer shades of meaning"
  },
  {
    "levelCode": "C1+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Implicit attitudes + relationships'?",
    "quickReference": "Implicit attitudes + relationships"
  },
  {
    "levelCode": "C1+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C1+ level under appropriate conditions?",
    "quickReference": "Implicit attitudes + relationships"
  },
  {
    "levelCode": "C1+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Flexible, sophisticated'?",
    "quickReference": "Flexible, sophisticated"
  },
  {
    "levelCode": "C1+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C1+ level?",
    "quickReference": "Flexible, sophisticated"
  },
  {
    "levelCode": "C1+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Subtle distinctions'?",
    "quickReference": "Subtle distinctions"
  },
  {
    "levelCode": "C1+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C1+ level?",
    "quickReference": "Subtle distinctions"
  },
  {
    "levelCode": "C1+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'High accuracy, wide structures'?",
    "quickReference": "High accuracy, wide structures"
  },
  {
    "levelCode": "C1+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C1+?",
    "quickReference": "High accuracy, wide structures"
  },
  {
    "levelCode": "C1+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Very broad, nuanced'?",
    "quickReference": "Very broad, nuanced"
  },
  {
    "levelCode": "C1+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C1+ level?",
    "quickReference": "Very broad, nuanced"
  },
  {
    "levelCode": "C2-",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Precise, nuanced'?",
    "quickReference": "Precise, nuanced"
  },
  {
    "levelCode": "C2-",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C2- level?",
    "quickReference": "Precise, nuanced"
  },
  {
    "levelCode": "C2-",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Virtually all spoken'?",
    "quickReference": "Virtually all spoken"
  },
  {
    "levelCode": "C2-",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C2- level under appropriate conditions?",
    "quickReference": "Virtually all spoken"
  },
  {
    "levelCode": "C2-",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Complex, nuanced'?",
    "quickReference": "Complex, nuanced"
  },
  {
    "levelCode": "C2-",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C2- level?",
    "quickReference": "Complex, nuanced"
  },
  {
    "levelCode": "C2-",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Virtually all written'?",
    "quickReference": "Virtually all written"
  },
  {
    "levelCode": "C2-",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C2- level?",
    "quickReference": "Virtually all written"
  },
  {
    "levelCode": "C2-",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Consistent control'?",
    "quickReference": "Consistent control"
  },
  {
    "levelCode": "C2-",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C2-?",
    "quickReference": "Consistent control"
  },
  {
    "levelCode": "C2-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Very broad + idioms'?",
    "quickReference": "Very broad + idioms"
  },
  {
    "levelCode": "C2-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C2- level?",
    "quickReference": "Very broad + idioms"
  },
  {
    "levelCode": "C2",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Very fluent, precise'?",
    "quickReference": "Very fluent, precise"
  },
  {
    "levelCode": "C2",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C2 level?",
    "quickReference": "Very fluent, precise"
  },
  {
    "levelCode": "C2",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Any spoken language'?",
    "quickReference": "Any spoken language"
  },
  {
    "levelCode": "C2",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C2 level under appropriate conditions?",
    "quickReference": "Any spoken language"
  },
  {
    "levelCode": "C2",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Clear, flowing, complex'?",
    "quickReference": "Clear, flowing, complex"
  },
  {
    "levelCode": "C2",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C2 level?",
    "quickReference": "Clear, flowing, complex"
  },
  {
    "levelCode": "C2",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'With ease everything'?",
    "quickReference": "With ease everything"
  },
  {
    "levelCode": "C2",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C2 level?",
    "quickReference": "With ease everything"
  },
  {
    "levelCode": "C2",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Consistent even distracted'?",
    "quickReference": "Consistent even distracted"
  },
  {
    "levelCode": "C2",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C2?",
    "quickReference": "Consistent even distracted"
  },
  {
    "levelCode": "C2",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Exceptional breadth'?",
    "quickReference": "Exceptional breadth"
  },
  {
    "levelCode": "C2",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C2 level?",
    "quickReference": "Exceptional breadth"
  },
  {
    "levelCode": "C2+",
    "skillName": "Speaking",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's speaking ability aligns with 'Culturally sensitive'?",
    "quickReference": "Culturally sensitive"
  },
  {
    "levelCode": "C2+",
    "skillName": "Speaking",
    "num": 2,
    "text": "Can the tool detect and measure the specific characteristics of speaking at the C2+ level?",
    "quickReference": "Culturally sensitive"
  },
  {
    "levelCode": "C2+",
    "skillName": "Listening",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's listening ability aligns with 'Culturally nuanced speech'?",
    "quickReference": "Culturally nuanced speech"
  },
  {
    "levelCode": "C2+",
    "skillName": "Listening",
    "num": 2,
    "text": "Can the tool effectively assess comprehension at the C2+ level under appropriate conditions?",
    "quickReference": "Culturally nuanced speech"
  },
  {
    "levelCode": "C2+",
    "skillName": "Writing",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's writing ability aligns with 'Sophisticated, precise'?",
    "quickReference": "Sophisticated, precise"
  },
  {
    "levelCode": "C2+",
    "skillName": "Writing",
    "num": 2,
    "text": "Are the assessment metrics capable of identifying the writing constraints and capabilities expected at the C2+ level?",
    "quickReference": "Sophisticated, precise"
  },
  {
    "levelCode": "C2+",
    "skillName": "Reading",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's reading ability aligns with 'Critical, nuanced understanding'?",
    "quickReference": "Critical, nuanced understanding"
  },
  {
    "levelCode": "C2+",
    "skillName": "Reading",
    "num": 2,
    "text": "Can the tool verify if the learner can process reading materials appropriate for the C2+ level?",
    "quickReference": "Critical, nuanced understanding"
  },
  {
    "levelCode": "C2+",
    "skillName": "Grammar",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's grammar proficiency aligns with 'Exceptional flexibility'?",
    "quickReference": "Exceptional flexibility"
  },
  {
    "levelCode": "C2+",
    "skillName": "Grammar",
    "num": 2,
    "text": "Does the assessment correctly identify the typical grammatical errors or the level of control expected at C2+?",
    "quickReference": "Exceptional flexibility"
  },
  {
    "levelCode": "C2+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "Does the tool accurately evaluate whether the learner's vocabulary range aligns with 'Exceptional command'?",
    "quickReference": "Exceptional command"
  },
  {
    "levelCode": "C2+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "Is the tool capable of assessing both the breadth and precision of vocabulary expected at the C2+ level?",
    "quickReference": "Exceptional command"
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Speaking",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Speaking",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Listening",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Listening",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Writing",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Writing",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Reading",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Reading",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Grammar",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Grammar",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5-",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Speaking",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Speaking",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Listening",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Listening",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Writing",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Writing",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Reading",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Reading",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Grammar",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Grammar",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Speaking",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Speaking",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Listening",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Listening",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Writing",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Writing",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Reading",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Reading",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Grammar",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Grammar",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Vocabulary",
    "num": 1,
    "text": "To be filled.",
    "quickReference": null
  },
  {
    "levelCode": "B2.5+",
    "skillName": "Vocabulary",
    "num": 2,
    "text": "To be filled.",
    "quickReference": null
  }
]
