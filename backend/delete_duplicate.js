const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { name: 'a' } });
    const workspaceId = '647149ee-3015-4b07-a75c-15251523cef5';
    const duplicates = await prisma.project.findMany({
        where: { workspaceId: workspaceId, status: 'MY_TASKS', ownerId: user.id }
    });
    
    if (duplicates.length > 1) {
        console.log(`Found ${duplicates.length} MY_TASKS for workspace. Deleting one...`);
        const toDelete = duplicates[0];
        try {
            await prisma.project.delete({ where: { id: toDelete.id } });
            console.log(`Successfully deleted duplicate: ${toDelete.id}`);
        } catch (e) {
            console.error(e);
        }
    } else {
        console.log("No duplicates found to delete.");
    }
}

main().finally(() => prisma.$disconnect());
