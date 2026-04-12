import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiSearch, FiPlus, FiArrowLeft, FiX, FiThumbsUp, FiMessageSquare, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORIES = ['All', 'Biology', 'Medical Physics', 'Biophysics', 'General Discussion', 'Other'];

const categoryBadgeClass = (cat) => {
  const map = {
    Biology: 'badge-biology',
    'Medical Physics': 'badge-medical-physics',
    Biophysics: 'badge-biophysics',
    'General Discussion': 'badge-general-discussion',
    Other: 'badge-other',
  };
  return `badge ${map[cat] || 'badge-general'}`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const formatTime = (d) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const Forums = () => {
  const { user } = useAuth();

  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicLoading, setTopicLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ title: '', content: '', category: 'General Discussion', tags: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchTopics = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 10 };
        if (search.trim()) params.search = search.trim();
        if (category !== 'All') params.category = category;

        const res = await axios.get(`${API_URL}/forums`, { params });
        if (res.data.success) {
          setTopics(res.data.data.topics);
          setPagination(res.data.data.pagination);
        }
      } catch {
        setError('Failed to load forum topics.');
      } finally {
        setLoading(false);
      }
    },
    [search, category]
  );

  useEffect(() => {
    fetchTopics(1);
  }, [fetchTopics]);

  const openTopic = async (topicId) => {
    setTopicLoading(true);
    try {
      const res = await axios.get(`${API_URL}/forums/${topicId}`);
      if (res.data.success) {
        setSelectedTopic(res.data.data.topic);
      }
    } catch {
      setError('Failed to load topic.');
    } finally {
      setTopicLoading(false);
    }
  };

  const handleVoteTopic = async (topicId, isDetail = false) => {
    try {
      const res = await axios.post(`${API_URL}/forums/${topicId}/vote`);
      if (res.data.success) {
        const voted = res.data.data.voted;
        const updateVotes = (prev) => {
          const votes = voted
            ? [...(prev.votes || []), user._id]
            : (prev.votes || []).filter((v) => v !== user._id);
          return { ...prev, votes };
        };

        if (isDetail && selectedTopic) {
          setSelectedTopic((prev) => updateVotes(prev));
        }

        setTopics((prev) =>
          prev.map((t) => (t._id === topicId ? updateVotes(t) : t))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTopic) return;
    setReplyLoading(true);
    try {
      const res = await axios.post(`${API_URL}/forums/${selectedTopic._id}/replies`, {
        content: replyText.trim(),
      });
      if (res.data.success) {
        setSelectedTopic(res.data.data.topic);
        setReplyText('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!createData.title || !createData.content) {
      setCreateError('Title and content are required.');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const tagsArray = createData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await axios.post(`${API_URL}/forums`, {
        title: createData.title,
        content: createData.content,
        category: createData.category,
        tags: tagsArray,
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setCreateData({ title: '', content: '', category: 'General Discussion', tags: '' });
        fetchTopics(1);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create topic.');
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Topic Detail View ───────────────────────────────────────────────────────
  if (topicLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div> Loading topic...
      </div>
    );
  }

  if (selectedTopic) {
    const hasVoted = selectedTopic.votes?.some(
      (v) => v === user?._id || v?._id === user?._id
    );

    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 800 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSelectedTopic(null); setReplyText(''); }}
            style={{ marginBottom: '1.25rem' }}
          >
            <FiArrowLeft size={14} /> Back to Forums
          </button>

          {/* Topic */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <span className={categoryBadgeClass(selectedTopic.category)} style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
                {selectedTopic.category}
              </span>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '0.6rem' }}>
                {selectedTopic.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="avatar-initials avatar-sm">
                  {getInitials(selectedTopic.author?.username)}
                </div>
                <Link to={`/profile/${selectedTopic.author?._id}`} style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {selectedTopic.author?.username}
                </Link>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  {formatTime(selectedTopic.createdAt)}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <FiEye size={12} style={{ marginRight: 3 }} />{selectedTopic.views} views
                </span>
              </div>
            </div>

            <hr className="divider" />

            <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {selectedTopic.content}
            </div>

            {selectedTopic.tags?.length > 0 && (
              <div className="tags-list" style={{ marginBottom: '1rem' }}>
                {selectedTopic.tags.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${hasVoted ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleVoteTopic(selectedTopic._id, true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FiThumbsUp size={14} />
                {selectedTopic.votes?.length || 0} Votes
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <FiMessageSquare size={13} style={{ marginRight: 4 }} />
                {selectedTopic.replies?.length || 0} Replies
              </span>
            </div>
          </div>

          {/* Replies */}
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Replies ({selectedTopic.replies?.length || 0})
          </h2>

          {selectedTopic.replies?.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', marginBottom: '1.5rem' }}
            >
              No replies yet. Be the first to respond!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {selectedTopic.replies.map((reply, idx) => (
                <div key={reply._id || idx} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div className="avatar-initials avatar-sm" style={{ flexShrink: 0 }}>
                      {getInitials(reply.author?.username)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <Link
                          to={`/profile/${reply.author?._id}`}
                          style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}
                        >
                          {reply.author?.username || 'Unknown'}
                        </Link>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          {formatTime(reply.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply.content}</p>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                          <FiThumbsUp size={11} style={{ marginRight: 3 }} />
                          {reply.votes?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add reply */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Post a Reply</h3>
            <form onSubmit={handleAddReply}>
              <div className="form-group">
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Share your thoughts..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={replyLoading || !replyText.trim()}
              >
                {replyLoading ? 'Posting...' : 'Post Reply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Topic List ──────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Discussion Forums</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {pagination.total} topic{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus size={15} /> Create Topic
          </button>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ maxWidth: 400 }}>
            <FiSearch className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 190 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Topics List */}
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div> Loading topics...
          </div>
        ) : topics.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💬</div>
            <p>No forum topics yet. Start the first discussion!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topics.map((topic) => {
              const excerpt =
                topic.content.length > 120 ? topic.content.slice(0, 120) + '...' : topic.content;
              const hasVoted = topic.votes?.some((v) => v === user?._id || v?._id === user?._id);

              return (
                <div
                  key={topic._id}
                  className="card"
                  style={{ padding: '1.25rem', cursor: 'pointer', transition: 'var(--transition)' }}
                  onClick={() => openTopic(topic._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openTopic(topic._id)}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <span className={categoryBadgeClass(topic.category)}>{topic.category}</span>
                        {topic.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>

                      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                        {topic.title}
                      </h3>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {excerpt}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div className="avatar-initials avatar-sm">
                            {getInitials(topic.author?.username)}
                          </div>
                          <Link
                            to={`/profile/${topic.author?._id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                          >
                            {topic.author?.username}
                          </Link>
                        </div>

                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                          {formatDate(topic.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexShrink: 0,
                        minWidth: 60,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={`btn btn-sm ${hasVoted ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={(e) => { e.stopPropagation(); handleVoteTopic(topic._id); }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', padding: '0.4rem 0.6rem' }}
                        title="Vote"
                      >
                        <FiThumbsUp size={14} />
                        <span style={{ fontSize: '0.72rem' }}>{topic.votes?.length || 0}</span>
                      </button>

                      <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-light)' }}>
                        <FiMessageSquare size={13} />
                        <div>{topic.replies?.length || 0}</div>
                      </div>

                      <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-light)' }}>
                        <FiEye size={13} />
                        <div>{topic.views || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchTopics(pagination.page - 1)}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchTopics(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">💬 Create New Topic</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)} style={{ padding: '0.35rem' }}>
                <FiX size={18} />
              </button>
            </div>

            {createError && <div className="alert alert-error">{createError}</div>}

            <form onSubmit={handleCreateTopic}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="What's your discussion about?"
                  value={createData.title}
                  onChange={(e) => setCreateData((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Describe your topic in detail..."
                  value={createData.content}
                  onChange={(e) => setCreateData((p) => ({ ...p, content: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-control"
                    value={createData.category}
                    onChange={(e) => setCreateData((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-sep.)</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. RNA, dosimetry"
                    value={createData.tags}
                    onChange={(e) => setCreateData((p) => ({ ...p, tags: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forums;
