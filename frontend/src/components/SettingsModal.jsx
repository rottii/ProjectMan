import React from 'react';
import { useTranslation } from 'react-i18next';

export default function SettingsModal({ onClose }) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        padding: '24px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{t('settings')}</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('language')}</label>
          <select 
            value={i18n.language} 
            onChange={handleLanguageChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="en">{t('english')}</option>
            <option value="tr">{t('turkish')}</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
