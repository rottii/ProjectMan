import React from 'react';

import { assetUrl } from '../api';

const UserAvatar = ({ name, size = 26, style = {}, onClick, profilePhoto, userId }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const token = localStorage.getItem('token');
  
  return (
    <div 
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: profilePhoto ? 'transparent' : '#E0E7FF',
        color: 'var(--accent-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.45}px`,
        fontWeight: '600',
        flexShrink: 0,
        userSelect: 'none',
        overflow: 'hidden',
        ...style
      }}
    >
      {profilePhoto ? (
        <img 
          src={assetUrl(`/api/auth/users/${userId}/photo?token=${token}`)} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        initial
      )}
    </div>
  );
};

export default UserAvatar;
