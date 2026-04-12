import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const ROOMS = [
  { id: 'general', name: 'General', icon: '💬' },
  { id: 'biology', name: 'Biology', icon: '🧬' },
  { id: 'medical-physics', name: 'Medical Physics', icon: '⚛️' },
  { id: 'biophysics', name: 'Biophysics', icon: '🔬' },
  { id: 'off-topic', name: 'Off-Topic', icon: '☕' },
];

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Chat = () => {
  const { user, token } = useAuth();
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (room) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/messages/${room}`);
      if (res.data.success) {
        setMessages(res.data.data.messages);
      }
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect socket
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', {
        room: currentRoom,
        userId: user._id,
        username: user.username,
      });
    });

    socket.on('receive_message', (msg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('typing', ({ username }) => {
      if (username !== user.username) {
        setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      }
    });

    socket.on('stop_typing', ({ username }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Join room and fetch messages when room changes
  useEffect(() => {
    fetchMessages(currentRoom);
    setTypingUsers([]);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_room', {
        room: currentRoom,
        userId: user._id,
        username: user.username,
      });
    }
  }, [currentRoom, fetchMessages, user._id, user.username]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleRoomSelect = (roomId) => {
    if (roomId === currentRoom) return;
    setCurrentRoom(roomId);
    setMessages([]);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit('user_typing', { room: currentRoom, username: user.username });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stop_typing', { room: currentRoom, username: user.username });
      }, 1500);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content) return;

    setInputText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit('stop_typing', { room: currentRoom, username: user.username });

    try {
      const res = await axios.post(`${API_URL}/messages`, {
        room: currentRoom,
        content,
        type: 'text',
      });

      if (res.data.success) {
        const newMessage = res.data.data.message;
        // Emit to socket for real-time delivery
        socketRef.current?.emit('send_message', newMessage);
        // Also add locally to avoid duplicate via receive_message
        setMessages((prev) =>
          prev.some((m) => m._id === newMessage._id) ? prev : [...prev, newMessage]
        );
      }
    } catch (err) {
      setError('Failed to send message.');
      setInputText(content);
    }
  };

  const currentRoomData = ROOMS.find((r) => r.id === currentRoom);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Rooms
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomSelect(room.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                width: '100%',
                padding: '0.8rem 1rem',
                border: 'none',
                background: currentRoom === room.id ? '#eff6ff' : 'transparent',
                color: currentRoom === room.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: currentRoom === room.id ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.9rem',
                transition: 'var(--transition)',
                borderLeft: currentRoom === room.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <span>{room.icon}</span>
              <span>{room.name}</span>
            </button>
          ))}
        </div>

        {/* Online users */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-light)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
            🟢 Online ({onlineUsers.length})
          </div>
          {onlineUsers.slice(0, 5).map((u) => (
            <div key={u.userId} style={{ paddingLeft: '0.5rem' }}>
              {u.username}
            </div>
          ))}
          {onlineUsers.length > 5 && (
            <div style={{ paddingLeft: '0.5rem' }}>+{onlineUsers.length - 5} more</div>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Room header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>{currentRoomData?.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{currentRoomData?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
              {onlineUsers.length} online
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.6rem 1.5rem',
              fontSize: '0.875rem',
            }}
          >
            {error}{' '}
            <button
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 600 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-light)',
                marginTop: '3rem',
                fontSize: '0.9rem',
              }}
            >
              No messages yet. Be the first to say something! 👋
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender?._id === user._id || msg.sender === user._id;
              return (
                <div
                  key={msg._id}
                  style={{
                    display: 'flex',
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: '0.6rem',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="avatar-initials avatar-sm"
                    style={{ flexShrink: 0 }}
                    title={msg.sender?.username || 'User'}
                  >
                    {getInitials(msg.sender?.username || 'U')}
                  </div>

                  {/* Bubble */}
                  <div
                    style={{
                      maxWidth: '65%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOwn ? 'flex-end' : 'flex-start',
                      gap: '0.2rem',
                    }}
                  >
                    {!isOwn && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {msg.sender?.username || 'Unknown'}
                      </span>
                    )}
                    <div
                      style={{
                        background: isOwn ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isOwn ? '#fff' : 'var(--text-primary)',
                        border: isOwn ? 'none' : '1px solid var(--border)',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '0.6rem 0.9rem',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: 'var(--shadow)',
                      }}
                    >
                      {msg.content}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-light)',
                fontSize: '0.8rem',
                fontStyle: 'italic',
              }}
            >
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      background: 'var(--text-light)',
                      borderRadius: '50%',
                      animation: `bounce 1s ease infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="form-control"
            placeholder={`Message #${currentRoomData?.name}...`}
            value={inputText}
            onChange={handleInputChange}
            style={{ flex: 1 }}
            maxLength={2000}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputText.trim()}
            style={{ flexShrink: 0 }}
          >
            Send
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default Chat;
