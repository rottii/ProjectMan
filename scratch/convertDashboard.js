const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/PortfolioDashboardView.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename CHART_REGISTRY metrics
content = content.replace(/Total completed tasks/g, 'Total completed projects');
content = content.replace(/Total incomplete tasks/g, 'Total incomplete projects');
content = content.replace(/Total overdue tasks/g, 'Total overdue projects');
content = content.replace(/Total tasks/g, 'Total projects');
content = content.replace(/Tasks by section/g, 'Projects by status');
content = content.replace(/Tasks by assignee/g, 'Projects by owner');
content = content.replace(/Tasks by completion/g, 'Projects by completion');
content = content.replace(/Tasks by status/g, 'Projects by status (pie)');
content = content.replace(/Overdue tasks/g, 'Overdue projects');
content = content.replace(/Unassigned tasks/g, 'Unassigned projects');

// 2. Rewrite the useMemo data block
const useMemoStartStr = `  const {
    totalTasks,
    completedTasks,
    incompleteTasks,
    tasksBySection,
    tasksByAssignee,
    tasksByStatus,
    tasksByCreator,
    tasksByType,
    overdueTasks,
    completionOverTime,
    upcomingDeadlines,
    unassignedBySection,
    customFieldData,
    burnupOverTime,
    allTasks,
    dueStatusData
  } = useMemo(() => {`;

const newUseMemoBlock = `  const {
    totalTasks,
    completedTasks,
    incompleteTasks,
    tasksBySection,
    tasksByAssignee,
    tasksByStatus,
    tasksByCreator,
    tasksByType,
    overdueTasks,
    completionOverTime,
    upcomingDeadlines,
    unassignedBySection,
    customFieldData,
    burnupOverTime,
    allTasks,
    dueStatusData
  } = useMemo(() => {
    let total = 0,
      completed = 0,
      incomplete = 0;
    const assigneeMap = {};
    const creatorMap = {};
    const typeMap = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueBySection = [];
    const unassignedMap = [];
    const tasks = [];
    
    let dsUpcoming = 0,
      dsOverdue = 0,
      dsUnscheduled = 0,
      dsCompleted = 0;

    const customFieldCounts = {};
    // We mock these to keep chart configurations happy even if Portfolios don't strictly have sections yet
    let secOverdue = 0;
    let secUnassigned = 0;
    const bySectionMap = {};

    details?.projectsList?.forEach(project => {
      total++;
      tasks.push(project);
      
      const isCompleted = project.status === 'Completed';
      
      if (isCompleted) {
        completed++;
      } else {
        incomplete++;
      }

      // Overdue
      if (!isCompleted && project.dueDate && new Date(project.dueDate) < now) secOverdue++;

      // Unassigned
      if (!project.owner?.id) secUnassigned++;

      // Owner (assignee/creator mock)
      const name = project.owner?.name || 'Unassigned';
      if (!assigneeMap[name]) assigneeMap[name] = { Total: 0, Completed: 0 };
      assigneeMap[name].Total++;
      if (isCompleted) assigneeMap[name].Completed++;
      
      if (!creatorMap[name]) creatorMap[name] = { Total: 0, Completed: 0 };
      creatorMap[name].Total++;
      if (isCompleted) creatorMap[name].Completed++;

      // Project status (taskType mock)
      const taskType = project.status || 'On track';
      if (!typeMap[taskType]) typeMap[taskType] = { Total: 0, Completed: 0 };
      typeMap[taskType].Total++;
      if (isCompleted) typeMap[taskType].Completed++;
      
      if (!bySectionMap[taskType]) bySectionMap[taskType] = { name: taskType, Completed: 0, Incomplete: 0 };
      if (isCompleted) bySectionMap[taskType].Completed++;
      else bySectionMap[taskType].Incomplete++;

      // Due Date Status
      if (isCompleted) {
        dsCompleted++;
      } else if (!project.dueDate) {
        dsUnscheduled++;
      } else {
        const dd = new Date(project.dueDate);
        dd.setHours(0, 0, 0, 0);
        if (dd < now) {
          dsOverdue++;
        } else {
          dsUpcoming++;
        }
      }
    });

    const bySection = Object.values(bySectionMap);
    overdueBySection.push({ name: 'Projects', Overdue: secOverdue });
    unassignedMap.push({ name: 'Projects', Unassigned: secUnassigned });

    const overdueTasks = overdueBySection;
    const unassignedTasks = unassignedMap;
    const allTasks = tasks;

    // Burnup over time (last 14 days)
    const burnupOverTime = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(23, 59, 59, 999);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const totalToDate = tasks.filter(t => {
        const createDate = t.createdAt ? new Date(t.createdAt) : new Date(0);
        return createDate.getTime() <= d.getTime();
      }).length;
      const completedToDate = tasks.filter(t => {
        if (t.status !== 'Completed' || !t.updatedAt) return false;
        const compDate = new Date(t.updatedAt);
        return compDate.getTime() <= d.getTime();
      }).length;
      burnupOverTime.push({
        name: label,
        Total: totalToDate,
        Completed: completedToDate
      });
    }

    const customFieldData = {};

    const byAssignee = Object.entries(assigneeMap).map(([name, data]) => ({
      name,
      value: data.Total,
      Total: data.Total,
      Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    const byCreator = Object.entries(creatorMap).map(([name, data]) => ({
      name,
      value: data.Total,
      Total: data.Total,
      Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    const byType = Object.entries(typeMap).map(([name, data]) => ({
      name,
      value: data.Total,
      Total: data.Total,
      Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    // Status pie
    const byStatus = [{
      name: 'Completed',
      value: completed,
      color: '#10B981'
    }, {
      name: 'Incomplete',
      value: incomplete,
      color: '#6366F1'
    }].filter(d => d.value > 0);

    // Completion over time (last 7 days)
    const completionDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const cnt = tasks.filter(t => {
        if (t.status !== 'Completed' || !t.updatedAt) return false;
        const ct = new Date(t.updatedAt);
        ct.setHours(0, 0, 0, 0);
        return ct.getTime() === d.getTime();
      }).length;
      completionDays.push({
        name: label,
        Completed: cnt
      });
    }

    // Upcoming deadlines (next 7 days)
    const upcoming = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', {
        weekday: 'short'
      });
      const cnt = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate).toDateString() === d.toDateString()).length;
      upcoming.push({
        name: label,
        Due: cnt
      });
    }

    const dueStatusData = [{
      name: 'Upcoming',
      value: dsUpcoming,
      color: '#A78BFA'
    }, {
      name: 'Overdue',
      value: dsOverdue,
      color: '#EF4444'
    }, {
      name: 'Unscheduled',
      value: dsUnscheduled,
      color: '#9CA3AF'
    }, {
      name: 'Completed',
      value: dsCompleted,
      color: '#10B981'
    }];
    
    return {
      totalTasks: total,
      completedTasks: completed,
      incompleteTasks: incomplete,
      tasksBySection: bySection,
      tasksByAssignee: byAssignee,
      tasksByStatus: byStatus,
      tasksByCreator: byCreator,
      tasksByType: byType,
      overdueTasks,
      completionOverTime: completionDays,
      upcomingDeadlines: upcoming,
      unassignedBySection: unassignedTasks,
      customFieldData,
      burnupOverTime,
      allTasks,
      dueStatusData
    };
  }, [details]);`;

const startIndex = content.indexOf(useMemoStartStr);
if (startIndex !== -1) {
  // Find the end of the useMemo block
  const endPattern = /  \}, \[details\]\);\s+const overdueTotalCount/;
  const endMatch = content.match(endPattern);
  
  if (endMatch) {
    const part1 = content.substring(0, startIndex);
    const part2 = content.substring(endMatch.index + endMatch[0].length);
    content = part1 + newUseMemoBlock + "\\n  const overdueTotalCount" + part2;
    fs.writeFileSync(filePath, content);
    console.log("Successfully replaced useMemo block.");
  } else {
    console.log("Could not find end of useMemo block.");
  }
} else {
  console.log("Could not find start of useMemo block.");
}
