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
        setSaveMessage(t('saved_successfully', 'Saved successfully'));
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(t('failed_to_save', 'Failed to save'));
      }
    } catch (err) {
      console.error(err);
      setSaveMessage(t('error_saving_profile', 'Error saving profile'));
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
          <h2>{t('settings', 'Settings')}</h2>
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
                {t(tab.toLowerCase().replace(/ /g, '_'), tab)}
              </div>
            ))}
          </div>
          
          <div className="settings-content">
            {activeTab === 'Profile' && (
              <div>
                <div className="settings-photo-section">
                  <UserAvatar name={user?.name} size={100} profilePhoto={user?.profilePhoto} userId={user?.id} />
                  <div>
                    <button className="settings-upload-btn">{t('upload_your_photo', 'Upload your photo')}</button>
                    <div className="settings-photo-text">{t('photo_help_text', 'Photos help your teammates recognize you in ProjectMan')}</div>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>{t('your_full_name', 'Your full name *')}</label>
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
                    <label>{t('job_title', 'Job title')}</label>
                    <input 
                      type="text" 
                      className="settings-input" 
                      name="jobTitle"
                      value={formData.jobTitle} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>{t('department_or_team', 'Department or team')}</label>
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
                    <label>{t('email', 'Email')}</label>
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
                    <label>{t('about_me', 'About me')}</label>
                    <textarea 
                      className="settings-textarea" 
                      name="aboutMe"
                      value={formData.aboutMe} 
                      onChange={handleInputChange} 
                      placeholder={t('about_me_placeholder', 'I usually work from 9am-5pm PST. Feel free to assign me a task with a due date anytime. Also, I love dogs!')}
                    />
                  </div>
                </div>

                <div className="settings-personalization-card">
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{t('personalization_settings', 'Personalization settings')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Only you can see these fields. We use them to tailor ProjectMan to you and to share relevant product recommendations.
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
                    {saving ? t('saving', 'Saving...') : t('save_profile', 'Save Profile')}
                  </button>
                  {saveMessage && <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>{saveMessage}</span>}
                </div>
              </div>
            )}

            {activeTab === 'Display' && (
              <div>
                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>{t('theme', 'Theme')}</label>
                    <select 
                      className="settings-select"
                      value={isDarkMode ? 'Dark' : 'Light'}
                      onChange={handleThemeChange}
                    >
                      <option value="Light">{t('light', 'Light')}</option>
                      <option value="Dark">{t('dark', 'Dark')}</option>
                      <option value="System">{t('system_default', 'System default')}</option>
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label>{t('sidebar_topbar_color', 'Sidebar & topbar color')}</label>
                    <select 
                      className="settings-select" 
                      name="sidebarColor" 
                      value={user?.sidebarColor || 'Black'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="Black">{t('black', 'Black')}</option>
                      <option value="White">{t('white', 'White')}</option>
                    </select>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>{t('language', 'Language')}</label>
                    <select 
                      className="settings-select"
                      value={i18n.language}
                      onChange={handleLanguageChange}
                    >
                      <option value="en">{t('english', 'English')}</option>
                      <option value="tr">{t('turkish', 'Turkish')}</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>


                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>{t('popup_notification_duration', 'Pop-up notification duration')}</label>
                    <select 
                      className="settings-select" 
                      name="notificationDuration" 
                      value={user?.notificationDuration || '10 seconds (default)'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="10 seconds (default)">{t('10_seconds_default', '10 seconds (default)')}</option>
                      <option value="20 seconds">{t('20_seconds', '20 seconds')}</option>
                      <option value="Until dismissed">{t('until_dismissed', 'Until dismissed')}</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>{t('open_projectman_as', 'Open projectman.com as')}</label>
                    <select 
                      className="settings-select" 
                      name="openAppAs" 
                      value={user?.openAppAs || 'ProjectMan.com homepage'} 
                      onChange={handleDisplayPrefChange}
                    >
                      <option value="ProjectMan.com homepage">{t('projectman_homepage', 'ProjectMan.com homepage')}</option>
                      <option value="My tasks">{t('my_tasks', 'My tasks')}</option>
                    </select>
                  </div>
                  <div className="settings-form-group" />
                </div>

                <div className="settings-section-title">{t('advanced_options', 'Advanced options')}</div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv1" name="showRowNumbers" checked={!!user?.showRowNumbers} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv1">{t('show_row_numbers', 'Show row numbers')}</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv2" name="compactMode" checked={!!user?.compactMode} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv2">{t('enable_compact_mode', 'Enable compact mode')}</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv3" name="colorBlindMode" checked={!!user?.colorBlindMode} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv3">{t('enable_color_blind_mode', 'Enable color blind friendly mode (protanopia and deuteranopia)')}</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="checkbox" id="adv4" name="showCelebrations" checked={user?.showCelebrations ?? true} onChange={handleDisplayPrefChange} />
                  <label htmlFor="adv4">{t('show_occasional_celebrations', 'Show occasional celebrations')}</label>
                </div>
              </div>
            )}

            {activeTab === 'Navigation' && (
              <div>
                <div className="settings-section-title" style={{marginTop: 0}}>{t('navigation_labels_and_icons', 'Navigation labels and icons')}</div>
                <div className="settings-checkbox-row">
                  <input type="radio" name="navLabel" id="nav1" defaultChecked />
                  <label htmlFor="nav1">{t('icon_and_text', 'Icon and text')}</label>
                </div>
                <div className="settings-checkbox-row">
                  <input type="radio" name="navLabel" id="nav2" />
                  <label htmlFor="nav2">{t('icon_only', 'Icon only')}</label>
                </div>

                <div className="settings-section-title">{t('navigation_visibility_and_ordering', 'Navigation visibility and ordering')}</div>
                <div className="settings-section-desc">{t('hidden_items_accessible_in_more', 'Hidden items are accessible in \'More\'')}</div>
                
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

            {activeTab === 'Notifications' && (
              <div>
                <div className="settings-section-title" style={{marginTop: 0}}>{t('email_verification', 'Email Verification')}</div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '12px 16px', 
                  backgroundColor: user?.emailVerified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: `1px solid ${user?.emailVerified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                }}>
                  <span style={{ fontSize: '20px' }}>{user?.emailVerified ? '✓' : '⚠'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {user?.emailVerified ? 'Email verified' : 'Email not verified'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {user?.emailVerified 
                        ? `Your email (${user?.email}) is verified. You will receive email notifications.`
                        : `Verify your email (${user?.email}) to receive email notifications.`
                      }
                    </div>
                  </div>
                  {!user?.emailVerified && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch('/api/auth/resend-verification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                          });
                          const data = await res.json();
                          setSaveMessage(res.ok ? t('verification_email_sent_msg', 'Verification email sent!') : (data.error || t('failed', 'Failed')));
                          setTimeout(() => setSaveMessage(''), 4000);
                        } catch (err) {
                          setSaveMessage(t('failed_to_send', 'Failed to send'));
                        }
                      }}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Resend email
                    </button>
                  )}
                </div>
                {saveMessage && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {saveMessage}
                  </div>
                )}

                <div className="settings-section-title">{t('email_notifications', 'Email Notifications')}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Choose which events trigger an email notification. These only work when your email is verified.
                </div>

                <div className="settings-checkbox-row">
                  <input 
                    type="checkbox" 
                    id="emailNotifAssigned" 
                    name="emailNotifAssigned"
                    checked={user?.emailNotifAssigned ?? true} 
                    onChange={handleDisplayPrefChange} 
                  />
                  <label htmlFor="emailNotifAssigned">
                    <div style={{ fontWeight: '500' }}>{t('task_assigned_to_me', 'Task assigned to me')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('task_assigned_to_me_desc', 'Get notified when someone assigns a task to you')}</div>
                  </label>
                </div>

                <div className="settings-checkbox-row">
                  <input 
                    type="checkbox" 
                    id="emailNotifComment" 
                    name="emailNotifComment"
                    checked={user?.emailNotifComment ?? true} 
                    onChange={handleDisplayPrefChange} 
                  />
                  <label htmlFor="emailNotifComment">
                    <div style={{ fontWeight: '500' }}>{t('comments_on_my_tasks', 'Comments on my tasks')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('comments_on_my_tasks_desc', 'Get notified when someone comments on a task you own or created')}</div>
                  </label>
                </div>

                <div className="settings-checkbox-row">
                  <input 
                    type="checkbox" 
                    id="emailNotifMention" 
                    name="emailNotifMention"
                    checked={user?.emailNotifMention ?? true} 
                    onChange={handleDisplayPrefChange} 
                  />
                  <label htmlFor="emailNotifMention">
                    <div style={{ fontWeight: '500' }}>{t('mentions', '@Mentions')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('mentions_desc', 'Get notified when someone mentions you in a comment or description')}</div>
                  </label>
                </div>

                <div className="settings-checkbox-row">
                  <input 
                    type="checkbox" 
                    id="emailNotifReminder" 
                    name="emailNotifReminder"
                    checked={user?.emailNotifReminder ?? true} 
                    onChange={handleDisplayPrefChange} 
                  />
                  <label htmlFor="emailNotifReminder">
                    <div style={{ fontWeight: '500' }}>{t('due_date_reminders', 'Due date reminders')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('due_date_reminders_desc', 'Get reminded when your tasks are due soon or overdue')}</div>
                  </label>
                </div>

                <div className="settings-checkbox-row">
                  <input 
                    type="checkbox" 
                    id="emailNotifUpdates" 
                    name="emailNotifUpdates"
                    checked={user?.emailNotifUpdates ?? false} 
                    onChange={handleDisplayPrefChange} 
                  />
                  <label htmlFor="emailNotifUpdates">
                    <div style={{ fontWeight: '500' }}>{t('weekly_summary_digest', 'Weekly summary digest')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('weekly_summary_digest_desc', 'Receive a weekly summary of activity across your projects')}</div>
                  </label>
                </div>
              </div>
            )}

            {['Email Forwarding', 'Account', 'Apps', 'Hacks'].includes(activeTab) && (
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
