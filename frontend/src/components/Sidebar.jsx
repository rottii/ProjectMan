import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
export default function Sidebar({
  projects,
  setProjects,
  selectedProject,
  handleSelectProject,
  activeView,
  setActiveView,
  user,
  token,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  portfolios,
  workspaces,
  activeWorkspace,
  selectedPortfolio,
  setSelectedPortfolio,
  handleLogout,
  isDarkMode,
  setIsDarkMode,
  activeWorkspaceId,
  setActiveWorkspaceId,
  setShowSettings
}) {
  const {
    t
  } = useTranslation();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [narrowTab, setNarrowTab] = useState('Work');
  const [inviteLinkToken, setInviteLinkToken] = useState(null);
  const [collapsed, setCollapsed] = useState({
    projects: false,
    portfolios: false,
    starred: false
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('sidebarWidth')) || 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuCoords, setAddMenuCoords] = useState({
    top: 0,
    left: 0
  });
  const addMenuRef = useRef(null);
  const addMenuBtnRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const handleMouseMove = e => {
      if (!isResizing) return;
      let newWidth = e.clientX; // Direct mapping, no narrow sidebar offset
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('sidebarWidth', sidebarWidth);
      }
    };
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);
  useEffect(() => {
    if (token) {
      apiFetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => res.json()).then(data => {
        if (Array.isArray(data)) {
          const unread = data.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      }).catch(err => console.error(err));
    }
  }, [token, activeView]); // Re-fetch when activeView changes (e.g. they visit inbox)

  const safeProjects = Array.isArray(projects) ? projects : [];
  const activeProjects = safeProjects.filter(p => !p.isArchived && !p.isTemplate && p.status !== 'MY_TASKS');
  let currentUserId = user?.id || user?.userId;
  if (!currentUserId && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId = payload.userId || payload.id;
    } catch (e) {}
  }
  const isGuest = activeWorkspace?.members?.find(m => m.userId === currentUserId)?.role === 'GUEST';
  const isAdmin = activeWorkspace?.members?.find(m => m.userId === currentUserId)?.role === 'ADMIN';
  const toggleSection = section => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  async function handleCreateProject(e) {
    e.preventDefault();
    setActiveView('create_project');
    if (window.innerWidth <= 768) {
      setIsSidebarCollapsed(true);
    }
  }
  function renderProjectItem(project) {
    const isActive = activeView === 'project' && selectedProject?.id === project.id;
    return <li key={project.id} className={`sidebar-project-item ${isActive ? 'active' : ''}`} onClick={() => handleSelectProject(project)}>
        <div className="sidebar-project-icon-box" style={{
        backgroundColor: project.color || 'var(--accent-primary)',
        color: '#FFF'
      }}>{project.icon || '📋'}</div>
        <span className="sidebar-project-name">{project.name}</span>
      </li>;
  }
  const starredProjects = (projects || []).filter(p => p.starredBy?.some(s => s.userId === user?.id));
  const starredPortfolios = (portfolios || []).filter(p => p.starredBy?.some(s => s.userId === user?.id));
  return <aside className={`sidebar-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
    '--sidebar-width': `${sidebarWidth}px`
  }}>
      {/* SINGLE UNIFIED SIDEBAR */}
      <div className="sidebar-main" style={{
      width: `${sidebarWidth}px`
    }}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">PM</div>
          <span className="sidebar-brand-name">ProjectMan</span>
        </div>

        <div className="sidebar-wide-scrollable">
          {/* Primary Navigation */}
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${activeView === 'home' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('home');
            }}>
              <span className="sidebar-nav-icon">🏠</span>
              <span>{t('home')}</span>
            </button>
            <button className={`sidebar-nav-item ${activeView === 'my-tasks' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('my-tasks');
            }}>
              <span className="sidebar-nav-icon">✓</span>
              <span>{t('my_tasks')}</span>
            </button>
            <button className={`sidebar-nav-item ${activeView === 'inbox' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('inbox');
            }}>
              <span className="sidebar-nav-icon">🔔</span>
              <span style={{
                flex: 1,
                textAlign: 'left'
              }}>{t('inbox')}</span>
              {unreadCount > 0 && <span style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}>
                  {unreadCount}
                </span>}
            </button>
          </nav>

          <div className="sidebar-divider" />

          {/* Browse & Strategy */}
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${activeView === 'projects' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('projects');
            }}>
              <span className="sidebar-nav-icon">📋</span>
              <span>{t('projects')}</span>
            </button>
            <button className={`sidebar-nav-item ${activeView === 'portfolios' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('portfolios');
            }}>
              <span className="sidebar-nav-icon">📁</span>
              <span>{t('portfolios')}</span>
            </button>
            <button className={`sidebar-nav-item ${activeView === 'goals' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('goals');
            }}>
              <span className="sidebar-nav-icon">🎯</span>
              <span>{t('goals')}</span>
            </button>
            <button className={`sidebar-nav-item ${activeView === 'reporting' ? 'active' : ''}`} onClick={() => {
              handleSelectProject(null);
              setActiveView('reporting');
            }}>
              <span className="sidebar-nav-icon">📊</span>
              <span>{t('reporting')}</span>
            </button>
          </nav>

          <div className="sidebar-divider" />

          {/* Starred Section */}
          {(starredProjects.length > 0 || starredPortfolios.length > 0) && <div className="sidebar-section">
              <div className="sidebar-section-header">
                <div className="sidebar-section-label-group" onClick={() => toggleSection('starred')}>
                  <span className="sidebar-section-arrow">{collapsed.starred ? '▶' : '▼'}</span>
                  <span className="sidebar-section-label">{t('starred')}</span>
                </div>
              </div>

              {!collapsed.starred && <ul className="sidebar-project-list">
                  {starredProjects.map(renderProjectItem)}
                  {starredPortfolios.map(portfolio => {
                const isActive = activeView === 'portfolio_detail' && selectedPortfolio?.id === portfolio.id;
                return <li key={`star-port-${portfolio.id}`} className={`sidebar-project-item ${isActive ? 'active' : ''}`} onClick={() => {
                  handleSelectProject(null);
                  setSelectedPortfolio(portfolio);
                  setActiveView('portfolio_detail');
                }}>
                            <div className="sidebar-project-icon-box" style={{
                    backgroundColor: 'transparent',
                    color: 'var(--nav-text-secondary)'
                  }}>📁</div>
                            <span className="sidebar-project-name">{portfolio.name}</span>
                          </li>;
              })}
                </ul>}
            </div>}

          {/* Work Section (Projects & Portfolios) */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <div className="sidebar-section-label-group" onClick={() => toggleSection('work')}>
                <span className="sidebar-section-arrow">{collapsed.work ? '▶' : '▼'}</span>
                <span className="sidebar-section-label" style={{
                  textTransform: 'none'
                }}>{t('work')}</span>
              </div>
              {!isGuest && <div ref={addMenuRef}>
                  <button ref={addMenuBtnRef} className="sidebar-add-btn" onClick={e => {
                  e.stopPropagation();
                  if (!showAddMenu && addMenuBtnRef.current) {
                    const rect = addMenuBtnRef.current.getBoundingClientRect();
                    setAddMenuCoords({
                      top: rect.bottom + 4,
                      left: rect.left
                    });
                  }
                  setShowAddMenu(!showAddMenu);
                }}>+</button>
                  {showAddMenu && <div style={{
                  position: 'fixed',
                  top: `${addMenuCoords.top}px`,
                  left: `${addMenuCoords.left}px`,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  minWidth: '160px',
                  padding: '4px 0'
                }}>
                      <button onClick={e => {
                    e.stopPropagation();
                    setShowAddMenu(false);
                    setActiveView('create_project');
                  }} style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <span style={{
                      fontSize: '1.2rem',
                      color: 'var(--text-tertiary)'
                    }}>📋</span>{t("new_project", "New project")}</button>
                      <button onClick={e => {
                    e.stopPropagation();
                    setShowAddMenu(false);
                    setActiveView('create_portfolio');
                  }} style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <span style={{
                      fontSize: '1.2rem',
                      color: 'var(--text-tertiary)'
                    }}>📁</span>{t("new_portfolio", "New portfolio")}</button>
                    </div>}
                </div>}
            </div>
            
            {!collapsed.work && <ul className="sidebar-project-list">
                {/* Render Portfolios */}
                {(portfolios || []).map(portfolio => {
                const isActive = activeView === 'portfolio_detail' && selectedPortfolio?.id === portfolio.id;
                return <li key={portfolio.id} className={`sidebar-project-item ${isActive ? 'active' : ''}`} onClick={() => {
                  handleSelectProject(null);
                  setSelectedPortfolio(portfolio);
                  setActiveView('portfolio_detail');
                }}>
                          <div className="sidebar-project-icon-box" style={{
                    backgroundColor: 'transparent',
                    color: 'var(--nav-text-secondary)'
                  }}>📁</div>
                          <span className="sidebar-project-name">{portfolio.name}</span>
                        </li>;
              })}

                {/* Render Projects */}
                {activeProjects.map(renderProjectItem)}
              </ul>}
          </div>
        </div>

        {/* Bottom section: Profile + Invite */}
        <div className="sidebar-bottom-section">
          {!isGuest && <button className="sidebar-invite-btn" onClick={async () => {
            if (!activeWorkspaceId) return;
            try {
              const res = await apiFetch(`/api/invites/workspaces/${activeWorkspaceId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  maxUses: 50
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              setInviteLinkToken(data.token);
            } catch (err) {
              alert(`Error generating invite link: ${err.message}`);
            }
          }}>
              <span className="invite-icon">✉</span>{t("invite_teammates", "Invite teammates")}</button>}
          
          <div ref={profileRef}>
            <div className="sidebar-profile-row" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <UserAvatar name={user?.name} userId={user?.id} profilePhoto={user?.profilePhoto} size={28} style={{
                cursor: 'pointer'
              }} />
              <span className="sidebar-profile-name">{user?.name || 'User'}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--nav-text-secondary)' }}>⋯</span>
            </div>

            {showProfileMenu && <div className="profile-dropdown" style={{
            position: 'fixed',
            left: '16px',
            bottom: '60px',
            top: 'auto',
            right: 'auto',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 99999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            minHeight: '380px',
            width: '500px'
          }}>
                
                {/* LEFT PANE - Accounts */}
                <div style={{
              width: '220px',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border-color)'
            }}>
                  <div style={{
                padding: '16px 16px 8px 16px',
                fontWeight: '600',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}>{t("accounts", "Accounts")}</div>
                  
                  <div style={{
                flex: 1,
                overflowY: 'auto'
              }}>
                    {workspaces && workspaces.length > 0 && workspaces.map(ws => <div key={ws.id} style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: activeWorkspaceId === ws.id ? 'var(--hover-bg)' : 'transparent',
                  color: 'var(--text-primary)'
                }} onClick={() => {
                  if (setActiveWorkspaceId) setActiveWorkspaceId(ws.id);
                  setShowProfileMenu(false);
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = activeWorkspaceId === ws.id ? 'var(--hover-bg)' : 'transparent'}>
                        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                          <UserAvatar name={ws.name} size={28} />
                          <span style={{
                      fontSize: '0.85rem'
                    }}>{ws.name}</span>
                        </div>
                        {activeWorkspaceId === ws.id && <span style={{
                    color: 'var(--text-secondary)'
                  }}>✓</span>}
                      </div>)}
                  </div>

                  {/* Dark mode switch */}
                  <div onClick={() => setIsDarkMode(!isDarkMode)} style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}><span style={{
                    fontSize: '1.1rem'
                  }}>{isDarkMode ? '🌙' : '☀️'}</span> {isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  
                  <div onClick={() => {
                setShowProfileMenu(false);
                if (handleLogout) handleLogout();
              }} style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{
                  fontSize: '1.1rem'
                }}>→</span>{t("log_out_all", "Log out all")}</div>
                </div>

                {/* RIGHT PANE - Profile */}
                <div style={{
              width: '280px',
              display: 'flex',
              flexDirection: 'column'
            }}>
                  {/* Top active workspace banner */}
                  <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '12px 16px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-color)'
              }}>
                    {activeWorkspace?.name || 'My workspace'}
                  </div>

                  {/* Profile info */}
                  <div style={{
                padding: '16px 16px 12px 16px'
              }}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                      <UserAvatar name={user?.name} userId={user?.id} profilePhoto={user?.profilePhoto} size={42} />
                      <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                        {user?.name || 'User'}
                      </div>
                    </div>
                    
                    {/* Out of office */}
                    <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                      <span>📅</span>{t("set_out_of_office", "Set out of office")}</div>
                  </div>

                  <div style={{
                height: '1px',
                backgroundColor: 'var(--border-color)'
              }}></div>
                  
                  {/* Admin block */}
                  <div style={{
                padding: '4px 0'
              }}>
                    {isAdmin && <div onClick={() => {
                  setShowProfileMenu(false);
                  setActiveView('admin_console');
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>⚷</span>{t("admin_console", "Admin console")}</div>}
                    <div onClick={async () => {
                  setShowProfileMenu(false);
                  const name = window.prompt("Enter new workspace name:");
                  if (name) {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await apiFetch('/api/workspaces', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          name
                        })
                      });
                      if (res.ok) window.location.reload();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>+</span>{t("new_workspace", "New workspace")}</div>
                    <div onClick={async () => {
                  setShowProfileMenu(false);
                  if (!activeWorkspaceId) return;
                  try {
                    const res = await apiFetch(`/api/invites/workspaces/${activeWorkspaceId}`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        maxUses: 50
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setInviteLinkToken(data.token);
                  } catch (err) {
                    alert(`Error generating invite link: ${err.message}`);
                  }
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>👤</span>{t("invite_to_asana", "Invite to ProjectMan")}</div>
                  </div>

                  <div style={{
                height: '1px',
                backgroundColor: 'var(--border-color)'
              }}></div>

                  {/* Profile block */}
                  <div style={{
                padding: '4px 0'
              }}>
                    <div onClick={() => {
                  if (setActiveView) setActiveView('profile');
                  setShowProfileMenu(false);
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>👤</span>{t("profile", "Profile")}</div>
                    <div onClick={() => {
                  setShowProfileMenu(false);
                  setShowSettings(true);
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>⚙️</span>{t("settings", "Settings")}</div>
                    <div onClick={() => {
                  setShowProfileMenu(false);
                  alert('Add another account flow would open here.');
                }} className="profile-menu-item" style={{
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{
                    fontSize: '1.1rem',
                    width: '20px',
                    textAlign: 'center'
                  }}>+</span>{t("add_another_account", "Add another account")}</div>
                  </div>

                </div>
              </div>}
          </div>
        </div>
      </div>
      
      {/* Resizer Handle */}
      <div className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`} onMouseDown={() => setIsResizing(true)} />

      {/* Invite Link Modal */}
      {inviteLinkToken && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
          <div style={{
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        color: 'var(--text-primary)'
      }}>
            <h2 style={{
          marginTop: 0
        }}>{t("invite_link_generated", "Invite Link Generated")}</h2>
            <p>{t("share_this_link_with_anyone_you_want_to_join_the_w", "Share this link with anyone you want to join the workspace. It will expire after 50 uses.")}</p>
            <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem'
        }}>
              <input type="text" readOnly value={`${window.location.origin}/invite/${inviteLinkToken}`} style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
          }} />
              <button onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteLinkToken}`);
            alert('Copied to clipboard');
          }} style={{
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
          }}>{t("copy", "Copy")}</button>
            </div>
            <button onClick={() => setInviteLinkToken(null)} style={{
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}>{t("close", "Close")}</button>
          </div>
        </div>}
    </aside>;
}
