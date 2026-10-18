import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  Attempt,
  Category,
  Certificate,
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  Notification,
  Quiz,
  Rating,
  Submission,
  User,
} from '../models';
import { hashPassword } from '../services/auth.service';
import { issueCertificate } from '../services/enrollment.service';
import { recalculateCourseRatings, recalculateCourseStats } from '../services/course.service';

/**
 * Loads demonstration data for local development.
 *
 * DESTRUCTIVE: clears the collections it touches. All accounts use the single
 * password from `SEED_PASSWORD` in `.env` - never a committed secret.
 */

const PASSWORD = env.seedPassword;

const CATEGORIES = [
  { name: 'Web Development', description: 'Frontend, backend and full-stack engineering.', icon: 'code' },
  { name: 'Data Science', description: 'Analytics, machine learning and statistics.', icon: 'chart' },
  { name: 'Business', description: 'Management, strategy and finance.', icon: 'briefcase' },
  { name: 'Design', description: 'UI, UX and visual communication.', icon: 'palette' },
  { name: 'Languages', description: 'Spoken and written language learning.', icon: 'globe' },
  { name: 'Personal Development', description: 'Productivity, career and soft skills.', icon: 'sparkles' },
];

interface CourseSeed {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  instructorEmail: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  tags: string[];
  status: 'draft' | 'published';
  modules: { title: string; lessons: { title: string; type: 'video' | 'article' | 'quiz' | 'assignment'; minutes: number; preview?: boolean }[] }[];
}

const COURSES: CourseSeed[] = [
  {
    title: 'Modern TypeScript for Web Developers',
    shortDescription: 'Master the type system, generics and tooling behind modern TypeScript.',
    description:
      'A practical tour of TypeScript for working web developers. Covers the type system, generics, narrowing, module patterns, and how to configure a strict, production-ready tsconfig across both a Node API and a React front end.',
    category: 'Web Development',
    instructorEmail: 'elena@skillbridge.test',
    level: 'intermediate',
    price: 79,
    tags: ['typescript', 'javascript', 'tooling'],
    status: 'published',
    modules: [
      {
        title: 'Getting started',
        lessons: [
          { title: 'Why TypeScript', type: 'video', minutes: 12, preview: true },
          { title: 'Setting up a strict tsconfig', type: 'article', minutes: 15, preview: true },
          { title: 'Compiler options explained', type: 'article', minutes: 20 },
        ],
      },
      {
        title: 'The type system',
        lessons: [
          { title: 'Union and intersection types', type: 'article', minutes: 25 },
          { title: 'Narrowing and type guards', type: 'article', minutes: 30 },
          { title: 'Generics in practice', type: 'article', minutes: 35 },
        ],
      },
      {
        title: 'Assessment',
        lessons: [
          { title: 'TypeScript checkpoint quiz', type: 'quiz', minutes: 15 },
          { title: 'Refactor a legacy module', type: 'assignment', minutes: 60 },
        ],
      },
    ],
  },
  {
    title: 'React Patterns and State Management',
    shortDescription: 'Component composition, hooks and scalable state with Redux Toolkit.',
    description:
      'Build React applications that stay maintainable as they grow. Covers component composition, custom hooks, when to reach for server state versus client state, Redux Toolkit slices, and RTK Query for data fetching with caching and invalidation.',
    category: 'Web Development',
    instructorEmail: 'elena@skillbridge.test',
    level: 'advanced',
    price: 99,
    tags: ['react', 'redux', 'state'],
    status: 'published',
    modules: [
      {
        title: 'Component design',
        lessons: [
          { title: 'Composition over configuration', type: 'video', minutes: 18, preview: true },
          { title: 'Designing reusable hooks', type: 'article', minutes: 28 },
        ],
      },
      {
        title: 'State at scale',
        lessons: [
          { title: 'Server state versus client state', type: 'article', minutes: 22 },
          { title: 'Redux Toolkit slices and RTK Query', type: 'article', minutes: 40 },
          { title: 'Route guards with roles', type: 'article', minutes: 25 },
        ],
      },
    ],
  },
  {
    title: 'Building REST APIs with Express and MongoDB',
    shortDescription: 'Layered Node.js APIs with validation, auth and clean data modelling.',
    description:
      'Design and build production-shaped REST APIs. Covers Express middleware ordering, layered architecture with services and controllers, Zod validation, JWT authentication with refresh rotation, and practical Mongoose schema design with indexes and denormalisation.',
    category: 'Web Development',
    instructorEmail: 'marcus@skillbridge.test',
    level: 'intermediate',
    price: 89,
    tags: ['node', 'express', 'mongodb', 'api'],
    status: 'published',
    modules: [
      {
        title: 'API fundamentals',
        lessons: [
          { title: 'Resource design and status codes', type: 'article', minutes: 20, preview: true },
          { title: 'Middleware and the request lifecycle', type: 'video', minutes: 22 },
        ],
      },
      {
        title: 'Data and security',
        lessons: [
          { title: 'Modelling documents in Mongoose', type: 'article', minutes: 30 },
          { title: 'Authentication and token rotation', type: 'article', minutes: 35 },
          { title: 'Input validation and injection defence', type: 'article', minutes: 25 },
        ],
      },
      {
        title: 'Capstone',
        lessons: [
          { title: 'API design quiz', type: 'quiz', minutes: 20 },
          { title: 'Build a validated CRUD module', type: 'assignment', minutes: 120 },
        ],
      },
    ],
  },
  {
    title: 'SQLite and PostgreSQL Fundamentals',
    shortDescription: 'Relational modelling, joins, indexes and query performance.',
    description:
      'Understand relational databases properly. Covers table design, normalisation, primary and foreign keys, inner and outer joins, aggregation, index selection, and reading a query plan to find performance problems.',
    category: 'Data Science',
    instructorEmail: 'marcus@skillbridge.test',
    level: 'beginner',
    price: 0,
    tags: ['sql', 'postgres', 'database'],
    status: 'published',
    modules: [
      {
        title: 'Thinking in tables',
        lessons: [
          { title: 'Rows, columns and keys', type: 'video', minutes: 16, preview: true },
          { title: 'Normalisation without the jargon', type: 'article', minutes: 24 },
        ],
      },
      {
        title: 'Querying',
        lessons: [
          { title: 'Joins explained visually', type: 'article', minutes: 26 },
          { title: 'Aggregation and GROUP BY', type: 'article', minutes: 30 },
          { title: 'Reading a query plan', type: 'article', minutes: 20 },
        ],
      },
    ],
  },
  {
    title: 'Statistics for Data Analysis',
    shortDescription: 'Descriptive statistics, distributions and confidence in conclusions.',
    description:
      'Build the statistical intuition needed to analyse data responsibly. Covers central tendency and spread, common distributions, sampling and bias, hypothesis testing at an accessible level, and how to avoid over-reading a result.',
    category: 'Data Science',
    instructorEmail: 'marcus@skillbridge.test',
    level: 'beginner',
    price: 49,
    tags: ['statistics', 'analytics'],
    status: 'published',
    modules: [
      {
        title: 'Describing data',
        lessons: [
          { title: 'Mean, median and mode', type: 'video', minutes: 14, preview: true },
          { title: 'Spread and outliers', type: 'article', minutes: 22 },
        ],
      },
      {
        title: 'Drawing conclusions',
        lessons: [
          { title: 'Sampling and bias', type: 'article', minutes: 26 },
          { title: 'Reading significance responsibly', type: 'article', minutes: 30 },
        ],
      },
    ],
  },
  {
    title: 'Project Management Essentials',
    shortDescription: 'Plan, estimate and deliver work that survives contact with reality.',
    description:
      'A practical introduction to managing delivery. Covers scoping, breaking work down, estimation techniques, stakeholder communication, risk tracking, and the ceremonies that keep a team aligned without filling every calendar.',
    category: 'Business',
    instructorEmail: 'elena@skillbridge.test',
    level: 'beginner',
    price: 59,
    tags: ['project-management', 'leadership'],
    status: 'published',
    modules: [
      {
        title: 'Scoping and planning',
        lessons: [
          { title: 'Turning a request into a scope', type: 'video', minutes: 20, preview: true },
          { title: 'Breaking work down', type: 'article', minutes: 22 },
        ],
      },
      {
        title: 'Delivery',
        lessons: [
          { title: 'Estimation and buffers', type: 'article', minutes: 26 },
          { title: 'Risk registers that get used', type: 'article', minutes: 18 },
        ],
      },
    ],
  },
  {
    title: 'UI Design Fundamentals',
    shortDescription: 'Layout, hierarchy, colour and building a coherent visual system.',
    description:
      'Learn the visual fundamentals that make interfaces feel considered. Covers layout and spacing systems, typographic hierarchy, colour and contrast, component states, and assembling these into a design system that scales.',
    category: 'Design',
    instructorEmail: 'elena@skillbridge.test',
    level: 'beginner',
    price: 69,
    tags: ['ui', 'design-systems', 'figma'],
    status: 'published',
    modules: [
      {
        title: 'Visual hierarchy',
        lessons: [
          { title: 'Layout and the grid', type: 'video', minutes: 18, preview: true },
          { title: 'Type scale and rhythm', type: 'article', minutes: 24 },
        ],
      },
      {
        title: 'Systems',
        lessons: [
          { title: 'Colour, contrast and accessibility', type: 'article', minutes: 28 },
          { title: 'Component states and variants', type: 'article', minutes: 26 },
        ],
      },
    ],
  },
  {
    title: 'Conversational Spanish for Beginners',
    shortDescription: 'Everyday Spanish through real dialogue and spaced repetition.',
    description:
      'Start speaking Spanish. Covers pronunciation, high-frequency vocabulary presented in context, present-tense conjugation, everyday conversation patterns, and a spaced repetition routine that keeps vocabulary available.',
    category: 'Languages',
    instructorEmail: 'marcus@skillbridge.test',
    level: 'beginner',
    price: 39,
    tags: ['spanish', 'language'],
    status: 'draft',
    modules: [
      {
        title: 'Getting started',
        lessons: [
          { title: 'Pronunciation that works', type: 'video', minutes: 15 },
          { title: 'Core vocabulary', type: 'article', minutes: 25 },
        ],
      },
    ],
  },
];

const reset = async (): Promise<void> => {
  logger.info('Clearing existing collections');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Course.deleteMany({}),
    CourseModule.deleteMany({}),
    Lesson.deleteMany({}),
    Quiz.deleteMany({}),
    Enrollment.deleteMany({}),
    Attempt.deleteMany({}),
    Submission.deleteMany({}),
    Certificate.deleteMany({}),
    Rating.deleteMany({}),
    Notification.deleteMany({}),
  ]);
};

const seed = async (): Promise<void> => {
  await connectDatabase();
  await reset();

  const password = await hashPassword(PASSWORD);

  /* ------------------------------- accounts ------------------------------- */
  const [admin, elena, marcus, amina, ben, chloe] = await User.create([
    { fullName: 'Ada Admin', email: 'admin@skillbridge.test', password, roles: ['admin'] },
    { fullName: 'Elena Vargas', email: 'elena@skillbridge.test', password, roles: ['instructor'] },
    { fullName: 'Marcus Chen', email: 'marcus@skillbridge.test', password, roles: ['instructor'] },
    { fullName: 'Amina Yusuf', email: 'amina@skillbridge.test', password, roles: ['student'] },
    { fullName: 'Ben Okafor', email: 'ben@skillbridge.test', password, roles: ['student'] },
    { fullName: 'Chloe Dubois', email: 'chloe@skillbridge.test', password, roles: ['student'] },
  ]);

  const instructorsByEmail: Record<string, typeof elena> = {
    'elena@skillbridge.test': elena,
    'marcus@skillbridge.test': marcus,
  };

  /* ------------------------------- categories ----------------------------- */
  const createdCategories = await Category.create(CATEGORIES);
  const categoryByName = new Map(createdCategories.map((c) => [c.name, c._id]));

  /* -------------------------------- courses ------------------------------- */
  const students = [amina, ben, chloe];
  let enrolmentCount = 0;

  for (const seedCourse of COURSES) {
    const categoryId = categoryByName.get(seedCourse.category);
    const instructor = instructorsByEmail[seedCourse.instructorEmail];

    if (!categoryId || !instructor) {
      logger.warn({ course: seedCourse.title }, 'Skipping course with unresolved references');
      continue;
    }

    const slug = seedCourse.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const course = await Course.create({
      title: seedCourse.title,
      slug,
      shortDescription: seedCourse.shortDescription,
      description: seedCourse.description,
      category: categoryId,
      instructor: instructor._id,
      level: seedCourse.level,
      price: seedCourse.price,
      tags: seedCourse.tags,
      outcomes: [
        `Apply the core ideas from "${seedCourse.title}" to real projects.`,
        'Evaluate common approaches and choose appropriately.',
      ],
      requirements: ['No prior experience required.'],
      status: seedCourse.status,
      publishedAt: seedCourse.status === 'published' ? new Date() : undefined,
    });

    let lessonPosition = 0;

    for (const [moduleIndex, seedModule] of seedCourse.modules.entries()) {
      const module = await CourseModule.create({
        course: course._id,
        title: seedModule.title,
        position: moduleIndex + 1,
      });

      for (const seedLesson of seedModule.lessons) {
        lessonPosition += 1;

        await Lesson.create({
          course: course._id,
          module: module._id,
          title: seedLesson.title,
          slug: `${slug}-${lessonPosition}`,
          content: `## ${seedLesson.title}\n\nThis seeded lesson body is placeholder content for local development. Replace it with real material from the lesson editor.`,
          type: seedLesson.type,
          position: lessonPosition,
          durationMinutes: seedLesson.minutes,
          isPreview: seedLesson.preview ?? false,
          isPublished: seedCourse.status === 'published',
        });
      }
    }

    /* One quiz per published course so attempts can be demonstrated. */
    if (seedCourse.status === 'published') {
      await Quiz.create({
        course: course._id,
        title: `${seedCourse.title} - checkpoint`,
        description: 'A short check that you have absorbed the key ideas.',
        passingScore: 70,
        maxAttempts: 3,
        isPublished: true,
        questions: [
          {
            text: 'Which statement best describes the main goal of this course?',
            type: 'single',
            points: 1,
            explanation: 'The opening lesson states the goal explicitly.',
            options: [
              { text: 'Build practical, job-relevant skills', isCorrect: true },
              { text: 'Memorise documentation', isCorrect: false },
              { text: 'Pass an exam without practice', isCorrect: false },
            ],
          },
          {
            text: 'Which activities are part of the curriculum?',
            type: 'multiple',
            points: 2,
            options: [
              { text: 'Reading material', isCorrect: true },
              { text: 'Hands-on exercises', isCorrect: true },
              { text: 'Passive note taking only', isCorrect: false },
            ],
          },
          {
            text: 'Completing every lesson guarantees a certificate.',
            type: 'truefalse',
            points: 1,
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
            ],
          },
        ],
      });
    }

    await recalculateCourseStats(course._id);

    /* Enrol a rotating subset of students, with partial progress. */
    if (seedCourse.status === 'published') {
      const enrollees = students.slice(0, (enrolmentCount % 3) + 1);

      for (const [index, student] of enrollees.entries()) {
        const lessons = await Lesson.find({
          course: course._id,
          isDeleted: false,
          isPublished: true,
        })
          .sort({ position: 1 })
          .select('_id durationMinutes');

        if (lessons.length === 0) continue;

        const completedCount = Math.min(lessons.length, index + 1);
        const completed = lessons.slice(0, completedCount);

        await Enrollment.create({
          course: course._id,
          student: student._id,
          status: completedCount === lessons.length ? 'completed' : 'active',
          completedLessons: completed.map((lesson) => lesson._id),
          timeSpentMinutes: completed.reduce(
            (sum, lesson) => sum + (lesson.durationMinutes ?? 0),
            0,
          ),
          lastAccessedAt: new Date(Date.now() - index * 86_400_000),
          completedAt: completedCount === lessons.length ? new Date() : undefined,
        });

        if (completedCount === lessons.length) {
          await issueCertificate(
            (
              await Enrollment.findOne({ course: course._id, student: student._id })
            )?._id.toString() ?? '',
            student._id.toString(),
          );
        }

        enrolmentCount += 1;
      }
    }

    await recalculateCourseRatings(course._id);
  }

  /* --------------------------------- reviews ------------------------------ */
  const publishedCourses = await Course.find({ status: 'published' }).select('_id title');

  for (const course of publishedCourses.slice(0, 4)) {
    const reviewer = students[publishedCourses.indexOf(course) % students.length];
    await Rating.create({
      course: course._id,
      user: reviewer._id,
      value: 4 + (publishedCourses.indexOf(course) % 2),
      review: 'Clear explanations and well-paced exercises. Would recommend it.',
    });
    await recalculateCourseRatings(course._id.toString());
  }

  /* ------------------------------ notifications --------------------------- */
  await Notification.create([
    {
      user: amina._id,
      type: 'announcement',
      title: 'Welcome to SkillBridge',
      message: 'Browse the catalogue and enrol in your first course to get started.',
      link: '/courses',
    },
    {
      user: elena._id,
      type: 'system',
      title: 'Draft awaiting review',
      message: 'A course of yours is still in draft. Publish it to reach learners.',
      link: '/instructor/courses',
    },
  ]);

  const counts = {
    users: await User.countDocuments(),
    categories: await Category.countDocuments(),
    courses: await Course.countDocuments(),
    modules: await CourseModule.countDocuments(),
    lessons: await Lesson.countDocuments(),
    quizzes: await Quiz.countDocuments(),
    enrollments: await Enrollment.countDocuments(),
    ratings: await Rating.countDocuments(),
    certificates: await Certificate.countDocuments(),
  };

  /* eslint-disable no-console */
  console.log('\nSeed complete:');
  console.table(counts);
  console.log('\nAccounts (all share the SEED_PASSWORD value from .env):');
  console.table([
    { role: 'admin', email: admin.email },
    { role: 'instructor', email: elena.email },
    { role: 'instructor', email: marcus.email },
    { role: 'student', email: amina.email },
    { role: 'student', email: ben.email },
    { role: 'student', email: chloe.email },
  ]);
  console.log('\nSet a new role from the admin UI at /admin/users.\n');
};

seed()
  .then(async () => {
    await disconnectDatabase();
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error({ err: error }, 'Seeding failed');
    await disconnectDatabase();
    process.exit(1);
  });
