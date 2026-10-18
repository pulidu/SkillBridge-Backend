import type { Request } from 'express';
import { Attempt, Course, Enrollment, Lesson, Quiz, sanitiseQuizForStudent } from '../models';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { CreateQuizInput, SubmitAttemptInput, UpdateQuizInput } from '../validators/quiz.validator';
import { recordAudit } from './audit.service';
import { assertCourseOwnership } from './course.service';

/** Load a course and assert the caller may manage it. */
const loadOwnedCourse = async (courseId: string, user: AuthUser) => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');
  assertCourseOwnership(course, user);
  return course;
};

export const listCourseQuizzes = async (
  courseId: string,
  user: AuthUser,
): Promise<unknown[]> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
  if (!isOwner && course.status !== 'published') throw ApiError.notFound('Course not found');

  const quizzes = await Quiz.find({ course: courseId, isDeleted: false }).sort({ createdAt: 1 });
  return isOwner ? quizzes : quizzes.map((quiz) => sanitiseQuizForStudent(quiz.toJSON()));
};

/**
 * Returns a quiz with the answer key intact for owners/admins and stripped for
 * everyone else.
 */
export const getQuiz = async (id: string, user: AuthUser): Promise<unknown> => {
  const quiz = await Quiz.findOne({ _id: id, isDeleted: false }).populate(
    'course',
    'title slug status instructor',
  );
  if (!quiz) throw ApiError.notFound('Quiz not found');

  const course = quiz.course as unknown as {
    instructor: { toString(): string };
    status: string;
  };

  const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
  if (isOwner) return quiz;

  if (!quiz.isPublished) throw ApiError.forbidden('This quiz is not available');

  const enrolled = await Enrollment.exists({
    course: quiz.course,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });
  if (!enrolled) throw ApiError.forbidden('Enrol in this course to take the quiz');

  return sanitiseQuizForStudent(quiz.toJSON());
};

export const createQuiz = async (
  courseId: string,
  input: CreateQuizInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  await loadOwnedCourse(courseId, user);

  if (input.lesson) {
    const lesson = await Lesson.findOne({ _id: input.lesson, course: courseId, isDeleted: false });
    if (!lesson) throw ApiError.notFound('Lesson not found in this course');
  }

  const quiz = await Quiz.create({ ...input, course: courseId });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'quiz.create',
    entity: 'Quiz',
    entityId: String(quiz._id),
    meta: { course: courseId, title: quiz.title, questions: quiz.questions.length },
  });

  return quiz;
};

export const updateQuiz = async (
  id: string,
  input: UpdateQuizInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const quiz = await Quiz.findOne({ _id: id, isDeleted: false });
  if (!quiz) throw ApiError.notFound('Quiz not found');

  await loadOwnedCourse(quiz.course.toString(), user);

  Object.assign(quiz, input);
  await quiz.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'quiz.update',
    entity: 'Quiz',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return quiz;
};

export const deleteQuiz = async (id: string, user: AuthUser, req: Request): Promise<void> => {
  const quiz = await Quiz.findOne({ _id: id, isDeleted: false });
  if (!quiz) throw ApiError.notFound('Quiz not found');

  await loadOwnedCourse(quiz.course.toString(), user);

  quiz.isDeleted = true;
  await quiz.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'quiz.delete',
    entity: 'Quiz',
    entityId: id,
  });
};

/* -------------------------------------------------------------------------- */
/* Attempts                                                                    */
/* -------------------------------------------------------------------------- */

export interface GradedAnswer {
  question: string;
  selectedOptionIds: string[];
  textAnswer?: string;
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswer?: string;
  explanation?: string;
}

export interface GradeResult {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

/** Minimal structural view of a quiz, so grading is easy to unit test. */
export interface GradableQuiz {
  passingScore: number;
  questions: {
    _id?: unknown;
    type: string;
    options: { _id?: unknown; text: string; isCorrect: boolean }[];
    correctAnswer?: string;
    points: number;
    explanation?: string;
  }[];
}

/**
 * Grades a set of answers against a quiz. Pure function, unit tested.
 *
 * `single`/`truefalse` require an exact match of the correct option set;
 * `multiple` requires the full set of correct options and nothing extra;
 * `short` compares trimmed, case-insensitive text.
 */
export const gradeAttempt = (
  quiz: GradableQuiz,
  answers: SubmitAttemptInput['answers'],
): GradeResult => {
  const answerMap = new Map(answers.map((answer) => [answer.question, answer]));

  const graded: GradedAnswer[] = [];
  let score = 0;
  let maxScore = 0;

  for (const question of quiz.questions) {
    const questionId = String(question._id);
    const points = question.points ?? 1;
    maxScore += points;

    const answer = answerMap.get(questionId);
    if (!answer) {
      graded.push({
        question: questionId,
        selectedOptionIds: [],
        isCorrect: false,
        pointsAwarded: 0,
        explanation: question.explanation,
      });
      continue;
    }

    let isCorrect = false;

    if (question.type === 'short') {
      const expected = (question.correctAnswer ?? '').trim().toLowerCase();
      const given = (answer.textAnswer ?? '').trim().toLowerCase();
      isCorrect = expected.length > 0 && expected === given;
    } else {
      const correctIds = question.options
        .filter((option) => option.isCorrect)
        .map((option) => String(option._id))
        .sort();

      const selected = [...new Set(answer.selectedOptionIds)].sort();
      isCorrect =
        correctIds.length > 0 &&
        correctIds.length === selected.length &&
        correctIds.every((id, index) => id === selected[index]);
    }

    const pointsAwarded = isCorrect ? points : 0;
    score += pointsAwarded;

    graded.push({
      question: questionId,
      selectedOptionIds: answer.selectedOptionIds,
      textAnswer: answer.textAnswer,
      isCorrect,
      pointsAwarded,
      explanation: question.explanation,
    });
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    answers: graded,
    score,
    maxScore,
    percentage,
    passed: percentage >= quiz.passingScore,
  };
};

/** Submits an attempt, grades it server side and stores the result. */
export const submitAttempt = async (
  quizId: string,
  input: SubmitAttemptInput,
  user: AuthUser,
): Promise<unknown> => {
  const quiz = await Quiz.findOne({ _id: quizId, isDeleted: false });
  if (!quiz) throw ApiError.notFound('Quiz not found');
  if (!quiz.isPublished) throw ApiError.forbidden('This quiz is not available');

  const enrollment = await Enrollment.findOne({
    course: quiz.course,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });
  if (!enrollment) throw ApiError.forbidden('Enrol in this course to take the quiz');

  const attemptNumber = (await Attempt.countDocuments({ quiz: quizId, student: user.id })) + 1;
  if (attemptNumber > quiz.maxAttempts) {
    throw ApiError.badRequest(`You have used all ${quiz.maxAttempts} attempts for this quiz`);
  }

  const result = gradeAttempt(quiz, input.answers);

  const attempt = await Attempt.create({
    quiz: quiz._id,
    course: quiz.course,
    student: user.id,
    enrollment: enrollment._id,
    answers: result.answers,
    score: result.score,
    maxScore: result.maxScore,
    percentage: result.percentage,
    passed: result.passed,
    attemptNumber,
    timeSpentSeconds: input.timeSpentSeconds,
  });

  // A passing grade is folded into the enrolment's final score.
  if (result.passed) {
    const previous = await Attempt.find({
      enrollment: enrollment._id,
      quiz: quiz._id,
      passed: true,
    })
      .sort({ percentage: -1 })
      .limit(1);

    const best = previous[0]?.percentage ?? result.percentage;
    enrollment.finalScore = Math.max(enrollment.finalScore ?? 0, best);
    await enrollment.save();
  }

  return {
    attempt,
    explanationByQuestion: quiz.questions.map((question) => ({
      question: String(question._id),
      explanation: question.explanation,
    })),
  };
};

export const listMyAttempts = async (
  quizId: string,
  user: AuthUser,
): Promise<unknown[]> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  return Attempt.find({ quiz: quizId, student: user.id }).sort({ attemptNumber: 1 });
};

export const listAllAttempts = async (
  quizId: string,
  user: AuthUser,
  query: { page?: number; limit?: number; passed?: boolean },
): Promise<{ items: unknown[]; meta: ReturnType<typeof buildPaginationMeta> }> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw ApiError.notFound('Quiz not found');

  await loadOwnedCourse(quiz.course.toString(), user);

  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { quiz: quizId };
  if (query.passed !== undefined) filter.passed = query.passed;

  const [items, total] = await Promise.all([
    Attempt.find(filter)
      .populate('student', 'fullName email avatarUrl')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit),
    Attempt.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};
