/**
 * Barrel export for the model layer. Importing from `./models` keeps service
 * and controller code free of long relative paths.
 */
export { User, toUserResponse, type IUser, type RefreshToken, type UserDocument } from './user.model';
export { Category, type ICategory, type CategoryDocument } from './category.model';
export { Course, COURSE_LIST_FIELDS, type ICourse, type CourseDocument } from './course.model';
export { CourseModule, type IModule, type ModuleDocument } from './module.model';
export { Lesson, type ILesson, type LessonDocument } from './lesson.model';
export {
  Assignment,
  gradePercentage,
  isOverdue,
  type IAssignment,
  type AssignmentDocument,
} from './assignment.model';
export {
  Quiz,
  sanitiseQuizForStudent,
  type IQuestion,
  type IQuiz,
  type QuizDocument,
} from './quiz.model';
export {
  Enrollment,
  calculateProgress,
  type IEnrollment,
  type EnrollmentDocument,
} from './enrollment.model';
export { Attempt, type AttemptAnswer, type IAttempt } from './attempt.model';
export { Submission, type ISubmission } from './submission.model';
export {
  Certificate,
  buildSerialNumber,
  type ICertificate,
  type CertificateDocument,
} from './certificate.model';
export { Rating, type IRating } from './rating.model';
export { Notification, type INotification } from './notification.model';
export { AuditLog, type IAuditLog } from './auditlog.model';
export {
  StudyTask,
  type IStudyTask,
  type StudyTaskDocument,
  type StudyTaskPriority,
  type StudyTaskStatus,
  type StudyTaskSource,
} from './study-task.model';

