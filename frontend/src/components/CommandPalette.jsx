import React, { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import './CommandPalette.css';

export default function CommandPalette({
  projects,
  portfolios,
  setActiveView,
  handleSelectProject,
  setSelectedPortfolio,
  setShowSettings,
  handleLogout
}) {
  const [open, setOpen] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigateView = useCallback((view) => {
    setOpen(false);
    setActiveView(view);
  }, [setActiveView]);

  const handleNavigateProject = useCallback((project) => {
    setOpen(false);
    handleSelectProject(project);
  }, [handleSelectProject]);

  const handleNavigatePortfolio = useCallback((portfolio) => {
    setOpen(false);
    setSelectedPortfolio(portfolio);
    setActiveView('portfolio_detail');
  }, [setSelectedPortfolio, setActiveView]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <Command
        className="cmdk-content"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input placeholder="Type a command or search..." className="cmdk-input" autoFocus />
        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="cmdk-group">
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('home')}>
              🏠 Home
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('my-tasks')}>
              ✅ My Tasks
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('inbox')}>
              📥 Inbox
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('reporting')}>
              📊 Reporting
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('portfolios')}>
              💼 Portfolios
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('goals')}>
              🎯 Goals
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions" className="cmdk-group">
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('create_project')}>
              ➕ Create New Project
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => handleNavigateView('profile')}>
              👤 My Profile
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => { setOpen(false); setShowSettings?.(true); }}>
              ⚙️ Settings
            </Command.Item>
            <Command.Item className="cmdk-item" onSelect={() => { setOpen(false); handleLogout?.(); }}>
              🚪 Logout
            </Command.Item>
          </Command.Group>

          {projects && projects.length > 0 && (
            <Command.Group heading="Projects" className="cmdk-group">
              {projects.filter(p => p.status !== 'MY_TASKS').map(project => (
                <Command.Item 
                  key={project.id} 
                  className="cmdk-item" 
                  onSelect={() => handleNavigateProject(project)}
                >
                  {project.icon || '📋'} {project.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {portfolios && portfolios.length > 0 && (
            <Command.Group heading="Portfolios" className="cmdk-group">
              {portfolios.map(portfolio => (
                <Command.Item 
                  key={portfolio.id} 
                  className="cmdk-item" 
                  onSelect={() => handleNavigatePortfolio(portfolio)}
                >
                  💼 {portfolio.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

        </Command.List>
      </Command>
    </div>
  );
}
