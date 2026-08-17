import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { apiFetch, API_BASE_URL } from './api'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import KanbanBoard from './components/KanbanBoard'
import Sidebar from './components/Sidebar'
import MyTasks from './components/MyTasks'
import TopNav from './components/TopNav'
import BrowseProjects from './components/BrowseProjects'
import Portfolios from './components/Portfolios'
import PortfolioDetail from './components/PortfolioDetail'
import CreateProject from './components/CreateProject'
import Inbox from './components/Inbox'
import ProfileView from './components/ProfileView'
import Goals from './components/Goals'
import Reporting from './components/Reporting'
import PublicForm from './components/PublicForm'
import AdminConsoleView from './components/AdminConsoleView'
import InvitePage from './components/InvitePage'
import ResetPasswordPage from './components/ResetPasswordPage'
import VerifyEmailPage from './components/VerifyEmailPage'
import EmailVerificationBanner from './components/EmailVerificationBanner'
import SettingsModal from './components/SettingsModal'
import CommandPalette from './components/CommandPalette'
import { UndoProvider } from './context/UndoContext'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [settingsFocus, setSettingsFocus] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')))
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const u = JSON.parse(userStr)
      if (u && typeof u.darkMode === 'boolean') return u.darkMode
    }
    return localStorage.getItem('darkMode') === 'true'
  })
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [portfolios, setPortfolios] = useState([])
  const [selectedPortfolio, setSelectedPortfolio] = useState(null)
  const [portfolioCreationParent, setPortfolioCreationParent] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const storedWorkspaceId = localStorage.getItem('activeWorkspaceId');
  const initialWorkspaceId = (storedWorkspaceId === 'null' || storedWorkspaceId === 'undefined') ? null : storedWorkspaceId;
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialWorkspaceId)
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(true)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  useEffect(() => {
    let timeoutId;
    if (!isSocketConnected) {
      timeoutId = setTimeout(() => setShowOfflineBanner(true), 3000);
    } else {
      setShowOfflineBanner(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isSocketConnected]);

  const handleWorkspaceChange = (newId) => {
    setActiveWorkspaceId(newId);
    setActiveView('home');
  };

  const [activeView, setActiveView] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/project/')) {
      localStorage.setItem('selectedProjectId', path.split('/')[2]);
      return 'project';
    }
    if (path.startsWith('/workspace/')) {
      const parts = path.split('/');
      localStorage.setItem('activeWorkspaceId', parts[2]);
      if (parts[3]) {
        const view = parts[3];
        const validViews = ['home', 'my-tasks', 'inbox', 'reporting', 'portfolios', 'goals', 'projects', 'profile', 'create_project', 'admin_console'];
        if (validViews.includes(view)) return view;
      }
      
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      return storedUser?.openAppAs === 'My tasks' ? 'my-tasks' : 'home';
    }
    if (path.startsWith('/portfolio/')) {
      localStorage.setItem('selectedPortfolioId', path.split('/')[2]);
      return 'portfolio_detail';
    }
    if (path.length > 1 && path !== '/') {
      const view = path.substring(1);
      // Validate view to prevent random paths from crashing the app
      const validViews = ['home', 'my-tasks', 'inbox', 'reporting', 'portfolios', 'goals', 'projects', 'profile', 'create_project', 'admin_console'];
      if (validViews.includes(view)) return view;
    }
    
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const defaultView = storedUser?.openAppAs === 'My tasks' ? 'my-tasks' : 'home';
    return localStorage.getItem('activeView') || defaultView;
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= 768)
  const previousViewRef = useRef((() => {
    const stored = localStorage.getItem('activeView') || 'home'
    return stored === 'create_project' ? 'home' : stored
  })())

  // Apply User Display Preferences to Body
  useEffect(() => {
    if (user) {
      document.body.classList.toggle('theme-sidebar-white', user.sidebarColor === 'White');
      document.body.classList.toggle('theme-compact-mode', !!user.compactMode);
      document.body.classList.toggle('theme-color-blind', !!user.colorBlindMode);
    } else {
      document.body.classList.remove('theme-sidebar-white', 'theme-compact-mode', 'theme-color-blind');
    }
  }, [user]);

  // --- HTML5 History API Routing ---

  // URL to State Sync (Back/Forward Buttons)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/project/')) {
        const id = path.split('/')[2];
        const proj = projects.find(p => p.id === id);
        if (proj) {
          setSelectedProject(proj);
          setActiveView('project');
        }
      } else if (path.startsWith('/portfolio/')) {
        const id = path.split('/')[2];
        const port = portfolios.find(p => p.id === id);
        if (port) {
          setSelectedPortfolio(port);
          setActiveView('portfolio_detail');
        }
      } else if (path.startsWith('/workspace/')) {
        const parts = path.split('/');
        setActiveWorkspaceId(parts[2]);
        if (parts[3]) {
          const view = parts[3];
          const validViews = ['home', 'my-tasks', 'inbox', 'reporting', 'portfolios', 'goals', 'projects', 'profile', 'create_project', 'admin_console'];
          setActiveView(validViews.includes(view) ? view : 'home');
        } else {
          setActiveView('home');
        }
      } else {
        const view = path.length > 1 ? path.substring(1) : 'home';
        const validViews = ['home', 'my-tasks', 'inbox', 'reporting', 'portfolios', 'goals', 'projects', 'profile', 'create_project', 'admin_console'];
        setActiveView(validViews.includes(view) ? view : 'home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projects, portfolios]);

  // State to URL Sync
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/invite/') ||
      currentPath.startsWith('/reset-password/') ||
      currentPath.startsWith('/verify-email/') ||
      currentPath.startsWith('/form/')) {
      return; // Do not overwrite these special URLs
    }

    let newPath = '/';
    if (activeView === 'project' && selectedProject) {
      newPath = `/project/${selectedProject.id}`;
    } else if (activeView === 'portfolio_detail' && selectedPortfolio) {
      newPath = `/portfolio/${selectedPortfolio.id}`;
    } else if (activeView === 'home' && activeWorkspaceId) {
      newPath = `/workspace/${activeWorkspaceId}`;
    } else if (activeWorkspaceId && activeView !== 'home') {
      newPath = `/workspace/${activeWorkspaceId}/${activeView}`;
    } else if (activeView !== 'home') {
      newPath = `/${activeView}`;
    }

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  }, [activeView, selectedProject, selectedPortfolio, activeWorkspaceId]);

  // ---------------------------------

  useEffect(() => {
    if (activeView !== 'create_project') {
      previousViewRef.current = activeView
    }
    localStorage.setItem('activeView', activeView)
    if (window.innerWidth <= 768) {
      setIsSidebarCollapsed(true)
    }
  }, [activeView, selectedProject, selectedPortfolio, activeWorkspaceId])

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null)
      setUser(null)
      setSelectedProject(null)
      setSelectedPortfolio(null)
      setActiveView('home')
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem('activeWorkspaceId', activeWorkspaceId)
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('darkMode', isDarkMode)

    // Sync with backend if logged in
    if (token) {
      apiFetch('/api/auth/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ darkMode: isDarkMode })
      }).then(res => res.json()).then(data => {
        if (data.user) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      }).catch(err => console.error('Failed to sync preferences:', err))
    }
  }, [isDarkMode, token])

  // Projeleri çek ve yenileme sonrası aktif projeyi geri yükle
  useEffect(() => {
    if (token) {
      setIsInitialDataLoading(true);

      const fetchProjects = apiFetch(`/api/projects?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Filter out tasks that belong to template projects from MY_TASKS
            const myTasksProject = data.find(p => p.status === 'MY_TASKS');
            if (myTasksProject) {
              myTasksProject.sections?.forEach(s => {
                if (s.tasks) {
                  s.tasks = s.tasks.filter(t => {
                    if (t.section?.project?.isTemplate) return false;
                    if (t.secondaryProjects?.some(sp => sp.project?.isTemplate)) return false;
                    return true;
                  });
                }
              });
            }

            setProjects(data)

            const savedProjectId = localStorage.getItem('selectedProjectId')
            if (savedProjectId) {
              const found = data.find(p => p.id === savedProjectId)
              if (found) {
                setSelectedProject(found)
              }
            }
          } else {
            console.error("Expected an array of projects, but got:", data)
            if (data.error && data.error.toLowerCase().includes("token")) {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('selectedProjectId')
              setToken(null)
              setUser(null)
              setSelectedProject(null)
              setActiveView('home')
            } else {
              setProjects([])
            }
          }
        })
        .catch(err => console.error("Projeler yüklenemedi", err))

      const fetchPortfolios = apiFetch('/api/portfolios', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPortfolios(data)
            const savedPortfolioId = localStorage.getItem('selectedPortfolioId')
            if (savedPortfolioId) {
              const found = data.find(p => p.id === savedPortfolioId)
              if (found) {
                setSelectedPortfolio(found)
              }
            }
          } else {
            setPortfolios([])
          }
        })
        .catch(err => console.error("Portföyler yüklenemedi", err))

      const fetchWorkspaces = apiFetch('/api/workspaces', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setWorkspaces(data)
            if (data.length > 0) {
              const currentIsValid = data.find(w => w.id === activeWorkspaceId);
              if (!currentIsValid || !activeWorkspaceId || activeWorkspaceId === 'null') {
                setActiveWorkspaceId(data[0].id)
              }
            }
          } else {
            setWorkspaces([])
          }
        })
        .catch(err => console.error("Workspaces yüklenemedi", err))

      Promise.all([fetchProjects, fetchPortfolios, fetchWorkspaces]).finally(() => {
        setIsInitialDataLoading(false);
      });
    }
  }, [token])

  useEffect(() => {
    if (user && user.id) {
      const socket = io(API_BASE_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socket.emit('join_user', user.id);

      socket.on('connect', () => setIsSocketConnected(true));
      socket.on('disconnect', () => setIsSocketConnected(false));
      socket.on('connect_error', () => setIsSocketConnected(false));

      socket.on('project_created', (newProj) => {
        setProjects(prev => {
          if (prev.find(p => p.id === newProj.id)) return prev;
          return [...prev, newProj];
        });
      });

      socket.on('project_shared', (sharedProj) => {
        setProjects(prev => {
          if (prev.find(p => p.id === sharedProj.id)) {
            return prev.map(p => p.id === sharedProj.id ? sharedProj : p);
          }
          return [...prev, sharedProj];
        });
      });

      return () => {
        socket.disconnect();
      }
    }
  }, [user]);

  const handleSelectProject = (project) => {
    if (project) {
      localStorage.setItem('selectedProjectId', project.id)
      setActiveView('project')
    } else {
      localStorage.removeItem('selectedProjectId')
      setActiveView('home')
    }
    setSelectedProject(project)
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (err) {
        console.error('Logout failed', err);
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedProjectId')
    setToken(null)
    setUser(null)
    setSelectedProject(null)
    setSelectedPortfolio(null)
    setActiveView('home')
  }

  const isPublicForm = window.location.pathname.startsWith('/form/');
  if (isPublicForm) {
    return <PublicForm />;
  }

  const isInvitePage = window.location.pathname.startsWith('/invite/');
  if (isInvitePage) {
    return <InvitePage token={window.location.pathname.split('/')[2]} setToken={setToken} setUser={setUser} currentUser={user} authToken={token} />;
  }

  const isResetPasswordPage = window.location.pathname.startsWith('/reset-password/');
  if (isResetPasswordPage) {
    return <ResetPasswordPage token={window.location.pathname.split('/')[2]} />;
  }

  const isVerifyEmailPage = window.location.pathname.startsWith('/verify-email/');
  if (isVerifyEmailPage) {
    return <VerifyEmailPage token={window.location.pathname.split('/')[2]} onVerified={() => {
      // Refresh user data to update emailVerified status
      if (token) {
        apiFetch('/api/auth/me/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({})
        }).then(r => r.json()).then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }).catch(() => {});
      }
    }} />;
  }

  if (!token) {
    return <Auth setToken={setToken} setUser={setUser} />
  }

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // Filter projects by active workspace, but always include 'MY_TASKS' which is global
  // Actually, MY_TASKS will now have a workspaceId, so we just filter by workspaceId directly!
  const filteredProjects = projects.filter(p => p.workspaceId === activeWorkspace?.id);
  const filteredPortfolios = portfolios.filter(p => p.workspaceId === activeWorkspace?.id);

  return (
    <UndoProvider>
      {showSettings && (
        <SettingsModal 
          onClose={() => {
            setShowSettings(false)
            setSettingsFocus(null)
          }} 
          user={user} 
          setUser={setUser} 
          isDarkMode={isDarkMode} 
          setIsDarkMode={setIsDarkMode} 
          token={token}
          initialFocus={settingsFocus}
        />
      )}
      <CommandPalette 
        projects={filteredProjects}
        portfolios={filteredPortfolios}
        setActiveView={setActiveView}
        handleSelectProject={handleSelectProject}
        setSelectedPortfolio={setSelectedPortfolio}
        setShowSettings={setShowSettings}
        handleLogout={handleLogout}
      />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TopNav
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          projects={filteredProjects}
          setProjects={setProjects}
          selectedProject={selectedProject}
          setActiveView={setActiveView}
          handleSelectProject={handleSelectProject}
          token={token}
          user={user}
          handleLogout={handleLogout}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={handleWorkspaceChange}
        />
        {showOfflineBanner && (
          <div style={{ backgroundColor: 'var(--accent-warning)', color: '#000', padding: '8px', textAlign: 'center', fontSize: '14px', zIndex: 1000 }}>
            You are offline. Trying to reconnect...
          </div>
        )}
        {user && user.emailVerified === false && (
          <EmailVerificationBanner token={token} user={user} setUser={setUser} />
        )}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {isInitialDataLoading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-primary)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {!isSidebarCollapsed && (
            <div
              className="mobile-sidebar-backdrop hide-on-desktop"
              onClick={() => setIsSidebarCollapsed(true)}
            />
          )}
          <Sidebar
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            projects={filteredProjects}
            setProjects={setProjects}
            selectedProject={selectedProject}
            handleSelectProject={handleSelectProject}
            activeView={activeView}
            setActiveView={setActiveView}
            user={user}
            token={token}
            handleLogout={handleLogout}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            activeWorkspaceId={activeWorkspaceId}
            setActiveWorkspaceId={handleWorkspaceChange}
            portfolios={filteredPortfolios}
            selectedPortfolio={selectedPortfolio}
            setSelectedPortfolio={setSelectedPortfolio}
            setShowSettings={setShowSettings}
          />
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', backgroundColor: 'var(--bg-secondary)', position: 'relative', scrollbarGutter: 'stable' }}>
            {activeView === 'home' ? (
              <Dashboard
                user={user}
                projects={filteredProjects}
                setProjects={setProjects}
                setSelectedProject={handleSelectProject}
                portfolios={filteredPortfolios}
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                handleSelectProject={handleSelectProject}
                handleLogout={handleLogout}
                activeView={activeView}
                setActiveView={setActiveView}
                setSelectedPortfolio={setSelectedPortfolio}
                setWorkspaces={setWorkspaces}
                token={token}
              />
            ) : activeView === 'project' && selectedProject ? (
              <KanbanBoard
                selectedProject={selectedProject}
                setSelectedProject={handleSelectProject}
                projects={filteredProjects}
                setProjects={setProjects}
                token={token}
                user={user}
                handleLogout={handleLogout}
              />
            ) : activeView === 'my-tasks' ? (
              <MyTasks token={token} user={user} projects={filteredProjects} setProjects={setProjects} />
            ) : activeView === 'projects' ? (
              <BrowseProjects
                projects={filteredProjects}
                setProjects={setProjects}
                setActiveView={setActiveView}
                handleSelectProject={handleSelectProject}
                token={token}
                user={user}
                activeWorkspaceId={activeWorkspaceId}
              />
            ) : activeView === 'portfolios' ? (
              <Portfolios
                portfolios={filteredPortfolios}
                setPortfolios={setPortfolios}
                token={token}
                setActiveView={setActiveView}
                setSelectedPortfolio={setSelectedPortfolio}
                portfolioCreationParent={portfolioCreationParent}
                setPortfolioCreationParent={setPortfolioCreationParent}
                activeWorkspaceId={activeWorkspaceId}
              />
            ) : activeView === 'portfolio_detail' && selectedPortfolio ? (
              <PortfolioDetail
                portfolio={selectedPortfolio}
                setPortfolio={setSelectedPortfolio}
                portfolios={filteredPortfolios}
                setPortfolios={setPortfolios}
                projects={filteredProjects}
                setProjects={setProjects}
                token={token}
                user={user}
                setActiveView={setActiveView}
                setPortfolioCreationParent={setPortfolioCreationParent}
                handleSelectProject={handleSelectProject}
              />
            ) : activeView === 'inbox' ? (
              <Inbox token={token} user={user} />
            ) : activeView === 'profile' ? (
              <ProfileView user={user} setUser={setUser} setShowSettings={setShowSettings} setSettingsFocus={setSettingsFocus} projects={filteredProjects} activeWorkspace={activeWorkspace} setActiveView={setActiveView} handleSelectProject={handleSelectProject} token={token} />
            ) : activeView === 'goals' ? (
              <Goals token={token} user={user} setActiveView={setActiveView} />
            ) : activeView === 'reporting' ? (
              <Reporting token={token} />
            ) : activeView === 'create_project' ? (
              <CreateProject
                token={token}
                setProjects={setProjects}
                setPortfolios={setPortfolios}
                setActiveView={setActiveView}
                previousView={previousViewRef.current}
                setSelectedProject={setSelectedProject}
                portfolioCreationParent={portfolioCreationParent}
                setPortfolioCreationParent={setPortfolioCreationParent}
                activeWorkspace={activeWorkspace}
              />
            ) : activeView === 'admin_console' ? (
              <AdminConsoleView
                workspaceId={activeWorkspaceId}
                token={token}
                currentUser={user}
              />
            ) : (
              <Dashboard
                user={user}
                projects={filteredProjects}
                setProjects={setProjects}
                setSelectedProject={handleSelectProject}
                portfolios={filteredPortfolios}
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                handleSelectProject={handleSelectProject}
                handleLogout={handleLogout}
                activeView={activeView}
                setActiveView={setActiveView}
                setSelectedPortfolio={setSelectedPortfolio}
                setWorkspaces={setWorkspaces}
                token={token}
              />
            )}
          </div>
        </div>
      </div>
    </UndoProvider>
  )
}