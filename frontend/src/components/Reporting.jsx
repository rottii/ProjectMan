import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
export default function Reporting({
  token
}) {
  const {
    t
  } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMetrics();
  }, []);
  const fetchMetrics = async () => {
    try {
      const response = await apiFetch('/api/reporting/global', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <div style={{
    padding: '2rem',
    color: 'var(--text-primary)'
  }}>{t("loading_insights", "Loading Insights...")}</div>;
  if (!metrics) return <div style={{
    padding: '2rem',
    color: 'var(--text-primary)'
  }}>{t("failed_to_load_reporting_data", "Failed to load reporting data.")}</div>;
  const totalTasks = metrics.totalTasks || 0;
  const completedTasks = metrics.completedTasks || 0;
  const incompleteTasks = metrics.incompleteTasks || 0;
  const overdueTasks = metrics.overdueTasks || 0;
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'var(--bg-secondary)',
      overflowY: 'auto'
    },
    topHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.5rem 2rem 1.5rem 2rem',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-color)'
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
      margin: 0
    },
    content: {
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem'
    },
    metricsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem'
    },
    metricCard: {
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center'
    },
    metricValue: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: 'var(--text-primary)',
      margin: '0.5rem 0'
    },
    metricLabel: {
      fontSize: '0.9rem',
      color: 'var(--text-secondary)',
      fontWeight: '500'
    },
    chartGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '1.5rem'
    },
    chartCard: {
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    chartTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
      marginBottom: '1rem'
    },
    barContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    barRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    barLabel: {
      width: '120px',
      fontSize: '0.85rem',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    barTrack: {
      flex: 1,
      height: '16px',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex'
    },
    barFill: {
      height: '100%',
      backgroundColor: 'var(--accent-primary)',
      transition: 'width 0.5s ease-in-out'
    },
    barFillSuccess: {
      height: '100%',
      backgroundColor: 'var(--accent-success)',
      transition: 'width 0.5s ease-in-out'
    },
    barValue: {
      width: '40px',
      fontSize: '0.85rem',
      color: 'var(--text-primary)',
      textAlign: 'right',
      fontWeight: '600'
    },
    emptyState: {
      padding: '2rem',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
      fontSize: '0.9rem',
      border: '1px dashed var(--border-color)',
      borderRadius: '8px'
    }
  };
  return <div style={styles.container}>
      <div style={styles.topHeader}>
        <h1 style={styles.title}>{t("global_reporting_insights", "Global Reporting & Insights")}</h1>
        <button style={{
        padding: '0.4rem 1rem',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontWeight: '500'
      }}>{t("add_chart", "Add Chart")}</button>
      </div>

      <div style={styles.content}>
        {/* KPI Cards */}
        <div style={styles.metricsRow}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{t("total_tasks", "Total Tasks")}</div>
            <div style={styles.metricValue}>{totalTasks}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{t("completed_tasks", "Completed Tasks")}</div>
            <div style={{
            ...styles.metricValue,
            color: 'var(--accent-success)'
          }}>{completedTasks}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{t("incomplete_tasks", "Incomplete Tasks")}</div>
            <div style={styles.metricValue}>{incompleteTasks}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{t("overdue_tasks", "Overdue Tasks")}</div>
            <div style={{
            ...styles.metricValue,
            color: 'var(--accent-danger)'
          }}>{overdueTasks}</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={styles.chartGrid}>
          {/* Tasks by Project */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t("tasks_by_project", "Tasks by Project")}</div>
            {metrics.projectStats && metrics.projectStats.length > 0 ? <div style={styles.barContainer}>
                {metrics.projectStats.map((proj, idx) => {
              const max = Math.max(...metrics.projectStats.map(p => p.total), 1);
              const w = proj.total / max * 100;
              return <div key={idx} style={styles.barRow}>
                      <div style={styles.barLabel} title={proj.name}>{proj.name}</div>
                      <div style={styles.barTrack}>
                        <div style={{
                    ...styles.barFill,
                    width: `${w}%`
                  }} />
                      </div>
                      <div style={styles.barValue}>{proj.total}</div>
                    </div>;
            })}
              </div> : <div style={styles.emptyState}>{t("no_project_data_available", "No project data available")}</div>}
          </div>

          {/* Tasks by Assignee */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>{t("tasks_by_assignee", "Tasks by Assignee")}</div>
            {metrics.assigneeStats && metrics.assigneeStats.length > 0 ? <div style={styles.barContainer}>
                {metrics.assigneeStats.map((user, idx) => {
              const max = Math.max(...metrics.assigneeStats.map(u => u.total), 1);
              const w = user.total / max * 100;
              return <div key={idx} style={styles.barRow}>
                      <div style={styles.barLabel} title={user.name}>{user.name}</div>
                      <div style={styles.barTrack}>
                        <div style={{
                    ...styles.barFill,
                    backgroundColor: '#8B5CF6',
                    width: `${w}%`
                  }} />
                      </div>
                      <div style={styles.barValue}>{user.total}</div>
                    </div>;
            })}
              </div> : <div style={styles.emptyState}>{t("no_assignee_data_available", "No assignee data available")}</div>}
          </div>


        </div>
      </div>
    </div>;
}