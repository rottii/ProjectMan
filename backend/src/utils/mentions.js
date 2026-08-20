const prisma = require('../lib/prisma');
const { sendMentionEmail } = require('./emailService');

function extractMentions(htmlText) {
    if (!htmlText) return [];
    const regex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"/g;
    const ids = new Set();
    let match;
    while ((match = regex.exec(htmlText)) !== null) {
        ids.add(match[1]);
    }
    return Array.from(ids);
}

async function processMentions({ newHtml, oldHtml, actorId, taskId, projectId, messagePrefix = 'Mentioned you in' }) {
    const newIds = extractMentions(newHtml);
    const oldIds = extractMentions(oldHtml);
    
    // Find IDs that are in newHtml but not in oldHtml
    const addedIds = newIds.filter(id => !oldIds.includes(id) && id !== actorId);
    
    // Look up actor name once for emails
    let actorName = 'Someone';
    if (addedIds.length > 0) {
        try {
            const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
            if (actor) actorName = actor.name;
        } catch (err) {
            // non-critical
        }
    }

    // Look up task title for emails
    let taskTitle = '';
    if (taskId && addedIds.length > 0) {
        try {
            const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true } });
            if (task) taskTitle = task.title;
        } catch (err) {
            // non-critical
        }
    }

    for (const userId of addedIds) {
        try {
            const mentionedUser = await prisma.user.findUnique({ 
                where: { id: userId }, 
                select: { email: true, name: true, emailVerified: true, emailNotifMention: true, appNotifMention: true } 
            });

            if (!mentionedUser || mentionedUser.appNotifMention === undefined || mentionedUser.appNotifMention) {
                await prisma.notification.create({
                    data: {
                        type: 'MENTIONED',
                        message: `${messagePrefix} a ${taskId ? 'task' : 'message'}`,
                        userId,
                        actorId,
                        taskId: taskId || null,
                        projectId: projectId || null
                    }
                });
            }

            // Send email notification for mention
            try {
                if (mentionedUser?.emailVerified && mentionedUser?.emailNotifMention) {
                    sendMentionEmail(mentionedUser.email, mentionedUser.name, taskTitle, taskId, actorName, taskId ? `a comment on "${taskTitle}"` : 'a message');
                }
            } catch (emailErr) {
                console.error('Mention email error for user', userId, emailErr);
            }
        } catch (err) {
            console.error('Error creating mention notification for user', userId, err);
        }
    }
    return addedIds; // return IDs that were notified, so we can emit sockets
}

module.exports = {
    extractMentions,
    processMentions
};
