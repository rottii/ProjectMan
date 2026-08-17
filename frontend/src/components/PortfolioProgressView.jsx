import { useTranslation } from "react-i18next";
import React, { useState, useRef, useEffect } from 'react';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';

export default function PortfolioProgressView({
  details,
  token,
  isReadOnly,
  onUpdate
}) {
  const { t } = useTranslation();
  
  const statusConfig = {
    'On track': {
      color: 'var(--accent-success)',
      label: t('on_track', 'On track'),
      desc: t('everything_is_running_smoothly', 'Everything is running smoothly.')
    },
    'At risk': {
      color: 'var(--accent-warning)',
      label: t('at_risk', 'At risk'),
      desc: t('there_are_some_concerns', 'There are some concerns.')
    },
    'Off track': {
      color: 'var(--accent-danger)',
      label: t('off_track', 'Off track'),
      desc: t('requires_immediate_attention', 'Requires immediate attention.')
    }
  };

  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateStatus = async newStatus => {
    if (isReadOnly) return;
    try {
      const response = await apiFetch(`/api/portfolios/${details.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          name: details.name // Need to send name for the put request in portfolio controller
        })
      });
      const data = await response.json();
      if (response.ok && onUpdate) {
        onUpdate(data);
      }
      setIsStatusMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Deduplicate members from projects
  const allMembers = [{ ...details.owner, role: 'Owner' }];
  (details.projectsList || []).forEach(project => {
    if (project.owner && !allMembers.find(m => m.id === project.owner.id)) {
      allMembers.push({ ...project.owner, role: 'Project Owner' });
    }
  });

  return (
    <div style={styles.overviewContainer}>
      <div style={styles.mainContent}>
        <div style={styles.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>{t("portfolio_description", "Portfolio description")}</h2>
          </div>
          <div style={styles.descriptionBox}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', color: '#9CA3AF' }}>
              <span style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</span>
              <p>{t("welcome_to_portfolio", "Welcome to this portfolio. Here you can track the high-level progress of multiple projects.")}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.sidePanel}>
        <div style={styles.sideSection}>
          <h3 style={styles.sideSectionTitle}>{t("portfolio_status", "Portfolio status")}</h3>
          <div style={styles.statusBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{
                ...styles.statusDot,
                backgroundColor: (statusConfig[details.status] || statusConfig['On track']).color
              }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                {(statusConfig[details.status] || statusConfig['On track']).label}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {(statusConfig[details.status] || statusConfig['On track']).desc}
            </p>
          </div>
        </div>

        <div style={styles.sideSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={styles.sideSectionTitle}>{t("portfolio_roles", "Portfolio roles")}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allMembers.map((member, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserAvatar name={member.name} userId={member.id} profilePhoto={member.profilePhoto} size={32} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>{member.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overviewContainer: {
    display: 'flex',
    padding: '2rem 3rem',
    gap: '2rem',
    height: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-secondary)',
    alignItems: 'flex-start'
  },
  mainContent: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  sidePanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    minWidth: '300px'
  },
  sectionCard: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid var(--border-color)'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  descriptionBox: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },
  sideSection: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid var(--border-color)'
  },
  sideSectionTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 1rem 0'
  },
  statusBox: {
    display: 'flex',
    flexDirection: 'column'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  }
};