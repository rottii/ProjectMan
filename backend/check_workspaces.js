const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { name: 'a' } });
    const projects = await prisma.project.findMany({ 
        where: { ownerId: user.id, status: 'MY_TASKS' }, 
        include: { sections: { include: { _count: { select: { tasks: true } } } } } 
    }); 
    console.log(JSON.stringify(projects.map(p => ({ 
        id: p.id, 
        workspaceId: p.workspaceId, 
        taskCount: p.sections.reduce((sum, s) => sum + s._count.tasks, 0) 
    })), null, 2)); 
}

main().finally(() => prisma.$disconnect());
