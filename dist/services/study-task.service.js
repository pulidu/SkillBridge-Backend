"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstructorPlannerStats = exports.getAdminPlannerStats = exports.getStudentPlannerStats = exports.getWeeklySchedule = exports.generateSuggestions = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.createTask = exports.listTasks = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
/**
 * List personal study tasks for the authenticated student.
 */
const listTasks = async (user, filters) => {
    const query = {
        student: user.id,
    };
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }
    if (filters.courseId && mongoose_1.default.isValidObjectId(filters.courseId)) {
        query.course = filters.courseId;
    }
    if (filters.from || filters.to) {
        const dateQuery = {};
        if (filters.from)
            dateQuery.$gte = new Date(filters.from);
        if (filters.to)
            dateQuery.$lte = new Date(filters.to);
        query.dueDate = mongoose_1.default.trusted(dateQuery);
    }
    const tasks = await models_1.StudyTask.find(query)
        .populate('course', 'title slug')
        .populate('assignment', 'title dueDate maxMarks')
        .sort({ dueDate: 1, priority: -1 });
    return tasks;
};
exports.listTasks = listTasks;
/**
 * Create a personal study task manually.
 */
const createTask = async (user, input) => {
    const task = await models_1.StudyTask.create({
        student: user.id,
        course: input.courseId,
        assignment: input.assignmentId,
        title: input.title,
        description: input.description,
        dueDate: new Date(input.dueDate),
        estimatedStudyMinutes: input.estimatedStudyMinutes ?? 60,
        priority: input.priority ?? 'medium',
        status: 'todo',
        source: input.assignmentId ? 'assignment' : 'manual',
    });
    return task;
};
exports.createTask = createTask;
/**
 * Get task details by ID (enforces ownership).
 */
const getTaskById = async (taskId, user) => {
    const task = await models_1.StudyTask.findOne({ _id: taskId, student: user.id })
        .populate('course', 'title slug')
        .populate('assignment', 'title dueDate maxMarks');
    if (!task) {
        throw ApiError_1.ApiError.notFound('Study task not found or unauthorized');
    }
    return task;
};
exports.getTaskById = getTaskById;
/**
 * Update an existing task (enforces ownership).
 */
const updateTask = async (taskId, user, input) => {
    const task = await models_1.StudyTask.findOne({ _id: taskId, student: user.id });
    if (!task) {
        throw ApiError_1.ApiError.notFound('Study task not found or unauthorized');
    }
    if (input.title !== undefined)
        task.title = input.title;
    if (input.description !== undefined)
        task.description = input.description;
    if (input.dueDate !== undefined)
        task.dueDate = new Date(input.dueDate);
    if (input.estimatedStudyMinutes !== undefined)
        task.estimatedStudyMinutes = input.estimatedStudyMinutes;
    if (input.priority !== undefined)
        task.priority = input.priority;
    if (input.status !== undefined) {
        task.status = input.status;
        if (input.status === 'completed' && !task.completedAt) {
            task.completedAt = new Date();
        }
        else if (input.status !== 'completed') {
            task.completedAt = undefined;
        }
    }
    await task.save();
    return task;
};
exports.updateTask = updateTask;
/**
 * Delete a study task (only manual tasks or owned tasks can be deleted).
 */
const deleteTask = async (taskId, user) => {
    const task = await models_1.StudyTask.findOne({ _id: taskId, student: user.id });
    if (!task) {
        throw ApiError_1.ApiError.notFound('Study task not found or unauthorized');
    }
    await task.deleteOne();
    return { id: taskId, deleted: true };
};
exports.deleteTask = deleteTask;
/**
 * Suggestion Engine:
 * Generates tasks from upcoming assignments in courses the student is enrolled in.
 */
const generateSuggestions = async (user) => {
    // 1. Get active enrollments for this student
    const enrollments = await models_1.Enrollment.find({
        student: user.id,
        status: 'active',
    }).select('course');
    const courseIds = enrollments.map((e) => e.course);
    if (courseIds.length === 0) {
        return { createdCount: 0, message: 'No active course enrollments found' };
    }
    // 2. Find all assignments for these courses
    const assignments = await models_1.Assignment.find({
        course: mongoose_1.default.trusted({ $in: courseIds }),
    });
    if (assignments.length === 0) {
        return { createdCount: 0, message: 'No assignments found in enrolled courses' };
    }
    // 3. Find assignments already submitted by this student
    const submissions = await models_1.Submission.find({
        student: user.id,
        assignment: mongoose_1.default.trusted({ $in: assignments.map((a) => a._id) }),
    }).select('assignment');
    const submittedAssignmentIds = new Set(submissions.map((s) => s.assignment?.toString()).filter(Boolean));
    const now = new Date();
    let createdCount = 0;
    for (const assignment of assignments) {
        if (submittedAssignmentIds.has(assignment._id.toString())) {
            continue;
        }
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date(Date.now() + 7 * 86400000);
        const msRemaining = dueDate.getTime() - now.getTime();
        const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
        let priority = 'medium';
        if (daysRemaining <= 2) {
            priority = 'high';
        }
        else if (daysRemaining > 7) {
            priority = 'low';
        }
        const estimatedMinutes = Math.min(180, Math.max(30, (assignment.maxMarks || 50) * 1.5));
        const result = await models_1.StudyTask.findOneAndUpdate({
            student: user.id,
            assignment: assignment._id,
        }, {
            $setOnInsert: {
                student: user.id,
                course: assignment.course,
                assignment: assignment._id,
                title: `Study & Complete: ${assignment.title}`,
                description: assignment.instructions || 'Review course material and complete the assignment requirements.',
                dueDate,
                estimatedStudyMinutes: Math.round(estimatedMinutes),
                priority,
                status: 'todo',
                source: 'assignment',
            },
        }, {
            upsert: true,
            new: false,
        });
        if (!result) {
            createdCount++;
        }
    }
    return {
        createdCount,
        message: `Generated ${createdCount} suggested study task(s) based on upcoming coursework.`,
    };
};
exports.generateSuggestions = generateSuggestions;
/**
 * Weekly Schedule Aggregator:
 * Groups tasks due within a given week (or default current week),
 * calculating study minutes per day, completed vs pending status.
 */
const getWeeklySchedule = async (user, weekStartDateStr) => {
    const startDate = weekStartDateStr ? new Date(weekStartDateStr) : new Date();
    const day = startDate.getDay();
    const diffToMonday = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(startDate.setDate(diffToMonday));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const tasks = await models_1.StudyTask.find({
        student: user.id,
        dueDate: mongoose_1.default.trusted({ $gte: weekStart, $lt: weekEnd }),
    })
        .populate('course', 'title slug')
        .sort({ dueDate: 1 });
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const scheduleByDay = [];
    for (let i = 0; i < 7; i++) {
        const curDay = new Date(weekStart);
        curDay.setDate(curDay.getDate() + i);
        const dateStr = curDay.toISOString().split('T')[0];
        const dayTasks = tasks.filter((t) => {
            const taskDate = new Date(t.dueDate).toISOString().split('T')[0];
            return taskDate === dateStr;
        });
        const totalMinutes = dayTasks.reduce((acc, t) => acc + (t.estimatedStudyMinutes || 0), 0);
        const completedCount = dayTasks.filter((t) => t.status === 'completed').length;
        scheduleByDay.push({
            day: days[i],
            date: dateStr,
            tasks: dayTasks,
            totalMinutes,
            completedCount,
        });
    }
    const totalWeeklyMinutes = tasks.reduce((acc, t) => acc + (t.estimatedStudyMinutes || 0), 0);
    const completedWeeklyTasks = tasks.filter((t) => t.status === 'completed').length;
    return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalWeeklyTasks: tasks.length,
        completedWeeklyTasks,
        totalWeeklyMinutes,
        scheduleByDay,
    };
};
exports.getWeeklySchedule = getWeeklySchedule;
/**
 * Planner Analytics & Summary metrics for Student
 */
const getStudentPlannerStats = async (user) => {
    const now = new Date();
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const [allTasks, overdueCount, weekTasks] = await Promise.all([
        models_1.StudyTask.find({ student: user.id }),
        models_1.StudyTask.countDocuments({
            student: user.id,
            status: mongoose_1.default.trusted({ $ne: 'completed' }),
            dueDate: mongoose_1.default.trusted({ $lt: now }),
        }),
        models_1.StudyTask.find({
            student: user.id,
            dueDate: mongoose_1.default.trusted({ $gte: weekStart, $lte: weekEnd }),
        }),
    ]);
    const totalCount = allTasks.length;
    const completedCount = allTasks.filter((t) => t.status === 'completed').length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const remainingMinutes = allTasks
        .filter((t) => t.status !== 'completed')
        .reduce((sum, t) => sum + (t.estimatedStudyMinutes || 0), 0);
    return {
        totalTasks: totalCount,
        completedTasks: completedCount,
        completionRate,
        overdueTasks: overdueCount,
        tasksDueThisWeek: weekTasks.length,
        remainingStudyMinutes: remainingMinutes,
    };
};
exports.getStudentPlannerStats = getStudentPlannerStats;
/**
 * Admin Planner Analytics (Platform-wide)
 */
const getAdminPlannerStats = async () => {
    const now = new Date();
    const nextTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [activePlannerUsers, totalTasks, completedTasks, assignmentTasks, upcomingDeadlines] = await Promise.all([
        models_1.StudyTask.distinct('student'),
        models_1.StudyTask.countDocuments({}),
        models_1.StudyTask.countDocuments({ status: 'completed' }),
        models_1.StudyTask.countDocuments({ source: 'assignment' }),
        models_1.Assignment.countDocuments({ dueDate: mongoose_1.default.trusted({ $gte: now, $lte: nextTwoWeeks }) }),
    ]);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
        activePlannerStudentsCount: activePlannerUsers.length,
        totalPlannerTasks: totalTasks,
        assignmentLinkedTasksCount: assignmentTasks,
        overallCompletionRate: completionRate,
        upcomingAssignmentDeadlinesCount: upcomingDeadlines,
    };
};
exports.getAdminPlannerStats = getAdminPlannerStats;
/**
 * Instructor Planner Analytics (Aggregated & Privacy-Safe)
 */
const getInstructorPlannerStats = async (user) => {
    const result = await models_1.StudyTask.aggregate([
        {
            $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'courseDetails',
            },
        },
        { $unwind: '$courseDetails' },
        {
            $match: {
                'courseDetails.instructor': new mongoose_1.default.Types.ObjectId(user.id),
                source: 'assignment',
            },
        },
        {
            $group: {
                _id: '$course',
                courseTitle: { $first: '$courseDetails.title' },
                totalAssignmentTasks: { $sum: 1 },
                completedAssignmentTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                courseId: '$_id',
                courseTitle: 1,
                totalAssignmentTasks: 1,
                completedAssignmentTasks: 1,
                completionRate: {
                    $cond: [
                        { $gt: ['$totalAssignmentTasks', 0] },
                        { $round: [{ $multiply: [{ $divide: ['$completedAssignmentTasks', '$totalAssignmentTasks'] }, 100] }] },
                        0,
                    ],
                },
            },
        },
    ]);
    return {
        courses: result,
    };
};
exports.getInstructorPlannerStats = getInstructorPlannerStats;
//# sourceMappingURL=study-task.service.js.map