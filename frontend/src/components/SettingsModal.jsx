import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './SettingsModal.css';
import { apiFetch, assetUrl } from '../api';
import UserAvatar from './UserAvatar';

const TABS = [
  'Profile',
  'Notifications',
  'Email Forwarding',
  'Account',
  'Display',
  'Navigation',
  'Apps',
  'Hacks'
];

export default function SettingsModal({ onClose, user, setUser, isDarkMode, setIsDarkMode, token, initialFocus }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (initialFocus) {
      setActiveTab('Profile');
      // Wait for React to render the Profile tab, then focus the input
      setTimeout(() => {
        const el = document.querySelector(`[name="${initialFocus}"]`);
        if (el) el.focus();
      }, 50);
    }
  }, [initialFocus]);

  // Profile Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    jobTitle: user?.jobTitle || '',
    department: user?.department || '',
    email: user?.email || '',
    aboutMe: user?.aboutMe || '',
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await apiFetch('/api/auth/me/preferences', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          jobTitle: formData.jobTitle,
          department: formData.department,
          aboutMe: formData.aboutMe
        })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSaveMessage('Saved successfully');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save');
      }
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const savePreference = async (updates) => {
    try {
      const res = await apiFetch('/api/auth/me/preferences', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    savePreference({ language: lang });
  };

  const handleThemeChange = (e) => {
    const val = e.target.value;
    const isDark = val === 'Dark';
    setIsDarkMode(isDark);
    localStorage.setItem('darkMode', isDark.toString());
    savePreference({ darkMode: isDark });
  };

  const handleDisplayPrefChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    // Optimistic UI update
    if (user && setUser) {
      const updatedUser = { ...user, [name]: val };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    savePreference({ [name]: val });
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="settings-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-modal-body">
          <div className="settings-sidebar">
            {TABS.map(tab => (
              <div 
                key={tab} 
                className={`settings-sidebar-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
          
          <div className="settings-content">
            {activeTab === 'Profile' && (
              <div>
                <div className="settings-photo-section">
                  <UserAvatar name={user?.name} size={100} profilePhoto={user?.profilePhoto} userId={user?.id} />
                  <div>
                    <button className="settings-upload-btn">Upload your photo</button>
                    <div className="settings-photo-text">Photos help your teammates recognize you in Asana</div>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Your full name *</label>
                    <input 
                      type="text" 
                      className="settings-input" 
                      name="name"
                      value={formData.name} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Job title</label>
                    <input 
                      type="text" 
                      className="settings-input" 
                      name="jobTitle"
                      value={formData.jobTitle} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Department or team</label>
                    <input 
                      type="text" 
                      className="settings-input" 
                      name="department"
                      value={formData.department} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      className="settings-input" 
                      value={formData.email} 
                      disabled 
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>About me</label>
                    <textarea 
                      className="settings-textarea" 
                      name="aboutMe"
                      value={formData.aboutMe} 
                      onChange={handleInputChange} 
                      placeholder="I usually work from 9am-5pm PST. Feel free to assign me a task with a due date anytime. Also, I love dogs!"
                    />
                  </div>
                </div>

                <div className="settings-personalization-card">
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Personalization settings</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Only you can see these fields. We use them to tailor Asana to you and to share relevant product recommendations.
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>⌄</span>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={saveProfile} 
                    disabled={saving}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {saveMessage && <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>{saveMessage}</span>}
                </div>
              </div>
            )}

            {activeTab === 'Display' && (
              <div>
                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Theme</label>
                    <select 
                      className="settings-select"
                      value={isDarkMode ? 'Dark' : 'Light'}
                      onChange={handleThemeChange}
                    >
                      <option value="Light">Light</option>
                      <option value="Dark">Dark</option>
                      <option value="System">System default</option>
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label>Sidebar & topbar color</label>
                    <select 
                      className="settings-select" 
                      name="sidebarColor" 
                      value={user?.sidebarColor || 'Black'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="Black">Black</option>
                      <option value="White">White</option>
                    </select>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Language</label>
                    <select 
                      className="settings-select"
                      value={i18n.language}
                      onChange={handleLanguageChange}
                    >
                      <option value="en">English</option>
                      <option value="tr">Turkish</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>


                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Pop-up notification duration</label>
                    <select 
                      className="settings-select" 
                      name="notificationDuration" 
                      value={user?.notificationDuration || '10 seconds (default)'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="10 seconds (default)">10 seconds (default)</option>
                      <option value="20 seconds">20 seconds</option>
                      <option value="Until dismissed">Until dismissed</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Open asana.com as</label>
                    <select 
                      className="settings-select" 
                      name="openAppAs" 
                      value={user?.openAppAs || 'Asana.com homepage'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="Asana.com homepage">Asana.com homepage</option>
                      <option value="My tasks">My tasks</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>

                <div className="settings-section-title">Advanced options</div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv1" name="showRowNumbers" checked={!!user?.showRowNumbers} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv1">Show row numbers</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv2" name="compactMode" checked={!!user?.compactMode} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv2">Enable compact mode</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv3" name="colorBlindMode" checked={!!user?.colorBlindMode} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv3">Enable color blind friendly mode (protanopia and deuteranopia)</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv4" name="showCelebrations" checked={user?.showCelebrations ?? true} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv4">Show occasional celebrations</label>
                </div>
              </div>
            )}

            {activeTab === 'Navigation' && (
              <div>
                <div className="settings-section-title" style={{marginTop: 0}}>Navigation labels and icons</div>
                <div className="settings-checkbox-row">
                  <input type="radio" name="navLabel" id="nav1" defaultChecked />
                  <label htmlFor="nav1">Icon and text</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="radio" name="navLabel" id="nav2" />
                  <label htmlFor="nav2">Icon only</label>
                </div>

                <div className="settings-section-title">Navigation visibility and ordering</div>
                <div className="settings-section-desc">Hidden items are accessible in 'More'</div>
                
                <div className="settings-toggle-row">
                  <div className="settings-toggle-left">
                    <span style={{ opacity: 0.3 }}>●</span>
                    <span style={{ color: 'var(--text-secondary)' }}>❖</span>
                    Work
                  </div>
                  <div className="settings-toggle-right">
                    <span>⋯</span>
                    <span>⋮⋮</span>
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="settings-toggle-left">
                    <span style={{ opacity: 0.3 }}>●</span>
                    <span style={{ color: 'var(--text-secondary)' }}>🤖</span>
                    Agents
                  </div>
                  <div className="settings-toggle-right">
                    <span>⋯</span>
                    <span>⋮⋮</span>
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="settings-toggle-left">
                    <span style={{ color: 'var(--accent-primary)' }}>●</span>
                    <span style={{ color: 'var(--text-secondary)' }}>▲</span>
                    Strategy
                  </div>
                  <div className="settings-toggle-right">
                    <span>⋯</span>
                    <span>⋮⋮</span>
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="settings-toggle-left">
                    <span style={{ opacity: 0.3 }}>●</span>
                    <span style={{ color: 'var(--text-secondary)' }}>📚</span>
                    Knowledge
                  </div>
                  <div className="settings-toggle-right">
                    <span>⋯</span>
                    <span>⋮⋮</span>
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="settings-toggle-left">
                    <span style={{ color: 'var(--accent-primary)' }}>●</span>
                    <span style={{ color: 'var(--text-secondary)' }}>👥</span>
                    People
                  </div>
                  <div className="settings-toggle-right">
                    <span>⋯</span>
                    <span>⋮⋮</span>
                  </div>
                </div>
              </div>
            )}

            {['Notifications', 'Email Forwarding', 'Account', 'Apps', 'Hacks'].includes(activeTab) && (
              <div style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>
                This tab is a placeholder and hasn't been implemented yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
