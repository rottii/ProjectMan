import { useTranslation } from "react-i18next";
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../api';
import UserAvatar from './UserAvatar';

export default function PortfolioWorkloadView({
  details,
  token,
  isReadOnly
}) {
  const { t } = useTranslation();
  const [capacityLimit, setCapacityLimit] = useState(3);
  const [expandedAssignees, setExpandedAssignees] = useState({});
  const scrollContainerRef = useRef(null);

  const DAY_WIDTH = 40;

  const toggleExpand = assigneeName => {
    setExpandedAssignees(prev => ({
      ...prev,
      [assigneeName]: !prev[assigneeName]
    }));
  };

  const { start, days, assigneeData } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - Math.floor(365 * 0.75));
    startDate.setHours(0, 0, 0, 0);
    const totalDays = Math.floor(365 * 1.5);

    const daysArr = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      daysArr.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        timestamp: d.getTime(),
        isToday: d.toDateString() === today.toDateString()
      });
    }

    const assigneeMap = {};
    (details.projectsList || []).forEach(project => {
      if (project.status === 'Completed' || project.isArchived) return;
      if (!project.startDate && !project.dueDate) return;

      const assigneeName = project.owner?.name || 'Unassigned';
      if (!assigneeMap[assigneeName]) {
        assigneeMap[assigneeName] = {
          name: assigneeName,
          id: project.owner?.id,
          profilePhoto: project.owner?.profilePhoto,
          projects: [],
          dailyCounts: Array(totalDays).fill(0)
        };
      }

      let tStart = project.startDate ? new Date(project.startDate) : new Date(project.dueDate);
      let tEnd = project.dueDate ? new Date(project.dueDate) : new Date(project.startDate);
      tStart.setHours(0, 0, 0, 0);
      tEnd.setHours(0, 0, 0, 0);

      const offsetMs = tStart.getTime() - startDate.getTime();
      const offsetDays = Math.round(offsetMs / (1000 * 60 * 60 * 24));
      const durationMs = tEnd.getTime() - tStart.getTime();
      const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1);

      const projectData = {
        ...project,
        left: offsetDays * DAY_WIDTH,
        width: durationDays * DAY_WIDTH
      };

      assigneeMap[assigneeName].projects.push(projectData);

      for (let i = 0; i < totalDays; i++) {
        const currentDay = daysArr[i].timestamp;
        if (currentDay >= tStart.getTime() && currentDay <= tEnd.getTime()) {
          assigneeMap[assigneeName].dailyCounts[i]++;
        }
      }
    });

    const data = Object.values(assigneeMap).sort((a, b) => {
      if (a.name === 'Unassigned') return 1;
      if (b.name === 'Unassigned') return -1;
      return a.name.localeCompare(b.name);
    });

    return { start: startDate, days: daysArr, assigneeData: data };
  }, [details]);

  const goToday = (smooth = true) => {
    if (scrollContainerRef.current) {
      const todayIdx = days.findIndex(d => d.isToday);
      if (todayIdx !== -1) {
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, todayIdx * DAY_WIDTH - 200),
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      goToday(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const portalTarget = document.getElementById('timeline-topbar-portal');

  return (
    <div style={styles.container}>
      {portalTarget && createPortal(
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.capacityControl}>
            <label style={{ fontSize: '0.85rem', color: '#6B7280' }}>{t("capacity_limit", "Capacity limit:")}</label>
            <input
              type="number"
              value={capacityLimit}
              onChange={e => setCapacityLimit(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.capacityInput}
              min="1"
            />
            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>projects/day</span>
          </div>
        </div>,
        portalTarget
      )}

      <div style={styles.layoutWrapper}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>{t("owner", "Owner")}</div>
          <div style={styles.sidebarContent}>
            {assigneeData.length === 0 && <div style={styles.emptyState}>{t("no_scheduled_projects", "No scheduled projects")}</div>}

            {assigneeData.map((assignee, idx) => (
              <div key={idx} style={styles.assigneeGroupSidebar}>
                <div style={styles.assigneeMainRowSidebar} onClick={() => toggleExpand(assignee.name)}>
                  <span style={{
                    ...styles.chevron,
                    transform: expandedAssignees[assignee.name] ? 'rotate(90deg)' : 'rotate(0)'
                  }}>▶</span>
                  <UserAvatar name={assignee.name} userId={assignee.id} profilePhoto={assignee.profilePhoto} size={24} style={{ marginRight: '8px' }} />
                  <span style={styles.assigneeName}>{assignee.name}</span>
                </div>
                {expandedAssignees[assignee.name] && (
                  <div style={{ ...styles.expandedTasksSidebar, height: assignee.projects.length * 32 }}>
                    {assignee.projects.map(project => (
                      <div key={project.id} style={styles.taskLabelRow}>
                        {project.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.timelineScrollArea} ref={scrollContainerRef}>
          <div style={{ width: days.length * DAY_WIDTH, position: 'relative' }}>
            <div style={styles.timelineHeader}>
              {days.map((d, i) => (
                <div key={i} style={{
                  ...styles.dayHeaderCell,
                  width: DAY_WIDTH,
                  borderBottom: d.isToday ? '3px solid var(--accent-success)' : '1px solid #E5E7EB'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase' }}>{d.dayName}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: d.isToday ? '700' : '500', color: d.isToday ? 'var(--accent-success)' : '#111827' }}>
                    {d.dayNum}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.timelineContent}>
              <div style={styles.gridLinesContainer}>
                {days.map((d, i) => (
                  <div key={i} style={{
                    ...styles.gridLine,
                    left: i * DAY_WIDTH,
                    backgroundColor: d.isToday ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    borderLeft: d.dayName === 'Mon' ? '1px solid #E5E7EB' : '1px dashed #F3F4F6'
                  }}></div>
                ))}
              </div>

              {assigneeData.map((assignee, idx) => (
                <div key={idx} style={styles.assigneeGroupTimeline}>
                  <div style={styles.assigneeMainRowTimeline}>
                    {(() => {
                      const points = assignee.dailyCounts.map((count, dayIdx) => {
                        const x = dayIdx * DAY_WIDTH + DAY_WIDTH / 2;
                        const y = count === 0 ? 44 : Math.max(10, 44 - count * 12);
                        return { x, y, count, dayIdx };
                      });
                      if (points.length === 0) return null;
                      const firstY = points[0].y;
                      const lastY = points[points.length - 1].y;
                      const linePoints = `0,${firstY} ${points.map(p => `${p.x},${p.y}`).join(' ')} ${days.length * DAY_WIDTH},${lastY}`;
                      const polyPoints = `0,44 ${linePoints} ${days.length * DAY_WIDTH},44`;
                      return (
                        <>
                          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            <polygon points={polyPoints} fill="rgba(99, 102, 241, 0.15)" />
                            <polyline points={linePoints} fill="none" stroke="#818CF8" strokeWidth="2" />
                          </svg>

                          {points.map((p, i) => {
                            if (p.count === 0) return null;
                            const isOverloaded = p.count > capacityLimit;
                            return (
                              <div key={i} style={{
                                position: 'absolute', left: p.dayIdx * DAY_WIDTH, width: DAY_WIDTH, top: p.y - 8,
                                textAlign: 'center', fontSize: '0.75rem', color: isOverloaded ? 'var(--accent-danger)' : 'var(--text-primary)',
                                fontWeight: isOverloaded ? 'bold' : '500', pointerEvents: 'none'
                              }}>
                                {p.count}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>

                  {expandedAssignees[assignee.name] && (
                    <div style={{ ...styles.expandedTasksTimeline, height: assignee.projects.length * 32 }}>
                      {assignee.projects.map((project, tIdx) => (
                        <div key={project.id} style={{ ...styles.taskBarRow, top: tIdx * 32 }}>
                          <div style={{
                            ...styles.taskBar,
                            left: project.left,
                            width: Math.max(project.width, 10),
                            backgroundColor: project.color || '#6366F1'
                          }}>
                            <div style={styles.taskBarContent}>
                              <span style={styles.taskTitleTruncated}>{project.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden'
  },
  capacityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    border: '1px solid var(--border-color)'
  },
  capacityInput: {
    width: '40px',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'center',
    outline: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)'
  },
  layoutWrapper: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '250px',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    zIndex: 10
  },
  sidebarHeader: {
    height: '60px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'hidden',
    overflowX: 'hidden'
  },
  assigneeGroupSidebar: {
    borderBottom: '1px solid var(--border-color)'
  },
  assigneeMainRowSidebar: {
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1rem',
    cursor: 'pointer',
    gap: '0.5rem',
    backgroundColor: 'var(--bg-primary)',
    transition: 'background-color 0.1s'
  },
  chevron: {
    fontSize: '0.7rem',
    color: 'var(--text-tertiary)',
    transition: 'transform 0.2s',
    display: 'inline-block',
    width: '12px'
  },
  assigneeName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  expandedTasksSidebar: {
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-color)'
  },
  taskLabelRow: {
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1rem 0 3rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: '1px solid var(--border-color)'
  },
  emptyState: {
    padding: '2rem 1rem',
    color: 'var(--text-tertiary)',
    fontSize: '0.85rem',
    fontStyle: 'italic'
  },
  timelineScrollArea: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-secondary)'
  },
  timelineHeader: {
    height: '60px',
    display: 'flex',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    zIndex: 5
  },
  dayHeaderCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  timelineContent: {
    position: 'relative'
  },
  gridLinesContainer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0, right: 0,
    pointerEvents: 'none'
  },
  gridLine: {
    position: 'absolute',
    top: 0, bottom: 0, width: '40px',
    boxSizing: 'border-box'
  },
  assigneeGroupTimeline: {
    borderBottom: '1px solid var(--border-color)',
    position: 'relative',
    zIndex: 2
  },
  assigneeMainRowTimeline: {
    height: '44px',
    position: 'relative'
  },
  expandedTasksTimeline: {
    position: 'relative',
    borderTop: '1px solid var(--border-color)'
  },
  taskBarRow: {
    position: 'absolute',
    left: 0, right: 0, height: '32px',
    borderBottom: '1px solid var(--border-color)'
  },
  taskBar: {
    position: 'absolute',
    top: '4px', height: '24px', borderRadius: '12px',
    display: 'flex', alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer'
  },
  taskBarContent: {
    flex: 1, height: '100%',
    display: 'flex', alignItems: 'center',
    padding: '0 8px', overflow: 'hidden'
  },
  taskTitleTruncated: {
    fontSize: '0.75rem', color: '#FFF', fontWeight: '500',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  }
};