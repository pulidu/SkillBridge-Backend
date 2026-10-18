import { describe, expect, it } from 'vitest';
import type { Schema } from 'mongoose';
import { Assignment, Submission, gradePercentage, isOverdue } from '../models';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from '../validators/assignment.validator';
import { createSubmissionSchema } from '../validators/enrollment.validator';

const courseId = '65f0000000000000000000a1';
const lessonId = '65f0000000000000000000b2';
const assignmentId = '65f0000000000000000000c3';
const url = 'https://resumes.example.com/amina/portfolio.pdf';

describe('assignmentSchema', () => {
  it('creates a hidden, unpublished task with the default mark scale', () => {
    const result = createAssignmentSchema.safeParse({
      title: 'Build a REST API',
      instructions: 'Implement the documented endpoints and cover them with tests.',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.isPublished).toBe(false);
    expect(result.success && result.data.maxMarks).toBe(100);
  });

  it('coerces an ISO due date and a numeric mark scale', () => {
    const result = createAssignmentSchema.safeParse({
      title: 'Build a REST API',
      instructions: 'Implement the documented endpoints and cover them with tests.',
      dueDate: '2026-03-01T09:00:00.000Z',
      maxMarks: '40',
      isPublished: 'true',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.dueDate).toBeInstanceOf(Date);
    expect(result.success && result.data.maxMarks).toBe(40);
    expect(result.success && result.data.isPublished).toBe(true);
  });

  it('rejects instructions too short to be actionable', () => {
    expect(
      createAssignmentSchema.safeParse({ title: 'Essay', instructions: 'short' }).success,
    ).toBe(false);
  });

  it('rejects a mark scale outside the supported range', () => {
    const base = { title: 'Essay task', instructions: 'Write 500 words about testing.' };
    expect(createAssignmentSchema.safeParse({ ...base, maxMarks: 0 }).success).toBe(false);
    expect(createAssignmentSchema.safeParse({ ...base, maxMarks: 1001 }).success).toBe(false);
  });

  it('requires at least one field on update', () => {
    expect(updateAssignmentSchema.safeParse({}).success).toBe(false);
    expect(updateAssignmentSchema.safeParse({ isPublished: true }).success).toBe(true);
  });
});

type IndexEntry = [Record<string, unknown>, Record<string, unknown>];

const indexesOf = (schema: Schema): IndexEntry[] =>
  schema.indexes() as unknown as IndexEntry[];

describe('assignment indexes', () => {
  const indexOf = (schema: Schema, keys: string): IndexEntry | undefined =>
    indexesOf(schema).find((entry) => JSON.stringify(entry[0]) === keys);

  it('scopes assignments by course and publication state', () => {
    expect(indexOf(Assignment.schema, '{"course":1,"isPublished":1}')).toBeDefined();
  });

  it('can find a course task by the lesson that introduces it', () => {
    expect(indexOf(Assignment.schema, '{"lesson":1}')).toBeDefined();
  });

  it('does not put a unique constraint on assignment titles', () => {
    // Two courses may legitimately both have a task called "Final Project".
    const unique = Assignment.schema
      .indexes()
      .filter((entry) => (entry[1] as { unique?: boolean }).unique === true);
    expect(unique).toHaveLength(0);
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-02-10T12:00:00.000Z');

  it('treats a missing due date as not overdue', () => {
    expect(isOverdue(undefined, now)).toBe(false);
  });

  it('flags work due in the past', () => {
    expect(isOverdue(new Date('2026-02-09T23:59:00.000Z'), now)).toBe(true);
  });

  it('leaves future work alone', () => {
    expect(isOverdue(new Date('2026-02-11T00:00:00.000Z'), now)).toBe(false);
  });

  it('treats the deadline instant itself as still on time', () => {
    // Overdue means the window has passed, not that it has just closed.
    expect(isOverdue(new Date(now), now)).toBe(false);
  });
});

describe('gradePercentage', () => {
  it('reports the share of the assignment scale that was earned', () => {
    expect(gradePercentage(40, 40)).toBe(100);
    expect(gradePercentage(0, 40)).toBe(0);
    // Rounded to a whole percent for display.
    expect(gradePercentage(35, 40)).toBe(88);
    expect(gradePercentage(20, 40)).toBe(50);
  });

  it('guards against an impossible scale', () => {
    expect(gradePercentage(10, 0)).toBe(0);
    expect(gradePercentage(110, 100)).toBe(100);
  });
});

describe('createSubmissionSchema', () => {
  it('accepts an assignment answer written as text', () => {
    const result = createSubmissionSchema.safeParse({
      assignment: assignmentId,
      answerText: 'Here is my walkthrough.',
    });

    expect(result.success).toBe(true);
    expect(result.success && 'assignment' in result.data).toBe(true);
  });

  it('accepts an assignment answer hosted elsewhere', () => {
    expect(
      createSubmissionSchema.safeParse({ assignment: assignmentId, answerURL: url }).success,
    ).toBe(true);
  });

  it('accepts an attachment-only answer', () => {
    const result = createSubmissionSchema.safeParse({
      assignment: assignmentId,
      attachments: [{ name: 'portfolio.pdf', url }],
    });

    expect(result.success).toBe(true);
    // Size defaults to 0 when the client omits it.
    expect(result.success && 'attachments' in result.data && result.data.attachments[0].size).toBe(0);
  });

  it('keeps an attachment size supplied by the client', () => {
    const result = createSubmissionSchema.safeParse({
      assignment: assignmentId,
      attachments: [{ name: 'portfolio.pdf', url, size: 2048, mimeType: 'application/pdf' }],
    });

    expect(result.success && 'attachments' in result.data && result.data.attachments[0].size).toBe(
      2048,
    );
  });

  it('rejects an assignment submission with no answer at all', () => {
    expect(createSubmissionSchema.safeParse({ assignment: assignmentId }).success).toBe(false);
  });

  it('accepts a URL when the client also sends an empty answerText', () => {
    // A form that always submits the text box will send an empty string.
    expect(
      createSubmissionSchema.safeParse({ assignment: assignmentId, answerText: '', answerURL: url })
        .success,
    ).toBe(true);
  });

  it('rejects a javascript: answer URL', () => {
    expect(
      createSubmissionSchema.safeParse({
        assignment: assignmentId,
        answerURL: 'javascript:alert(document.cookie)',
      }).success,
    ).toBe(false);
  });

  it('still accepts the legacy lesson-based submission shape', () => {
    const result = createSubmissionSchema.safeParse({
      course: courseId,
      lesson: lessonId,
      content: 'My answer for the assignment lesson.',
    });

    expect(result.success).toBe(true);
    expect(result.success && 'lesson' in result.data).toBe(true);
  });

  it('rejects a legacy submission with empty content', () => {
    expect(
      createSubmissionSchema.safeParse({ course: courseId, lesson: lessonId, content: '   ' }).success,
    ).toBe(false);
  });
});

describe('submissionSchema duplicate prevention', () => {
  const uniqueIndexOn = (keys: string): IndexEntry | undefined =>
    indexesOf(Submission.schema).find(
      (entry) =>
        JSON.stringify(entry[0]) === keys &&
        (entry[1] as { unique?: boolean }).unique === true,
    );

  it('allows exactly one submission per assignment and learner', () => {
    expect(uniqueIndexOn('{"assignment":1,"student":1}')).toBeDefined();
  });

  it('still protects the legacy lesson path', () => {
    expect(uniqueIndexOn('{"lesson":1,"student":1}')).toBeDefined();
  });

  it('makes both duplicate keys partial so the paths never collide', () => {
    const indexes = indexesOf(Submission.schema);
    const assignment = indexes.find(
      (entry) => JSON.stringify(entry[0]) === '{"assignment":1,"student":1}',
    );
    const lesson = indexes.find(
      (entry) => JSON.stringify(entry[0]) === '{"lesson":1,"student":1}',
    );

    for (const entry of [assignment, lesson]) {
      const key = Object.keys(entry?.[0] ?? {})[0];
      const options = entry?.[1] as { partialFilterExpression?: Record<string, unknown> };

      expect(options.partialFilterExpression).toEqual({ [key]: { $type: 'objectId' } });
    }
  });
});