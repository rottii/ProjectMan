const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendReminderEmail } = require('./emailService');


const startReminderCron = (io) => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const nowTime = now.getTime();

            // Fetch tasks that are not completed, have a due date, and have an assignee
            // We also need tasks that haven't had all their reminders sent
            const tasks = await prisma.task.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { not: null },
                    assigneeId: { not: null },
                    OR: [
                        { reminderSent1Week: false },
                        { reminderSent1Day: false },
                        { reminderSent1Hour: false },
                        { reminderSentOverdue: false },
                    ]
                },
                include: {
                    section: true,
                    assignee: { select: { email: true, name: true, emailVerified: true, emailNotifReminder: true, appNotifReminder: true } }
                }
            });

            for (const task of tasks) {
                const dueTime = new Date(task.dueDate).getTime();
                const diffMs = dueTime - nowTime;
                const diffHours = diffMs / (1000 * 60 * 60);

                let notificationType = null;
                let notificationMessage = null;
                let updateData = {};

                // 1) Overdue (Past Due) - e.g. within 24 hours AFTER due date
                if (diffHours < 0 && diffHours > -24 && !task.reminderSentOverdue) {
                    notificationType = 'REMINDER_OVERDUE';
                    notificationMessage = `Reminder: Task "${task.title}" is overdue!`;
                    updateData.reminderSentOverdue = true;
                }
                // 2) 1 Hour Before - between 0 and 1 hour
                else if (diffHours >= 0 && diffHours <= 1 && !task.reminderSent1Hour) {
                    notificationType = 'REMINDER_1HOUR';
                    notificationMessage = `Reminder: Task "${task.title}" is due in 1 hour.`;
                    updateData.reminderSent1Hour = true;
                }
                // 3) 1 Day Before - between 1 and 24 hours
                else if (diffHours > 1 && diffHours <= 24 && !task.reminderSent1Day) {
                    notificationType = 'REMINDER_1DAY';
                    notificationMessage = `Reminder: Task "${task.title}" is due tomorrow.`;
                    updateData.reminderSent1Day = true;
                }
                // 4) 1 Week Before - between 24 and 168 hours (7 days)
                else if (diffHours > 24 && diffHours <= 168 && !task.reminderSent1Week) {
                    notificationType = 'REMINDER_1WEEK';
                    notificationMessage = `Reminder: Task "${task.title}" is due next week.`;
                    updateData.reminderSent1Week = true;
                }

                if (notificationType && notificationMessage) {
                    // Update Task
                    await prisma.task.update({
                        where: { id: task.id },
                        data: updateData
                    });

                    // Create Notification and Emit
                    const assignee = task.assignee;
                    if (assignee && (assignee.appNotifReminder === undefined || assignee.appNotifReminder)) {
                        await prisma.notification.create({
                            data: {
                                type: notificationType,
                                message: notificationMessage,
                                userId: task.assigneeId,
                                taskId: task.id,
                                projectId: task.section?.projectId
                            }
                        });
                        
                        if (io) {
                            io.to(task.assigneeId).emit('new_notification');
                        }
                    }

                    // Send email notification
                    try {
                        if (assignee?.emailVerified && assignee?.emailNotifReminder) {
                            sendReminderEmail(assignee.email, assignee.name, task.title, task.id, notificationType);
                        }
                    } catch (emailErr) {
                        console.error('Reminder email error:', emailErr);
                    }
                }
            }

        } catch (error) {
            console.error('Error running reminder cron job:', error);
        }
    });
};

module.exports = { startReminderCron };
