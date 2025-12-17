import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  ProjectMemberRole,
  TaskStatus,
  TaskPriority,
} from '@prisma/client';
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

  // Reset relevant tables (keep labels as-is)
  await prisma.activity.deleteMany({});
  await prisma.notification.deleteMany({}); // keep notifications empty
  await prisma.attachment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // Users (admin has no tasks and is not owner)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@taskflow.dev',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  const dom = await prisma.user.create({
    data: {
      email: 'dom@taskflow.dev',
      password: passwordHash,
      firstName: 'Dom',
      lastName: 'dom',
      role: UserRole.USER,
      isActive: true,
    },
  });
  const racem = await prisma.user.create({
    data: {
      email: 'racem@taskflow.dev',
      password: passwordHash,
      firstName: 'Racem',
      lastName: 'kchaou',
      role: UserRole.USER,
      isActive: true,
    },
  });
  const yasmine = await prisma.user.create({
    data: {
      email: 'yasmine@taskflow.dev',
      password: passwordHash,
      firstName: 'Yasmine',
      lastName: 'Sassi',
      role: UserRole.USER,
      isActive: true,
    },
  });
  const syrine = await prisma.user.create({
    data: {
      email: 'syrine@taskflow.dev',
      password: passwordHash,
      firstName: 'Syrine',
      lastName: 'smati',
      role: UserRole.USER,
      isActive: true,
    },
  });
  const ala = await prisma.user.create({
    data: {
      email: 'ala@taskflow.dev',
      password: passwordHash,
      firstName: 'Ala',
      lastName: 'ben ayed',
      role: UserRole.USER,
      isActive: true,
    },
  });
  const amine = await prisma.user.create({
    data: {
      email: 'amine@taskflow.dev',
      password: passwordHash,
      firstName: 'Amine',
      lastName: 'jerbi',
      role: UserRole.USER,
      isActive: true,
    },
  });

  // Labels (keep as-is)
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
  const defaultLabels = [
    { name: 'Frontend', color: '#3b82f6' },
    { name: 'Backend', color: '#10b981' },
    { name: 'UI', color: '#8b5cf6' },
  ];
  for (const labelData of defaultLabels) {
    await prisma.label.upsert({
      where: { name: labelData.name },
      update: {},
      create: labelData,
    });
  }
  const allLabels = await prisma.label.findMany();
  const labelByName = new Map(allLabels.map((l) => [l.name, l.id]));

  // Projects (4) with non-admin owners
  const projectOrion = await prisma.project.create({
    data: {
      id: 'project-orion',
      name: 'Project Orion',
      description: 'Next-gen task platform foundation',
      color: '#4F46E5',
      ownerId: amine.id,
    },
  });
  const projectNexus = await prisma.project.create({
    data: {
      id: 'project-nexus',
      name: 'Project Nexus',
      description: 'Cross-service integration layer',
      color: '#0EA5E9',
      ownerId: yasmine.id,
    },
  });
  const projectZenith = await prisma.project.create({
    data: {
      id: 'project-zenith',
      name: 'Project Zenith',
      description: 'Scalability and performance program',
      color: '#16A34A',
      ownerId: racem.id,
    },
  });
  const projectAurora = await prisma.project.create({
    data: {
      id: 'project-aurora',
      name: 'Project Aurora',
      description: 'Delightful UX overhaul',
      color: '#F59E0B',
      ownerId: syrine.id,
    },
  });

  // Project members (assign editors/viewers, admin is not owner and has no tasks)
  const memberUpserts = [
    // Orion
    {
      projectId: projectOrion.id,
      userId: dom.id,
      role: ProjectMemberRole.OWNER,
    },
    {
      projectId: projectOrion.id,
      userId: yasmine.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectOrion.id,
      userId: ala.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectOrion.id,
      userId: amine.id,
      role: ProjectMemberRole.VIEWER,
    },
    {
      projectId: projectOrion.id,
      userId: admin.id,
      role: ProjectMemberRole.VIEWER,
    },
    // Nexus
    {
      projectId: projectNexus.id,
      userId: yasmine.id,
      role: ProjectMemberRole.OWNER,
    },
    {
      projectId: projectNexus.id,
      userId: racem.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectNexus.id,
      userId: syrine.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectNexus.id,
      userId: ala.id,
      role: ProjectMemberRole.VIEWER,
    },
    // Zenith
    {
      projectId: projectZenith.id,
      userId: racem.id,
      role: ProjectMemberRole.OWNER,
    },
    {
      projectId: projectZenith.id,
      userId: dom.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectZenith.id,
      userId: amine.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectZenith.id,
      userId: yasmine.id,
      role: ProjectMemberRole.VIEWER,
    },
    // Aurora
    {
      projectId: projectAurora.id,
      userId: syrine.id,
      role: ProjectMemberRole.OWNER,
    },
    {
      projectId: projectAurora.id,
      userId: ala.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectAurora.id,
      userId: dom.id,
      role: ProjectMemberRole.EDITOR,
    },
    {
      projectId: projectAurora.id,
      userId: racem.id,
      role: ProjectMemberRole.VIEWER,
    },
  ];
  for (const m of memberUpserts) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  const editorsByProject: Record<string, string[]> = {
    [projectOrion.id]: [yasmine.id, ala.id],
    [projectNexus.id]: [racem.id, syrine.id],
    [projectZenith.id]: [dom.id, amine.id],
    [projectAurora.id]: [ala.id, dom.id],
  };

  const ownerByProject: Record<string, string> = {
    [projectOrion.id]: dom.id,
    [projectNexus.id]: yasmine.id,
    [projectZenith.id]: racem.id,
    [projectAurora.id]: syrine.id,
  };

  // Helper to create tasks for a project with editor/owner-only assignees
  async function createTask(opts: {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: TaskStatus;
    position: number;
    ownerId: string; // must not be admin
    assigneeIds: string[]; // editors or owners only
    labels?: string[]; // label names
    priority?: TaskPriority;
  }) {
    const allowedAssignees = new Set(
      [
        ...(editorsByProject[opts.projectId] || []),
        ownerByProject[opts.projectId],
      ].filter(Boolean),
    );

    if (!allowedAssignees.has(opts.ownerId)) {
      throw new Error(
        `Task owner must be an editor or the project owner for project ${opts.projectId}`,
      );
    }

    const invalidAssignees = opts.assigneeIds.filter(
      (id) => !allowedAssignees.has(id),
    );
    if (invalidAssignees.length) {
      throw new Error(
        `Assignees must be editors or the project owner for project ${opts.projectId}: ${invalidAssignees.join(', ')}`,
      );
    }

    const connectLabels = (opts.labels || []).map((name) => ({
      id: labelByName.get(name)!,
    }));

    return prisma.task.create({
      data: {
        id: opts.id,
        title: opts.title,
        description: opts.description || null,
        status: opts.status,
        priority: opts.priority || TaskPriority.MEDIUM,
        position: opts.position,
        projectId: opts.projectId,
        ownerId: opts.ownerId,
        assignees: { connect: opts.assigneeIds.map((id) => ({ id })) },
        labels: { connect: connectLabels },
      },
    });
  }

  // Titles by status
  const inProgressTitles = [
    'Implement JWT rotation',
    'Optimize database indexes',
    'Refactor notification service',
    'Improve accessibility across app',
    'Add audit log stream',
    'Implement API rate limiting',
  ];
  const todoTitles = [
    'Write contribution guide',
    'Add password reset flow',
    'Create marketing landing page',
    'Add search suggestions',
    'Integrate SSO providers',
    'Setup monitoring dashboards',
  ];
  const doneTitles = [
    'Initial project scaffold',
    'Dockerize backend service',
    'Set up ESLint + Prettier',
    'Configure CI pipeline',
    'Create user profiles',
    'Add health checks',
  ];

  // Distribute tasks across projects: Orion(5), Nexus(5), Zenith(4), Aurora(4)
  const projectOrder = [
    projectOrion,
    projectNexus,
    projectZenith,
    projectAurora,
  ];
  const distribution: Record<
    string,
    { ip: number; todo: number; done: number }
  > = {
    [projectOrion.id]: { ip: 2, todo: 2, done: 1 },
    [projectNexus.id]: { ip: 2, todo: 2, done: 1 },
    [projectZenith.id]: { ip: 1, todo: 1, done: 2 },
    [projectAurora.id]: { ip: 1, todo: 1, done: 2 },
  };

  let ipIdx = 0,
    todoIdx = 0,
    doneIdx = 0,
    position = 1;
  const createdTasks: { id: string; projectId: string }[] = [];
  for (const p of projectOrder) {
    const editors = editorsByProject[p.id];
    const ownersForTasks = editors; // choose editor as owner for task
    const labelsPool = [
      'Bug',
      'Feature',
      'Design',
      'Frontend',
      'Backend',
      'UI',
    ];

    for (let i = 0; i < distribution[p.id].ip; i++) {
      const ownerId = ownersForTasks[i % ownersForTasks.length];
      const assignees = [editors[i % editors.length]];
      const id = `${p.id}-ip-${i + 1}`;
      const t = await createTask({
        id,
        projectId: p.id,
        title: inProgressTitles[ipIdx % inProgressTitles.length],
        description: 'Work in progress',
        status: TaskStatus.IN_PROGRESS,
        position: position++,
        ownerId,
        assigneeIds: assignees,
        labels: [labelsPool[(ipIdx + i) % labelsPool.length]],
        priority: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.URGENT][
          (ipIdx + i) % 3
        ],
      });
      createdTasks.push({ id: t.id, projectId: p.id });
      ipIdx++;
    }
    for (let i = 0; i < distribution[p.id].todo; i++) {
      const ownerId = ownersForTasks[i % ownersForTasks.length];
      const assignees = [editors[(i + 1) % editors.length]];
      const id = `${p.id}-todo-${i + 1}`;
      const t = await createTask({
        id,
        projectId: p.id,
        title: todoTitles[todoIdx % todoTitles.length],
        description: 'Planned work to do',
        status: TaskStatus.TODO,
        position: position++,
        ownerId,
        assigneeIds: assignees,
        labels: [labelsPool[(todoIdx + i + 1) % labelsPool.length]],
        priority: [TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.HIGH][
          (todoIdx + i) % 3
        ],
      });
      createdTasks.push({ id: t.id, projectId: p.id });
      todoIdx++;
    }
    for (let i = 0; i < distribution[p.id].done; i++) {
      const ownerId = ownersForTasks[i % ownersForTasks.length];
      const assignees = [editors[(i + 2) % editors.length]];
      const id = `${p.id}-done-${i + 1}`;
      const t = await createTask({
        id,
        projectId: p.id,
        title: doneTitles[doneIdx % doneTitles.length],
        description: 'Completed task',
        status: TaskStatus.DONE,
        position: position++,
        ownerId,
        assigneeIds: assignees,
        labels: [labelsPool[(doneIdx + i + 2) % labelsPool.length]],
        priority: [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH][
          (doneIdx + i) % 3
        ],
      });
      createdTasks.push({ id: t.id, projectId: p.id });
      doneIdx++;
    }
  }

  // Subtasks (6 total)
  const subtaskTargets = createdTasks.slice(0, 3).map((t) => t.id); // first 3 tasks
  await prisma.subtask.createMany({
    data: [
      {
        title: 'Draft spec',
        isComplete: false,
        position: 1,
        taskId: subtaskTargets[0],
      },
      {
        title: 'Review spec',
        isComplete: false,
        position: 2,
        taskId: subtaskTargets[0],
      },
      {
        title: 'Implement module',
        isComplete: true,
        position: 1,
        taskId: subtaskTargets[1],
      },
      {
        title: 'Write tests',
        isComplete: false,
        position: 2,
        taskId: subtaskTargets[1],
      },
      {
        title: 'Polish UI',
        isComplete: true,
        position: 1,
        taskId: subtaskTargets[2],
      },
      {
        title: 'QA pass',
        isComplete: false,
        position: 2,
        taskId: subtaskTargets[2],
      },
    ],
  });

  // Comments (20 total), some tasks with multiple, some without
  const commentAuthors = [
    dom.id,
    racem.id,
    yasmine.id,
    syrine.id,
    ala.id,
    amine.id,
  ];
  const commentTargets = [
    createdTasks[0].id,
    createdTasks[0].id,
    createdTasks[1].id,
    createdTasks[2].id,
    createdTasks[2].id,
    createdTasks[3].id,
    createdTasks[4].id,
    createdTasks[5].id,
    createdTasks[6].id,
    createdTasks[7].id,
    createdTasks[7].id,
    createdTasks[8].id,
    createdTasks[9].id,
    createdTasks[10].id,
    createdTasks[10].id,
    createdTasks[11].id,
    createdTasks[12].id,
    createdTasks[13].id,
    createdTasks[14].id,
    createdTasks[15].id,
  ];
  const commentContents = [
    'Looks good, proceed with implementation.',
    'Please document the edge cases.',
    'We should benchmark this change.',
    'Can we split this into smaller PRs?',
    'Design looks solid; add accessibility notes.',
    'Add retries for transient failures.',
    'Consider feature flagging.',
    'We need unit tests coverage >80%.',
    'Sync with frontend team on API shape.',
    'Double-check database indexes.',
    'This unblocks the next milestone.',
    'Add screenshots to the description.',
    'QA reported a minor glitch; follow up.',
    'Great work here!',
    'Let’s add telemetry events.',
    'What’s the rollout plan?',
    'Make sure to update docs.',
    'Why this approach over alternatives?',
    'Add a quick ADR to record decision.',
    'Ship it!',
  ];
  await prisma.comment.createMany({
    data: commentTargets.map((taskId, i) => ({
      content: commentContents[i],
      taskId,
      userId: commentAuthors[i % commentAuthors.length],
    })),
  });

  // Activities: only owners and admin can update projects and add members

  for (const p of projectOrder) {
    // Owner adds a member (EDITOR)
    await prisma.activity.create({
      data: {
        action: 'MEMBER_ADDED',
        entity: 'PROJECT',
        entityId: p.id,
        userId: ownerByProject[p.id],
        projectId: p.id,
        metadata: { role: 'EDITOR' },
      },
    });
    // Admin updates project settings
    await prisma.activity.create({
      data: {
        action: 'PROJECT_UPDATED',
        entity: 'PROJECT',
        entityId: p.id,
        userId: admin.id,
        projectId: p.id,
        metadata: { field: 'color' },
      },
    });
  }

  console.log('Seed complete. Admin login: admin@taskflow.dev / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
