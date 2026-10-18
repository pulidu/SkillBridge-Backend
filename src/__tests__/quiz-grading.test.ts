import { describe, expect, it } from 'vitest';
import { gradeAttempt, type GradableQuiz } from '../services/quiz.service';

const singleChoice: GradableQuiz = {
  passingScore: 70,
  questions: [
    {
      _id: 'q1',
      type: 'single',
      points: 1,
      options: [
        { _id: 'o1', text: 'Correct', isCorrect: true },
        { _id: 'o2', text: 'Wrong', isCorrect: false },
      ],
    },
  ],
};

const multipleChoice: GradableQuiz = {
  passingScore: 70,
  questions: [
    {
      _id: 'q1',
      type: 'multiple',
      points: 2,
      options: [
        { _id: 'o1', text: 'A', isCorrect: true },
        { _id: 'o2', text: 'B', isCorrect: true },
        { _id: 'o3', text: 'C', isCorrect: false },
      ],
    },
  ],
};

const shortAnswer: GradableQuiz = {
  passingScore: 70,
  questions: [{ _id: 'q1', type: 'short', points: 1, correctAnswer: 'TypeScript', options: [] }],
};

describe('gradeAttempt - single choice', () => {
  it('awards the point for the correct option', () => {
    const result = gradeAttempt(singleChoice, [{ question: 'q1', selectedOptionIds: ['o1'] }]);
    expect(result.score).toBe(1);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('awards nothing for the wrong option', () => {
    const result = gradeAttempt(singleChoice, [{ question: 'q1', selectedOptionIds: ['o2'] }]);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('does not accept a correct answer bundled with a wrong one', () => {
    const result = gradeAttempt(singleChoice, [{ question: 'q1', selectedOptionIds: ['o1', 'o2'] }]);
    expect(result.score).toBe(0);
  });
});

describe('gradeAttempt - multiple choice', () => {
  it('requires the exact set of correct options', () => {
    const result = gradeAttempt(multipleChoice, [
      { question: 'q1', selectedOptionIds: ['o2', 'o1'] },
    ]);
    expect(result.score).toBe(2);
    expect(result.passed).toBe(true);
  });

  it('rejects a partial selection', () => {
    const result = gradeAttempt(multipleChoice, [{ question: 'q1', selectedOptionIds: ['o1'] }]);
    expect(result.score).toBe(0);
  });

  it('rejects a correct set plus an extra incorrect option', () => {
    const result = gradeAttempt(multipleChoice, [
      { question: 'q1', selectedOptionIds: ['o1', 'o2', 'o3'] },
    ]);
    expect(result.score).toBe(0);
  });

  it('tolerates duplicate selections', () => {
    const result = gradeAttempt(multipleChoice, [
      { question: 'q1', selectedOptionIds: ['o1', 'o1', 'o2'] },
    ]);
    expect(result.score).toBe(2);
  });
});

describe('gradeAttempt - short answer', () => {
  it('compares case-insensitively and ignores surrounding whitespace', () => {
    const result = gradeAttempt(shortAnswer, [{ question: 'q1', selectedOptionIds: [], textAnswer: '  typescript  ' }]);
    expect(result.score).toBe(1);
  });

  it('marks a different answer wrong', () => {
    const result = gradeAttempt(shortAnswer, [{ question: 'q1', selectedOptionIds: [], textAnswer: 'JavaScript' }]);
    expect(result.score).toBe(0);
  });
});

describe('gradeAttempt - unanswered questions', () => {
  it('scores a missing question as incorrect', () => {
    const result = gradeAttempt(singleChoice, []);
    expect(result.score).toBe(0);
    expect(result.answers).toHaveLength(1);
    expect(result.answers[0].isCorrect).toBe(false);
  });

  it('ignores answers to questions that do not exist in the quiz', () => {
    const result = gradeAttempt(singleChoice, [
      { question: 'q1', selectedOptionIds: ['o1'] },
      { question: 'not-in-quiz', selectedOptionIds: ['o1'] },
    ]);
    expect(result.maxScore).toBe(1);
    expect(result.answers).toHaveLength(1);
    expect(result.percentage).toBe(100);
  });
});

describe('gradeAttempt - scoring and pass threshold', () => {
  const twoQuestion: GradableQuiz = {
    passingScore: 70,
    questions: [
      { _id: 'q1', type: 'truefalse', points: 1, options: [{ _id: 't', text: 'True', isCorrect: true }] },
      {
        _id: 'q2',
        type: 'single',
        points: 3,
        options: [
          { _id: 'a', text: 'A', isCorrect: true },
          { _id: 'b', text: 'B', isCorrect: false },
        ],
      },
    ],
  };

  it('rounds the percentage to a whole number', () => {
    const result = gradeAttempt(twoQuestion, [
      { question: 'q1', selectedOptionIds: ['t'] },
      { question: 'q2', selectedOptionIds: ['a'] },
    ]);
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
    expect(result.percentage).toBe(100);
  });

  it('fails below the passing score', () => {
    const result = gradeAttempt(twoQuestion, [
      { question: 'q1', selectedOptionIds: ['t'] },
      { question: 'q2', selectedOptionIds: ['b'] },
    ]);
    expect(result.score).toBe(1);
    expect(result.percentage).toBe(25);
    expect(result.passed).toBe(false);
  });

  it('treats exactly the passing score as a pass', () => {
    const result = gradeAttempt(twoQuestion, [
      { question: 'q1', selectedOptionIds: [] },
      { question: 'q2', selectedOptionIds: ['a'] },
    ]);
    expect(result.percentage).toBe(75);
    expect(result.passed).toBe(true);
  });

  it('returns zero rather than NaN when there are no questions', () => {
    const result = gradeAttempt({ passingScore: 70, questions: [] }, []);
    expect(result.maxScore).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });
});
