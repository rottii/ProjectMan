import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api';
import UserAvatar from './UserAvatar';
import './GlobalChat.css';

export default function GlobalChat({ user, token, activeWorkspaceId, workspaces, socket }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const fetchMessages = async () => {
      try {
        const response = await apiFetch(`/api/workspace-messages/${activeWorkspaceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch workspace messages', err);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('join_workspace', activeWorkspaceId);

      const handleReceiveMessage = (message) => {
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        
        setIsOpen(currentIsOpen => {
          if (!currentIsOpen) {
            setHasUnread(true);
          }
          return currentIsOpen;
        });
      };

      socket.on('receive_workspace_message', handleReceiveMessage);

      return () => {
        socket.emit('leave_workspace', activeWorkspaceId);
        socket.off('receive_workspace_message', handleReceiveMessage);
      };
    }
  }, [activeWorkspaceId, token, socket]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeWorkspaceId) return;

    const content = inputValue;
    setInputValue('');

    try {
      const response = await apiFetch(`/api/workspace-messages/${activeWorkspaceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (!activeWorkspaceId) return null;

  return (
    <div className="global-chat-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>
              💬 {activeWorkspace?.name || t('workspace_chat', 'Workspace Chat')}
            </h3>
            <button className="close-chat-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <span>👋</span>
                <p>{t('no_messages_yet', 'No messages yet. Start the conversation!')}</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine = msg.senderId === user.id;
                const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`chat-message-row ${isMine ? 'mine' : ''}`}>
                    {!isMine && showAvatar ? (
                      <UserAvatar 
                        name={msg.sender?.name} 
                        userId={msg.senderId} 
                        profilePhoto={msg.sender?.profilePhoto} 
                        size={28} 
                      />
                    ) : (
                      !isMine && <div style={{ width: 28, height: 28, flexShrink: 0 }}></div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      {!isMine && showAvatar && (
                        <div className="chat-sender-name">{msg.sender?.name}</div>
                      )}
                      <div className="chat-bubble">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              className="chat-input"
              placeholder={t('type_a_message', 'Type a message...')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" disabled={!inputValue.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
      
      <button 
        className={`chat-toggle-btn ${hasUnread ? 'unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t('workspace_chat', 'Workspace Chat')}
      >
        {isOpen ? '↓' : '💬'}
      </button>
    </div>
  );
}
