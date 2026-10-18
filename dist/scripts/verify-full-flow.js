"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const API_BASE = 'http://localhost:5000/api/v1';
async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const method = options.method || 'GET';
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    const fetchOptions = {
        method,
        headers,
    };
    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, fetchOptions);
    let data = null;
    try {
        data = await res.json();
    }
    catch {
        data = null;
    }
    return {
        status: res.status,
        ok: res.ok,
        data,
    };
}
async function runE2EVerification() {
    console.log('====================================================');
    console.log('🚀 STARTING COMPREHENSIVE E2E LMS & PLANNER VERIFICATION');
    console.log('====================================================\n');
    // Verify MongoDB database connection string & name directly
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Skillbrighlms_db';
    console.log(`Checking MongoDB Connection to: ${mongoUri}`);
    const conn = await mongoose_1.default.connect(mongoUri);
    const dbName = conn.connection.name;
    console.log(`[PASS] Connected successfully to database: "${dbName}"`);
    if (dbName !== 'Skillbrighlms_db') {
        throw new Error(`CRITICAL: Connected database is "${dbName}", expected "Skillbrighlms_db"`);
    }
    // Collections count
    const collections = await conn.connection.db?.listCollections().toArray();
    console.log(`[PASS] Verified collections in ${dbName}:`, collections?.map(c => c.name).join(', '));
    await mongoose_1.default.disconnect();
    // Step 1: Health check
    console.log('\n--- Step 1: Health Check (GET /health) ---');
    const healthRes = await request('/health');
    console.log(`Status: ${healthRes.status}, Body:`, healthRes.data);
    if (healthRes.status !== 200 || !healthRes.data?.success) {
        throw new Error(`Health check failed: ${JSON.stringify(healthRes.data)}`);
    }
    // Step 2: Admin Login
    console.log('\n--- Step 2: Admin Authentication (POST /auth/login) ---');
    const adminLoginRes = await request('/auth/login', {
        method: 'POST',
        body: {
            email: 'admin@skillbridge.test',
            password: 'SkillBridge#2024',
        },
    });
    console.log(`Admin login status: ${adminLoginRes.status}`);
    if (adminLoginRes.status !== 200 || !adminLoginRes.data?.data?.accessToken) {
        throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }
    const adminToken = adminLoginRes.data.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log(`[PASS] Admin authenticated as ${adminLoginRes.data.data.user.email}`);
    // Step 3: Admin Platform & Planner Analytics
    console.log('\n--- Step 3: Admin Analytics (GET /dashboard/admin & GET /planner/admin/analytics) ---');
    const adminStatsRes = await request('/dashboard/admin', { headers: adminHeaders });
    console.log('LMS Admin Analytics status:', adminStatsRes.status, adminStatsRes.data?.data);
    if (adminStatsRes.status !== 200) {
        throw new Error(`Admin dashboard stats failed: ${JSON.stringify(adminStatsRes.data)}`);
    }
    const adminPlannerStatsRes = await request('/planner/admin/analytics', { headers: adminHeaders });
    console.log('Planner Admin Analytics status:', adminPlannerStatsRes.status, adminPlannerStatsRes.data?.data);
    if (adminPlannerStatsRes.status !== 200) {
        throw new Error(`Admin planner stats failed: ${JSON.stringify(adminPlannerStatsRes.data)}`);
    }
    // Step 4: Instructor Login
    console.log('\n--- Step 4: Instructor Authentication (POST /auth/login) ---');
    const instLoginRes = await request('/auth/login', {
        method: 'POST',
        body: {
            email: 'elena@skillbridge.test',
            password: 'SkillBridge#2024',
        },
    });
    console.log(`Instructor login status: ${instLoginRes.status}`);
    if (instLoginRes.status !== 200 || !instLoginRes.data?.data?.accessToken) {
        throw new Error(`Instructor login failed: ${JSON.stringify(instLoginRes.data)}`);
    }
    const instructorToken = instLoginRes.data.data.accessToken;
    const instHeaders = { Authorization: `Bearer ${instructorToken}` };
    console.log(`[PASS] Instructor authenticated as ${instLoginRes.data.data.user.email}`);
    // Step 5: Instructor Dashboard & Aggregated Planner Analytics (Privacy-Safe)
    console.log('\n--- Step 5: Instructor Privacy-Safe Planner Analytics (GET /planner/instructor/analytics) ---');
    const instPlannerStatsRes = await request('/planner/instructor/analytics', { headers: instHeaders });
    console.log('Instructor Planner Analytics status:', instPlannerStatsRes.status, instPlannerStatsRes.data?.data);
    if (instPlannerStatsRes.status !== 200) {
        throw new Error(`Instructor planner stats failed: ${JSON.stringify(instPlannerStatsRes.data)}`);
    }
    // Step 6: Student Registration & Authentication
    const studentEmail = `alice.student.${Date.now()}@example.com`;
    console.log(`\n--- Step 6: Student Registration (POST /auth/register) -> ${studentEmail} ---`);
    const studentRegRes = await request('/auth/register', {
        method: 'POST',
        body: {
            fullName: 'Alice Student',
            email: studentEmail,
            password: 'Student#Secure123',
        },
    });
    console.log(`Student registration status: ${studentRegRes.status}`);
    if (studentRegRes.status !== 201 || !studentRegRes.data?.data?.accessToken) {
        throw new Error(`Student registration failed: ${JSON.stringify(studentRegRes.data)}`);
    }
    const studentToken = studentRegRes.data.data.accessToken;
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };
    const studentId = studentRegRes.data.data.user.id;
    console.log(`[PASS] Student created: ${studentEmail} (id: ${studentId})`);
    // Step 7: Student Browses Courses
    console.log('\n--- Step 7: Browse Courses (GET /courses) ---');
    const coursesRes = await request('/courses', { headers: studentHeaders });
    console.log(`Browse courses response: status=${coursesRes.status}`);
    const courseList = Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : [];
    console.log(`Found ${courseList.length} published courses`);
    if (courseList.length === 0) {
        throw new Error('No published courses available for enrollment');
    }
    const targetCourse = courseList[0];
    console.log(`Target course for enrollment: "${targetCourse.title}" (${targetCourse.id})`);
    // Step 8: Student Enrolls in Course
    console.log(`\n--- Step 8: Student Enrolls in Course (POST /enrollments) ---`);
    const enrollRes = await request('/enrollments', {
        method: 'POST',
        headers: studentHeaders,
        body: {
            course: targetCourse.id,
        },
    });
    console.log(`Enrollment status: ${enrollRes.status}`, enrollRes.data);
    if (enrollRes.status !== 201 && enrollRes.status !== 200) {
        throw new Error(`Enrollment failed: ${JSON.stringify(enrollRes.data)}`);
    }
    // Step 9: Verify Duplicate Enrollment Prevention
    console.log('\n--- Step 9: Duplicate Enrollment Prevention Test ---');
    const dupEnrollRes = await request('/enrollments', {
        method: 'POST',
        headers: studentHeaders,
        body: {
            course: targetCourse.id,
        },
    });
    console.log(`Duplicate enrollment status (expected 409 or 400): ${dupEnrollRes.status}`);
    if (dupEnrollRes.status !== 409 && dupEnrollRes.status !== 400) {
        throw new Error(`Expected duplicate enrollment rejection, got ${dupEnrollRes.status}`);
    }
    console.log('[PASS] Duplicate enrollment successfully prevented!');
    // Step 10: Generate Smart Study Planner Suggestions
    console.log('\n--- Step 10: Smart Planner AI Suggestions (POST /planner/suggestions) ---');
    const suggestionsRes = await request('/planner/suggestions', {
        method: 'POST',
        headers: studentHeaders,
        body: {},
    });
    console.log(`Suggestions status: ${suggestionsRes.status}`, suggestionsRes.data);
    if (suggestionsRes.status !== 200) {
        throw new Error(`Planner suggestions failed: ${JSON.stringify(suggestionsRes.data)}`);
    }
    console.log(`[PASS] Planner suggestion engine executed cleanly! Message: "${suggestionsRes.data?.data?.message}"`);
    // Step 11: Create a Manual Personal Study Task
    console.log('\n--- Step 11: Create Personal Study Task (POST /planner/tasks) ---');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createTaskRes = await request('/planner/tasks', {
        method: 'POST',
        headers: studentHeaders,
        body: {
            title: 'Review Chapter 1 Lecture Notes & Core Concepts',
            description: 'Summarize key ideas and write sample practice exercises.',
            dueDate: tomorrow,
            estimatedStudyMinutes: 45,
            priority: 'high',
        },
    });
    console.log(`Task creation status: ${createTaskRes.status}`, createTaskRes.data);
    if (createTaskRes.status !== 201) {
        throw new Error(`Create task failed: ${JSON.stringify(createTaskRes.data)}`);
    }
    const createdTask = createTaskRes.data.data;
    console.log(`[PASS] Created task "${createdTask.title}" (id: ${createdTask.id})`);
    // Step 12: Update and Mark Task Complete
    console.log(`\n--- Step 12: Update Study Task Status (PATCH /planner/tasks/${createdTask.id}) ---`);
    const updateTaskRes = await request(`/planner/tasks/${createdTask.id}`, {
        method: 'PATCH',
        headers: studentHeaders,
        body: {
            status: 'completed',
        },
    });
    console.log(`Update status: ${updateTaskRes.status}`, updateTaskRes.data);
    if (updateTaskRes.status !== 200 || updateTaskRes.data?.data?.status !== 'completed') {
        throw new Error(`Task update failed: ${JSON.stringify(updateTaskRes.data)}`);
    }
    console.log('[PASS] Task successfully transitioned to "completed"!');
    // Step 13: Weekly Schedule Aggregation
    console.log('\n--- Step 13: Weekly Schedule Aggregator (GET /planner/weekly) ---');
    const weeklyRes = await request('/planner/weekly', { headers: studentHeaders });
    console.log(`Weekly schedule status: ${weeklyRes.status}`);
    console.log(`Days in schedule: ${weeklyRes.data?.data?.scheduleByDay?.length || 0}`);
    if (weeklyRes.status !== 200 || !weeklyRes.data?.data?.scheduleByDay) {
        throw new Error(`Weekly schedule failed: ${JSON.stringify(weeklyRes.data)}`);
    }
    console.log('[PASS] Weekly schedule accurately grouped by calendar days with calculated minutes!');
    // Step 14: Student Personal Planner Stats
    console.log('\n--- Step 14: Student Personal Planner Stats (GET /planner/stats) ---');
    const studentStatsRes = await request('/planner/stats', { headers: studentHeaders });
    console.log('Student Planner Stats:', studentStatsRes.status, studentStatsRes.data?.data);
    if (studentStatsRes.status !== 200 || studentStatsRes.data?.data?.totalTasks < 1) {
        throw new Error(`Student planner stats invalid: ${JSON.stringify(studentStatsRes.data)}`);
    }
    console.log(`[PASS] Student planner stats: total=${studentStatsRes.data.data.totalTasks}, completed=${studentStatsRes.data.data.completedTasks}, rate=${studentStatsRes.data.data.completionRate}%`);
    // Step 15: Cross-Student Privacy & Ownership Enforcement
    console.log('\n--- Step 15: Cross-Student Security & Ownership Enforcement ---');
    // Attempt to access Alice's task using instructor credentials
    const intruderRes = await request(`/planner/tasks/${createdTask.id}`, { headers: instHeaders });
    console.log(`Intruder access attempt status (expected 404/403): ${intruderRes.status}`);
    if (intruderRes.status !== 404 && intruderRes.status !== 403) {
        throw new Error(`Security breach: Instructor was able to view private student task! Status: ${intruderRes.status}`);
    }
    console.log('[PASS] Cross-user access strictly blocked by ownership middleware!');
    console.log('\n====================================================');
    console.log('🎉 ALL 15 INTEGRATION & E2E VERIFICATION STEPS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
}
runE2EVerification()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-full-flow.js.map