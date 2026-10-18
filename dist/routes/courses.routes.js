"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const course_validator_1 = require("../validators/course.validator");
const router = (0, express_1.Router)();
/* Public: featured courses power the landing page for anonymous visitors.
   Registered before `authenticate` so it stays readable without a session,
   while the service still exposes published, non-deleted courses only. */
router.get('/featured', controllers_1.courseController.listFeaturedCourses);
router.use(auth_middleware_1.authenticate);
/* Collection reads, available to every authenticated role. Students only
   ever see published courses - the service applies that filter. */
router.get('/', (0, validate_middleware_1.validate)({ query: course_validator_1.listCoursesSchema }), controllers_1.courseController.listCourses);
/* Creation is limited to instructors and admins. */
router.post('/', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ body: course_validator_1.createCourseSchema }), controllers_1.courseController.createCourse);
/* Read a course by slug. Registered before `/:id` so "slug" is never treated
   as an identifier. */
router.get('/slug/:slug', (0, validate_middleware_1.validate)({ params: course_validator_1.courseSlugParamsSchema }), controllers_1.courseController.getCourseBySlug);
router.get('/:id', (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.getCourse);
/* Mutations require ownership, asserted in the service layer. */
router.patch('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema, body: course_validator_1.updateCourseSchema }), controllers_1.courseController.updateCourse);
router.delete('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.deleteCourse);
/* Reassigning the owner is an administrative act, so it is admin only and has
   its own endpoint rather than riding along on the general content PATCH. */
router.patch('/:id/instructor', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema, body: course_validator_1.assignInstructorSchema }), controllers_1.courseController.assignCourseInstructor);
router.patch('/:id/publish', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.publishCourse);
router.patch('/:id/unpublish', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.unpublishCourse);
router.patch('/:id/archive', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.archiveCourse);
router.get('/:id/analytics', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.getCourseAnalytics);
router.get('/:id/students', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema, query: course_validator_1.rosterQuerySchema }), controllers_1.courseController.getCourseStudents);
router.post('/:id/ratings', (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema, body: course_validator_1.createRatingSchema }), controllers_1.courseController.rateCourse);
router.get('/:id/ratings', (0, validate_middleware_1.validate)({ params: course_validator_1.courseParamsSchema }), controllers_1.courseController.listCourseRatings);
exports.default = router;
//# sourceMappingURL=courses.routes.js.map