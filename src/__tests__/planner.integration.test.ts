import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { env } from '../config/env';
import { Category, Course, Enrollment, User } from '../models';
import { hashPassword } from '../services/auth.service';

const TEST_DB = 'skillbridge_lms_planner_test';
const app = createApp();

let studentToken = '';
let studentId = '';
let instructorToken = '';
let testCourseId = '';

beforeAll(async () => {
  await mongoose.connect(env.mongoUri, { dbName: TEST_DB });
  await mongoose.connection.dropDatabase();

  // Create student
  const studentRes = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Planner Student',
    email: 'planner.student@example.com',
    password: 'Password123',
  });
  studentToken = studentRes.body.data.accessToken;
  studentId = studentRes.body.data.user.id;

  // Create instructor
  const hashedPassword = await hashPassword('Password123');
  const instructor = await User.create({
    fullName: 'Planner Instructor',
    email: 'planner.instructor@example.com',
    password: hashedPassword,
    roles: ['instructor'],
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'planner.instructor@example.com',
    password: 'Password123',
  });
  instructorToken = loginRes.body.data.accessToken;

  // Create category
  const category = await Category.create({
    name: 'Computer Science',
    slug: 'computer-science',
    description: 'Computer Science Courses',
  });

  // Create course
  const course = await Course.create({
    title: 'Planner Test Course',
    slug: 'planner-test-course',
    description: 'Course description for planner tests',
    shortDescription: 'Short description',
    category: category._id,
    instructor: instructor._id,
    status: 'published',
  });
  testCourseId = String(course._id);

  // Enroll student
  await Enrollment.create({
    student: studentId,
    course: testCourseId,
    status: 'active',
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('Smart Study Planner API', () => {
  let createdTaskId = '';

  it('creates a personal study task manually', async () => {
    const res = await request(app)
      .post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Review Chapter 1 Notes',
        description: 'Read slides and summarize key points',
        courseId: testCourseId,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        estimatedStudyMinutes: 45,
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Review Chapter 1 Notes');
    expect(res.body.data.status).toBe('todo');
    expect(res.body.data.source).toBe('manual');
    createdTaskId = res.body.data.id;
  });

  it('lists study tasks with filtering', async () => {
    const res = await request(app)
      .get('/api/v1/planner/tasks?priority=high')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].priority).toBe('high');
  });

  it('updates task status to completed and records completedAt', async () => {
    const res = await request(app)
      .patch(`/api/v1/planner/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'completed',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('returns student planner summary stats', async () => {
    const res = await request(app)
      .get('/api/v1/planner/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    if (res.status !== 200) {
      console.error('Stats error:', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.data.totalTasks).toBeGreaterThanOrEqual(1);
    expect(res.body.data.completedTasks).toBeGreaterThanOrEqual(1);
    expect(res.body.data.completionRate).toBeGreaterThan(0);
  });

  it('returns weekly study schedule', async () => {
    const res = await request(app)
      .get('/api/v1/planner/weekly')
      .set('Authorization', `Bearer ${studentToken}`);

    if (res.status !== 200) {
      console.error('Weekly error:', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.data.scheduleByDay).toBeDefined();
    expect(res.body.data.scheduleByDay.length).toBe(7);
  });

  it('prevents non-students from accessing student planner tasks', async () => {
    const res = await request(app)
      .get('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(403);
  });

  it('deletes a personal study task', async () => {
    const res = await request(app)
      .delete(`/api/v1/planner/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(204);

    const checkRes = await request(app)
      .get(`/api/v1/planner/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(checkRes.status).toBe(404);
  });
});
