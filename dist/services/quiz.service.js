"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllAttempts = exports.listMyAttempts = exports.submitAttempt = exports.gradeAttempt = exports.deleteQuiz = exports.updateQuiz = exports.createQuiz = exports.getQuiz = exports.listCourseQuizzes = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const audit_service_1 = require("./audit.service");
const course_service_1 = require("./course.service");
/** Load a course and assert the caller may manage it. */
const loadOwnedCourse = async (courseId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    return course;
};
const listCourseQuizzes = async (courseId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
    if (!isOwner && course.status !== 'published')
        throw ApiError_1.ApiError.notFound('Course not found');
    const quizzes = await models_1.Quiz.find({ course: courseId, isDeleted: false }).sort({ createdAt: 1 });
    return isOwner ? quizzes : quizzes.map((quiz) => (0, models_1.sanitiseQuizForStudent)(quiz.toJSON()));
};
exports.listCourseQuizzes = listCourseQuizzes;
/**
 * Returns a quiz with the answer key intact for owners/admins and stripped for
 * everyone else.
 */
const getQuiz = async (id, user) => {
    const quiz = await models_1.Quiz.findOne({ _id: id, isDeleted: false }).populate('course', 'title slug status instructor');
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    const course = quiz.course;
    const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
    if (isOwner)
        return quiz;
    if (!quiz.isPublished)
        throw ApiError_1.ApiError.forbidden('This quiz is not available');
    const enrolled = await models_1.Enrollment.exists({
        course: quiz.course,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrolled)
        throw ApiError_1.ApiError.forbidden('Enrol in this course to take the quiz');
    return (0, models_1.sanitiseQuizForStudent)(quiz.toJSON());
};
exports.getQuiz = getQuiz;
const createQuiz = async (courseId, input, user, req) => {
    await loadOwnedCourse(courseId, user);
    if (input.lesson) {
        const lesson = await models_1.Lesson.findOne({ _id: input.lesson, course: courseId, isDeleted: false });
        if (!lesson)
            throw ApiError_1.ApiError.notFound('Lesson not found in this course');
    }
    const quiz = await models_1.Quiz.create({ ...input, course: courseId });
    await (0, audit_service_1.recordAudit)({
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
exports.createQuiz = createQuiz;
const updateQuiz = async (id, input, user, req) => {
    const quiz = await models_1.Quiz.findOne({ _id: id, isDeleted: false });
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    await loadOwnedCourse(quiz.course.toString(), user);
    Object.assign(quiz, input);
    await quiz.save();
    await (0, audit_service_1.recordAudit)({
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
exports.updateQuiz = updateQuiz;
const deleteQuiz = async (id, user, req) => {
    const quiz = await models_1.Quiz.findOne({ _id: id, isDeleted: false });
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    await loadOwnedCourse(quiz.course.toString(), user);
    quiz.isDeleted = true;
    await quiz.save();
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'quiz.delete',
        entity: 'Quiz',
        entityId: id,
    });
};
exports.deleteQuiz = deleteQuiz;
/**
 * Grades a set of answers against a quiz. Pure function, unit tested.
 *
 * `single`/`truefalse` require an exact match of the correct option set;
 * `multiple` requires the full set of correct options and nothing extra;
 * `short` compares trimmed, case-insensitive text.
 */
const gradeAttempt = (quiz, answers) => {
    const answerMap = new Map(answers.map((answer) => [answer.question, answer]));
    const graded = [];
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
        }
        else {
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
exports.gradeAttempt = gradeAttempt;
/** Submits an attempt, grades it server side and stores the result. */
const submitAttempt = async (quizId, input, user) => {
    const quiz = await models_1.Quiz.findOne({ _id: quizId, isDeleted: false });
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    if (!quiz.isPublished)
        throw ApiError_1.ApiError.forbidden('This quiz is not available');
    const enrollment = await models_1.Enrollment.findOne({
        course: quiz.course,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrollment)
        throw ApiError_1.ApiError.forbidden('Enrol in this course to take the quiz');
    const attemptNumber = (await models_1.Attempt.countDocuments({ quiz: quizId, student: user.id })) + 1;
    if (attemptNumber > quiz.maxAttempts) {
        throw ApiError_1.ApiError.badRequest(`You have used all ${quiz.maxAttempts} attempts for this quiz`);
    }
    const result = (0, exports.gradeAttempt)(quiz, input.answers);
    const attempt = await models_1.Attempt.create({
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
        const previous = await models_1.Attempt.find({
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
exports.submitAttempt = submitAttempt;
const listMyAttempts = async (quizId, user) => {
    const quiz = await models_1.Quiz.findById(quizId);
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    return models_1.Attempt.find({ quiz: quizId, student: user.id }).sort({ attemptNumber: 1 });
};
exports.listMyAttempts = listMyAttempts;
const listAllAttempts = async (quizId, user, query) => {
    const quiz = await models_1.Quiz.findById(quizId);
    if (!quiz)
        throw ApiError_1.ApiError.notFound('Quiz not found');
    await loadOwnedCourse(quiz.course.toString(), user);
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = { quiz: quizId };
    if (query.passed !== undefined)
        filter.passed = query.passed;
    const [items, total] = await Promise.all([
        models_1.Attempt.find(filter)
            .populate('student', 'fullName email avatarUrl')
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Attempt.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listAllAttempts = listAllAttempts;
//# sourceMappingURL=quiz.service.js.map