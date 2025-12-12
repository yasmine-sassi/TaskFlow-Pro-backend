import 'dotenv/config';
import { PrismaClient, UserRole, ProjectMemberRole, TaskStatus, TaskPriority, NotificationType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Bypass SSL cert validation for Supabase pooler
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Prefer pooler URL for seeding
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskflow.dev' },
    update: {},
    create: {
      email: 'admin@taskflow.dev',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@taskflow.dev' },
    update: {},
    create: {
      email: 'member@taskflow.dev',
      password: passwordHash,
      firstName: 'Taylor',
      lastName: 'Doe',
      role: UserRole.USER,
      isActive: true,
    },
  });

  // Projects
  const projectAlpha = await prisma.project.upsert({
    where: { id: 'project-alpha' },
    update: {},
    create: {
      id: 'project-alpha',
      name: 'Project Alpha',
      description: 'Kanban board for Alpha release',
      color: '#4F46E5',
      ownerId: admin.id,
    },
  });

  const projectBeta = await prisma.project.upsert({
    where: { id: 'project-beta' },
    update: {},
    create: {
      id: 'project-beta',
      name: 'Project Beta',
      description: 'Customer success pipeline',
      color: '#0EA5E9',
      ownerId: admin.id,
    },
  });

  // Project Members
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projectAlpha.id, userId: admin.id } },
    update: {},
    create: {
      projectId: projectAlpha.id,
      userId: admin.id,
      role: ProjectMemberRole.OWNER,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projectAlpha.id, userId: member.id } },
    update: {},
    create: {
      projectId: projectAlpha.id,
      userId: member.id,
      role: ProjectMemberRole.EDITOR,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projectBeta.id, userId: admin.id } },
    update: {},
    create: {
      projectId: projectBeta.id,
      userId: admin.id,
      role: ProjectMemberRole.OWNER,
    },
  });

  // Labels
  const labelBug = await prisma.label.upsert({
    where: { name: 'Bug' },
    update: {},
    create: { name: 'Bug', color: '#DC2626' },
  });
  const labelFeature = await prisma.label.upsert({
    where: { name: 'Feature' },
    update: {},
    create: { name: 'Feature', color: '#2563EB' },
  });
  const labelDesign = await prisma.label.upsert({
    where: { name: 'Design' },
    update: {},
    create: { name: 'Design', color: '#D946EF' },
  });

  // Tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Set up CI/CD',
      description: 'Add GitHub Actions pipeline for build and test',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      position: 1,
      projectId: projectAlpha.id,
      ownerId: admin.id,
      assignees: { connect: [{ id: admin.id }, { id: member.id }] },
      labels: { connect: [{ id: labelFeature.id }] },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Fix auth redirect',
      description: 'Resolve login redirect loop on refresh',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      position: 2,
      projectId: projectAlpha.id,
      ownerId: member.id,
      assignees: { connect: [{ id: member.id }] },
      labels: { connect: [{ id: labelBug.id }] },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Design board filters',
      description: 'Create UI for multi-project filtering',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      position: 3,
      projectId: projectAlpha.id,
      ownerId: admin.id,
      assignees: { connect: [{ id: admin.id }] },
      labels: { connect: [{ id: labelDesign.id }] },
    },
  });

  // Subtasks
  await prisma.subtask.createMany({
    data: [
      { title: 'Add lint step', isComplete: true, position: 1, taskId: task1.id },
      { title: 'Add unit tests step', isComplete: false, position: 2, taskId: task1.id },
      { title: 'Handle 401 redirects', isComplete: false, position: 1, taskId: task2.id },
      { title: 'UI spec draft', isComplete: true, position: 1, taskId: task3.id },
      { title: 'Add toggle interactions', isComplete: false, position: 2, taskId: task3.id },
    ],
  });

  // Comments
  await prisma.comment.createMany({
    data: [
      {
        content: 'Let’s enable caching on dependencies to speed up builds.',
        taskId: task1.id,
        userId: admin.id,
      },
      {
        content: 'Bug is reproducible only on Safari, needs session check.',
        taskId: task2.id,
        userId: member.id,
      },
      {
        content: 'Great start on the filter UX, let’s add saved views.',
        taskId: task3.id,
        userId: admin.id,
      },
    ],
  });

  // Attachments
  await prisma.attachment.createMany({
    data: [
      {
        fileName: 'ci-pipeline.yml',
        fileUrl: 'https://example.com/ci-pipeline.yml',
        fileSize: 2450,
        mimeType: 'text/yaml',
        taskId: task1.id,
      },
      {
        fileName: 'auth-bug.mov',
        fileUrl: 'https://example.com/auth-bug.mov',
        fileSize: 1048576,
        mimeType: 'video/quicktime',
        taskId: task2.id,
      },
    ],
  });

  // Notifications (sample)
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.TASK_ASSIGNED,
        title: 'You were assigned to a task',
        message: 'Task "Fix auth redirect" assigned to you',
        userId: member.id,
        entityId: task2.id,
      },
      {
        type: NotificationType.TASK_UPDATED,
        title: 'Task updated',
        message: 'Task "Set up CI/CD" moved to In Progress',
        userId: admin.id,
        entityId: task1.id,
      },
    ],
  });

  console.log('Seed data created. Admin login: admin@taskflow.dev / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
