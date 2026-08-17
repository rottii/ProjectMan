import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import './BrowseProjects.css';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';
export default function BrowseProjects({
  projects,
  user,
  handleSelectProject,
  setActiveView,
  token,
  setProjects,
  activeWorkspaceId
}) {
  const {
    t
  } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    if (!token || !activeWorkspaceId) return;
    apiFetch(`/api/projects/templates?workspaceId=${activeWorkspaceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setTemplates(data);else setTemplates([]);
    }).catch(console.error);
  }, [token, activeWorkspaceId]);
  const handleUseTemplate = async template => {
    const newName = window.prompt("Yeni proje adını girin:", template.name.replace(' Template', ''));
    if (!newName) return;
    try {
      const response = await apiFetch(`/api/projects/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          isTemplate: false
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (setProjects) {
          setProjects(prev => [data, ...prev]);
        }
        handleSelectProject(data);
      } else {
        alert("Proje oluşturulamadı: " + data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const [activeOwner, setActiveOwner] = useState(null);
  const [activeMember, setActiveMember] = useState(null);
  const [activeStatus, setActiveStatus] = useState(null);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const safeProjects = Array.isArray(projects) ? projects : [];

  // Extract unique values for filters
  const uniqueOwners = [...new Set(safeProjects.map(p => p.owner?.name).filter(Boolean))];
  const uniqueMembers = [...new Set(safeProjects.flatMap(p => p.members?.map(m => m.user?.name)).filter(Boolean))];
  const uniquePortfolios = [...new Set(safeProjects.flatMap(p => p.portfolios?.map(pItem => pItem.portfolio?.name)).filter(Boolean))];
  const uniqueStatuses = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ON_HOLD', 'NONE'];
  const statusLabels = {
    ON_TRACK: t('on_track', 'On track'),
    AT_RISK: t('at_risk', 'At risk'),
    OFF_TRACK: t('off_track', 'Off track'),
    ON_HOLD: t('on_hold', 'On hold'),
    NONE: t('no_status', 'No status')
  };
  const filteredProjects = safeProjects.filter(p => {
    if (p.status === 'MY_TASKS') return false;
    if (p.isTemplate) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeOwner && p.owner?.name !== activeOwner) return false;
    if (activeMember && !p.members?.some(m => m.user?.name === activeMember)) return false;
    if (activePortfolio && !p.portfolios?.some(pItem => pItem.portfolio?.name === activePortfolio)) return false;
    if (activeStatus && p.status !== activeStatus && !(activeStatus === 'NONE' && !p.status)) return false;
    return true;
  });
  return <div className="browse-projects-container">
      <div className="browse-projects-header">
        <h1>{t("browse_projects", "Browse projects")}</h1>
        <button className="bp-create-btn" onClick={() => {
        if (setActiveView) setActiveView('create_project');
      }}>{t("create_project", "+ Create project")}</button>
      </div>

      <div className="bp-search-container">
        <span className="bp-search-icon">🔍</span>
        <input type="text" placeholder={t("find_a_project", "Find a project")} className="bp-search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="bp-filters" style={{
      position: 'relative'
    }}>
        <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
          <button className={`bp-filter-chip ${activeOwner ? 'active-filter' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'owner' ? null : 'owner')}>{t("owner_filter", "Owner: ")}{activeOwner || t("any", "Any")} <span>⌄</span>
          </button>
          {openDropdown === 'owner' && <div className="bp-filter-dropdown">
              <div className="bp-filter-dropdown-item" onClick={() => {
            setActiveOwner(null);
            setOpenDropdown(null);
          }}>{t("any", "Any")}</div>
              {uniqueOwners.map(o => <div key={o} className="bp-filter-dropdown-item" onClick={() => {
            setActiveOwner(o);
            setOpenDropdown(null);
          }}>{o}</div>)}
            </div>}
        </div>

        <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
          <button className={`bp-filter-chip ${activeMember ? 'active-filter' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'member' ? null : 'member')}>{t("member_filter", "Member: ")}{activeMember || t("any", "Any")} <span>⌄</span></button>
          {openDropdown === 'member' && <div className="bp-filter-dropdown">
              <div className="bp-filter-dropdown-item" onClick={() => {
            setActiveMember(null);
            setOpenDropdown(null);
          }}>{t("any", "Any")}</div>
              {uniqueMembers.map(m => <div key={m} className="bp-filter-dropdown-item" onClick={() => {
            setActiveMember(m);
            setOpenDropdown(null);
          }}>{m}</div>)}
            </div>}
        </div>

        <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
          <button className={`bp-filter-chip ${activePortfolio ? 'active-filter' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'portfolio' ? null : 'portfolio')}>{t("portfolios_filter", "Portfolios: ")}{activePortfolio || t("any", "Any")} <span>⌄</span></button>
          {openDropdown === 'portfolio' && <div className="bp-filter-dropdown">
              <div className="bp-filter-dropdown-item" onClick={() => {
            setActivePortfolio(null);
            setOpenDropdown(null);
          }}>{t("any", "Any")}</div>
              {uniquePortfolios.map(p => <div key={p} className="bp-filter-dropdown-item" onClick={() => {
            setActivePortfolio(p);
            setOpenDropdown(null);
          }}>{p}</div>)}
            </div>}
        </div>

        <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
          <button className={`bp-filter-chip ${activeStatus ? 'active-filter' : ''}`} onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}>{t("status_filter", "Status: ")}{activeStatus ? statusLabels[activeStatus] : t("any", "Any")} <span>⌄</span></button>
          {openDropdown === 'status' && <div className="bp-filter-dropdown">
              <div className="bp-filter-dropdown-item" onClick={() => {
            setActiveStatus(null);
            setOpenDropdown(null);
          }}>{t("any", "Any")}</div>
              {uniqueStatuses.map(s => <div key={s} className="bp-filter-dropdown-item" onClick={() => {
            setActiveStatus(s);
            setOpenDropdown(null);
          }}>{statusLabels[s] || s}</div>)}
            </div>}
        </div>
      </div>

      <div className="bp-table">
        <div className="bp-table-header">
          <div className="bp-col-name">{t("name", "Name")}</div>
          <div className="bp-col-members">{t("members", "Members")}</div>
          <div className="bp-col-portfolios">{t("portfolios", "Portfolios")}</div>
          <div className="bp-col-lastmod">{t("last_modified", "\u21C5 Last modified")}</div>
        </div>

        <div className="bp-table-body">
          {filteredProjects.map((project, index) => <div key={project.id} className="bp-table-row" onClick={() => handleSelectProject(project)}>
              <div className="bp-col-name bp-flex-name">
                <div className="bp-project-icon" style={{
              backgroundColor: project.color || 'var(--accent-primary)',
              color: '#FFF'
            }}>
                  {project.icon || '📋'}
                </div>
                <div className="bp-project-info">
                  <div className="bp-project-title">{project.name}</div>
                  <div className="bp-project-status">{t("joined", "Joined")}</div>
                </div>
              </div>
              <div className="bp-col-members">
                {(() => {
              const allUsers = [];
              if (project.owner && !allUsers.find(u => u.id === project.owner.id)) {
                allUsers.push(project.owner);
              }
              if (project.members) {
                project.members.forEach(m => {
                  if (m.user && !allUsers.find(u => u.id === m.user.id)) {
                    allUsers.push(m.user);
                  }
                });
              }
              if (allUsers.length === 0) return null;
              return <>
                      {allUsers.slice(0, 3).map((u, i) => <div key={i} title={u.name} style={{
                  display: 'inline-flex',
                  marginRight: '-6px'
                }}>
                          <UserAvatar name={u.name} userId={u.id} profilePhoto={u.profilePhoto} size={24} style={{
                    border: '2px solid var(--bg-primary)'
                  }} />
                        </div>)}
                      {allUsers.length > 3 && <div className="bp-member-more">+{allUsers.length - 3}</div>}
                    </>;
            })()}
              </div>
              <div className="bp-col-portfolios">
                {project.portfolios && project.portfolios.length > 0 ? project.portfolios.filter(pItem => pItem.portfolio?.ownerId === (user?.userId || user?.id) || pItem.portfolio?.privacy === 'Public to My workspace').map(pItem => <span key={pItem.portfolio?.id} className="bp-portfolio-pill">📁 {pItem.portfolio?.name}</span>) : ''}
              </div>
              <div className="bp-col-lastmod bp-text-muted">
                {project.updatedAt ? new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric'
            }).format(new Date(project.updatedAt)) : 'N/A'}
              </div>
            </div>)}
          {filteredProjects.length === 0 && <div className="bp-empty-state">{t("no_projects_found", "No projects found.")}</div>}
        </div>
      </div>

    </div>;
}