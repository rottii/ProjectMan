import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from 'react';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';

export default function ProfileView({
  user,
  setUser,
  setShowSettings,
  setSettingsFocus,
  projects,
  activeWorkspace,
  setActiveView,
  handleSelectProject,
  token
}) {
  const {
    t
  } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const handlePhotoUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await apiFetch('/api/auth/profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = {
          ...user,
          profilePhoto: data.profilePhoto
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage')); // trigger update if we listen to storage, or just reload
        window.location.reload(); // Simple way to ensure everything updates with the new photo
      }
    } catch (err) {
      console.error('Failed to upload profile photo', err);
    } finally {
      setIsUploading(false);
    }
  };
  useEffect(() => {
    if (token) {
      apiFetch('/api/goals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => res.json()).then(data => setGoals(data)).catch(err => console.error('Failed to fetch goals:', err));
    }
  }, [token]);

  // Extract all tasks for the user
  const allTasks = [];
  (projects || []).forEach(p => {
    if (!p.isArchived) {
      p.sections?.forEach(s => {
        s.tasks?.forEach(t => {
          if (t.assigneeId === user?.id) {
            allTasks.push({
              ...t,
              projectName: p.name
            });
          }
        });
      });
    }
  });
  const incompleteTasks = allTasks.filter(t => !t.isCompleted).slice(0, 5);

  // Extract recent projects
  const recentProjects = (projects || []).filter(p => !p.isArchived && p.status !== 'MY_TASKS').slice(0, 3);

  // Extract frequent collaborators
  const collaborators = [];
  const seenIds = new Set([user?.id]); // Exclude self
  (activeWorkspace?.teams || []).forEach(team => {
    (team.members || []).forEach(member => {
      if (member.user && !seenIds.has(member.user.id)) {
        collaborators.push(member.user);
        seenIds.add(member.user.id);
      }
    });
  });
  const formatDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };
  return <div style={{
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  }}>

      {/* HEADER */}
      <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '24px'
    }}>
        <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        opacity: isUploading ? 0.7 : 1
      }} onClick={() => fileInputRef.current?.click()}>
          <UserAvatar name={user?.name} size={120} profilePhoto={user?.profilePhoto} userId={user?.id} />
          <div style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '50%',
          padding: '4px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          cursor: 'pointer'
        }}>
            <span style={{
            fontSize: '0.8rem'
          }}>📷</span>
          </div>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{
          display: 'none'
        }} />
        </div>
        <div>
          <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
            {user?.name || 'User'}
          </h1>
          <p style={{
          margin: '0 0 16px 0',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
            <span>{t("set_out_of_office", "\uD83D\uDCC5 Set out of office")}</span>
          </p>
          <div style={{
          display: 'flex',
          gap: '16px',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '16px'
        }}>
            <span style={{
            cursor: user?.jobTitle ? 'default' : 'pointer',
            color: user?.jobTitle ? 'var(--text-primary)' : 'var(--text-secondary)'
          }} onClick={() => {
            if (user?.jobTitle) return;
            setSettingsFocus('jobTitle')
            setShowSettings(true)
          }}>{user?.jobTitle || t("add_job_title", "+ Add job title")}</span>
            <span style={{
            cursor: user?.department ? 'default' : 'pointer',
            color: user?.department ? 'var(--text-primary)' : 'var(--text-secondary)'
          }} onClick={() => {
            if (user?.department) return;
            setSettingsFocus('department')
            setShowSettings(true)
          }}>{user?.department || t("add_team_or_dept", "+ Add team or dept.")}</span>
            <span style={{
            cursor: user?.aboutMe ? 'default' : 'pointer',
            color: user?.aboutMe ? 'var(--text-primary)' : 'var(--text-secondary)'
          }} onClick={() => {
            if (user?.aboutMe) return;
            setSettingsFocus('aboutMe')
            setShowSettings(true)
          }}>{user?.aboutMe || t("add_about_me", "+ Add about me")}</span>
          </div>
          <button onClick={() => setShowSettings(true)} style={{
          backgroundColor: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '0.9rem',
          cursor: 'pointer',
          fontWeight: '500'
        }}>{t("edit_profile", "Edit profile")}</button>
        </div>
      </div>

      <div style={{
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start'
    }}>
        {/* LEFT COLUMN */}
        <div style={{
        flex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

          {/* MY TASKS WIDGET */}
          <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '20px'
        }}>
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
              <h2 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>{t("my_tasks", "My tasks \uD83D\uDD12")}</h2>
              <button onClick={() => {
              if (setActiveView) setActiveView('my-tasks');
            }} style={{
              padding: '4px 12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}>{t("view_all_tasks", "View all tasks")}</button>
            </div>

            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
              {incompleteTasks.length === 0 ? <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)'
            }}>{t("no_tasks_assigned_to_you", "No tasks assigned to you.")}</div> : incompleteTasks.map(task => <div key={task.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--border-color)'
            }}>
                    <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'transparent'
              }}>✓</div>
                    <span style={{
                flex: 1,
                fontSize: '0.9rem'
              }}>{task.title}</span>
                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                      <span style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                        <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--text-tertiary)',
                    borderRadius: '2px'
                  }}></div>
                        {task.projectName}
                      </span>
                      {task.dueDate && <span style={{
                  color: '#DC2626',
                  fontSize: '0.85rem',
                  width: '40px',
                  textAlign: 'right'
                }}>{formatDate(task.dueDate)}</span>}
                    </div>
                  </div>)}
            </div>
          </div>

          {/* MY RECENT PROJECTS WIDGET */}
          <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '20px'
        }}>
            <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>{t("my_recent_projects", "My recent projects")}</h2>
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
              {recentProjects.length === 0 ? <div style={{
              color: 'var(--text-tertiary)'
            }}>{t("no_recent_projects", "No recent projects.")}</div> : recentProjects.map(project => <div key={project.id} onClick={() => {
              if (handleSelectProject) handleSelectProject(project);
              if (setActiveView) setActiveView('project');
            }} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px'
            }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: project.color || '#4F46E5',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '0.8rem'
              }}>
                      {project.icon || '📋'}
                    </div>
                    <span style={{
                flex: 1,
                fontSize: '0.95rem'
              }}>{project.name}</span>
                  </div>)}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

          {/* COLLABORATORS WIDGET */}
          <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '20px'
        }}>
            <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>{t("frequent_collaborators", "Frequent collaborators \uD83D\uDD12")}</h2>

            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            cursor: 'pointer'
          }}>
              <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px dashed var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}>
                +
              </div>
              <span style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>{t("invite_teammates", "Invite teammates")}</span>
            </div>

            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
              {collaborators.length === 0 ? <div style={{
              color: 'var(--text-tertiary)',
              fontSize: '0.85rem'
            }}>{t("no_other_members_in_this_workspace", "No other members in this workspace.")}</div> : collaborators.map(c => <div key={c.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
                    <UserAvatar name={c.name || c.email} userId={c.id} profilePhoto={c.profilePhoto} size={36} />
                    <span style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}>{c.email}</span>
                  </div>)}
            </div>
          </div>

          {/* GOALS WIDGET */}
          <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '20px'
        }}>
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
              <h2 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>{t("my_goals", "My goals")}</h2>
              <button onClick={() => {
              if (setActiveView) setActiveView('goals');
            }} style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>{t("create_goal", "Create goal")}</button>
            </div>

            <p style={{
            margin: '0 0 12px 0',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>{t("use_goals_to_achieve_your_most_important_objective", "Use goals to achieve your most important objectives")}</p>
            <p style={{
            margin: '0 0 20px 0',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>{t("connect_work_and_goals_to_see_progress_and_keep_yo", "Connect work and goals to see progress and keep your team on track")}</p>

            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
              {goals.length === 0 ? <div style={{
              color: 'var(--text-tertiary)',
              fontSize: '0.85rem'
            }}>{t("no_goals_created_yet", "No goals created yet.")}</div> : goals.slice(0, 3).map(goal => {
              const progress = goal.targetValue > 0 ? Math.round(goal.currentValue / goal.targetValue * 100) : 0;
              const statusColor = goal.status === 'On track' ? '#10B981' : goal.status === 'At risk' ? '#F59E0B' : goal.status === 'Off track' ? '#EF4444' : '#6B7280';
              const trackColor = goal.status === 'On track' ? '#A7F3D0' : goal.status === 'At risk' ? '#FDE68A' : goal.status === 'Off track' ? '#FECACA' : 'var(--bg-tertiary)';
              return <div key={goal.id}>
                      <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>{goal.title}</div>
                      <div style={{
                  height: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '4px',
                  width: '100%',
                  marginBottom: '6px',
                  position: 'relative'
                }}>
                        <div style={{
                    height: '8px',
                    backgroundColor: trackColor,
                    borderRadius: '4px',
                    width: `${progress}%`
                  }}></div>
                      </div>
                      <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)'
                }}>
                        <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: statusColor
                  }}></div>
                        {goal.status} ({progress}%)
                      </div>
                    </div>;
            })}
            </div>
          </div>

        </div>
      </div>
    </div>;
}