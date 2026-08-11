$filePath = "frontend\src\components\PortfolioDashboardView.jsx"
$content = Get-Content $filePath -Raw

$content = $content -replace 'Total completed tasks', 'Total completed projects'
$content = $content -replace 'Total incomplete tasks', 'Total incomplete projects'
$content = $content -replace 'Total overdue tasks', 'Total overdue projects'
$content = $content -replace 'Total tasks', 'Total projects'
$content = $content -replace 'Tasks by section', 'Projects by status'
$content = $content -replace 'Tasks by assignee', 'Projects by owner'
$content = $content -replace 'Tasks by completion', 'Projects by completion'
$content = $content -replace 'Tasks by status', 'Projects by status'
$content = $content -replace 'Overdue tasks', 'Overdue projects'
$content = $content -replace 'Unassigned tasks', 'Unassigned projects'
$content = $content -replace 'tasks-by-section', 'projects-by-status'
$content = $content -replace 'tasks-by-assignee', 'projects-by-owner'
$content = $content -replace 'tasks-by-completion', 'projects-by-completion'
$content = $content -replace 'tasks-by-status', 'projects-by-status-pie'
$content = $content -replace 'unassigned-tasks', 'unassigned-projects'
$content = $content -replace 'overdue-tasks', 'overdue-projects'


$replaceStr = @"
  const {
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

      if (!isCompleted && project.dueDate && new Date(project.dueDate) < now) secOverdue++;
      if (!project.owner?.id) secUnassigned++;

      const name = project.owner?.name || 'Unassigned';
      if (!assigneeMap[name]) assigneeMap[name] = { Total: 0, Completed: 0 };
      assigneeMap[name].Total++;
      if (isCompleted) assigneeMap[name].Completed++;
      
      if (!creatorMap[name]) creatorMap[name] = { Total: 0, Completed: 0 };
      creatorMap[name].Total++;
      if (isCompleted) creatorMap[name].Completed++;

      const taskType = project.status || 'On track';
      if (!typeMap[taskType]) typeMap[taskType] = { Total: 0, Completed: 0 };
      typeMap[taskType].Total++;
      if (isCompleted) typeMap[taskType].Completed++;
      
      if (!bySectionMap[taskType]) bySectionMap[taskType] = { name: taskType, Completed: 0, Incomplete: 0 };
      if (isCompleted) bySectionMap[taskType].Completed++;
      else bySectionMap[taskType].Incomplete++;

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
      name, value: data.Total, Total: data.Total, Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    const byCreator = Object.entries(creatorMap).map(([name, data]) => ({
      name, value: data.Total, Total: data.Total, Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    const byType = Object.entries(typeMap).map(([name, data]) => ({
      name, value: data.Total, Total: data.Total, Completed: data.Completed
    })).sort((a, b) => b.value - a.value);

    const byStatus = [{
      name: 'Completed', value: completed, color: '#10B981'
    }, {
      name: 'Incomplete', value: incomplete, color: '#6366F1'
    }].filter(d => d.value > 0);

    const completionDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const cnt = tasks.filter(t => {
        if (t.status !== 'Completed' || !t.updatedAt) return false;
        const ct = new Date(t.updatedAt);
        ct.setHours(0, 0, 0, 0);
        return ct.getTime() === d.getTime();
      }).length;
      completionDays.push({ name: label, Completed: cnt });
    }

    const upcoming = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const cnt = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate).toDateString() === d.toDateString()).length;
      upcoming.push({ name: label, Due: cnt });
    }

    const dueStatusData = [{
      name: 'Upcoming', value: dsUpcoming, color: '#A78BFA'
    }, {
      name: 'Overdue', value: dsOverdue, color: '#EF4444'
    }, {
      name: 'Unscheduled', value: dsUnscheduled, color: '#9CA3AF'
    }, {
      name: 'Completed', value: dsCompleted, color: '#10B981'
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
  }, [details]);
"@

$startPattern = '(?s)  const \{\s*totalTasks,[\s\S]*?dueStatusData\s*\} = useMemo\(\(\) => \{'
$startMatch = [regex]::Match($content, $startPattern)

if ($startMatch.Success) {
    $startIndex = $startMatch.Index
    $endPattern = '(?s)  \}, \[selectedProject\]\);\s+const overdueTotalCount'
    # Start looking for the end pattern after the start index to avoid matching an earlier instance
    $endMatch = [regex]::Match($content.Substring($startIndex), $endPattern)
    
    if ($endMatch.Success) {
        $part1 = $content.Substring(0, $startIndex)
        $part2 = $content.Substring($startIndex + $endMatch.Index + $endMatch.Length)
        $content = $part1 + $replaceStr + "`r`n  const overdueTotalCount" + $part2
        Set-Content -Path $filePath -Value $content
        Write-Host "Successfully replaced useMemo block."
    } else {
        Write-Host "Could not find end of useMemo block."
    }
} else {
    Write-Host "Could not find start of useMemo block."
}
