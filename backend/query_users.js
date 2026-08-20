const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find tasks that have parentId set
  const subtasks = await prisma.task.findMany({
    where: { parentId: { not: null } },
    select: { id: true, title: true, parentId: true, sectionId: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log('Tasks with parentId:');
  console.log(JSON.stringify(subtasks, null, 2));
  
  // Check if any of those parents don't exist
  for (const st of subtasks) {
    const parent = await prisma.task.findUnique({ where: { id: st.parentId } });
    if (!parent) {
      console.log(`ORPHAN: Task "${st.title}" (${st.id}) has parentId ${st.parentId} but parent doesn't exist!`);
    }
  }
}

main().finally(() => prisma.$disconnect());
