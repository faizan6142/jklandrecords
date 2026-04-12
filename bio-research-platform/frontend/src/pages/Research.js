import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiSearch, FiUpload, FiHeart, FiDownload, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORIES = ['All', 'Biology', 'Medical Physics', 'Biophysics', 'Other'];

const categoryBadgeClass = (cat) => {
  const map = {
    Biology: 'badge-biology',
    'Medical Physics': 'badge-medical-physics',
    Biophysics: 'badge-biophysics',
    Other: 'badge-other',
  };
  return `badge ${map[cat] || 'badge-general'}`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const Research = () => {
  const { user } = useAuth();

  const [papers, setPapers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    abstract: '',
    authors: '',
    category: 'Biology',
    tags: '',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchPapers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 9 };
        if (search.trim()) params.search = search.trim();
        if (category !== 'All') params.category = category;

        const res = await axios.get(`${API_URL}/research`, { params });
        if (res.data.success) {
          setPapers(res.data.data.papers);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        setError('Failed to load research papers.');
      } finally {
        setLoading(false);
      }
    },
    [search, category]
  );

  useEffect(() => {
    fetchPapers(1);
  }, [fetchPapers]);

  const handleLike = async (paperId) => {
    try {
      const res = await axios.post(`${API_URL}/research/${paperId}/like`);
      if (res.data.success) {
        const liked = res.data.data.liked;
        setPapers((prev) =>
          prev.map((p) => {
            if (p._id !== paperId) return p;
            const newLikes = liked
              ? [...p.likes, user._id]
              : p.likes.filter((id) => id !== user._id);
            return { ...p, likes: newLikes };
          })
        );
      }
    } catch {
      // Silently fail
    }
  };

  const handleDownload = async (paper) => {
    if (!paper.fileUrl) return;
    try {
      await axios.post(`${API_URL}/research/${paper._id}/download`);
      setPapers((prev) =>
        prev.map((p) => (p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p))
      );
      const link = document.createElement('a');
      link.href = `${SOCKET_URL_BASE}${paper.fileUrl}`;
      link.download = paper.fileName || 'paper';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch {
      // Try opening directly
      window.open(`${SOCKET_URL_BASE}${paper.fileUrl}`, '_blank');
    }
  };

  const handleUploadChange = (e) => {
    const { name, value } = e.target;
    setUploadData((prev) => ({ ...prev, [name]: value }));
    setUploadError('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const { title, abstract, authors, category: cat } = uploadData;
    if (!title || !abstract || !authors || !cat) {
      setUploadError('Title, abstract, authors, and category are required.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('abstract', uploadData.abstract);
      formData.append('authors', uploadData.authors);
      formData.append('category', uploadData.category);
      formData.append('tags', uploadData.tags);
      if (uploadFile) formData.append('file', uploadFile);

      const res = await axios.post(`${API_URL}/research`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setShowUploadModal(false);
        setUploadData({ title: '', abstract: '', authors: '', category: 'Biology', tags: '' });
        setUploadFile(null);
        fetchPapers(1);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Research Database</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {pagination.total} paper{pagination.total !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <FiUpload size={15} /> Upload Paper
          </button>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ maxWidth: 400 }}>
            <FiSearch className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search papers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 170 }}
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

        {/* Papers Grid */}
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div> Loading papers...
          </div>
        ) : papers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📚</div>
            <p>No research papers found. Be the first to upload one!</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {papers.map((paper) => {
              const hasLiked = paper.likes?.includes(user._id);
              const truncated =
                paper.abstract.length > 160
                  ? paper.abstract.slice(0, 160) + '...'
                  : paper.abstract;

              return (
                <div
                  key={paper._id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1.25rem',
                  }}
                >
                  {/* Category badge */}
                  <span className={categoryBadgeClass(paper.category)}>{paper.category}</span>

                  {/* Title */}
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35 }}>
                    {paper.title}
                  </h3>

                  {/* Authors */}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {paper.authors.join(', ')}
                  </p>

                  {/* Abstract */}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                    {truncated}
                  </p>

                  {/* Tags */}
                  {paper.tags?.length > 0 && (
                    <div className="tags-list">
                      {paper.tags.slice(0, 3).map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  )}

                  <hr className="divider" />

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar-initials avatar-sm">
                        {(paper.uploadedBy?.username || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to={`/profile/${paper.uploadedBy?._id}`}
                          style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}
                        >
                          {paper.uploadedBy?.username}
                        </Link>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                          {formatDate(paper.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleLike(paper._id)}
                        style={{
                          color: hasLiked ? '#ef4444' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                        title={hasLiked ? 'Unlike' : 'Like'}
                      >
                        <FiHeart size={14} fill={hasLiked ? '#ef4444' : 'none'} />
                        <span style={{ fontSize: '0.78rem' }}>{paper.likes?.length || 0}</span>
                      </button>

                      {paper.fileUrl && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDownload(paper)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Download"
                        >
                          <FiDownload size={14} />
                          <span style={{ fontSize: '0.78rem' }}>{paper.downloads || 0}</span>
                        </button>
                      )}
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
              onClick={() => fetchPapers(pagination.page - 1)}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchPapers(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">📄 Upload Research Paper</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowUploadModal(false)}
                style={{ padding: '0.35rem' }}
              >
                <FiX size={18} />
              </button>
            </div>

            {uploadError && <div className="alert alert-error">{uploadError}</div>}

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  placeholder="Research paper title"
                  value={uploadData.title}
                  onChange={handleUploadChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Abstract *</label>
                <textarea
                  name="abstract"
                  className="form-control"
                  placeholder="Brief summary of the paper..."
                  value={uploadData.abstract}
                  onChange={handleUploadChange}
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Authors * <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span></label>
                <input
                  type="text"
                  name="authors"
                  className="form-control"
                  placeholder="e.g. John Smith, Jane Doe"
                  value={uploadData.authors}
                  onChange={handleUploadChange}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    className="form-control"
                    value={uploadData.category}
                    onChange={handleUploadChange}
                    required
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span></label>
                  <input
                    type="text"
                    name="tags"
                    className="form-control"
                    placeholder="e.g. DNA, MRI, cancer"
                    value={uploadData.tags}
                    onChange={handleUploadChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>File <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(PDF, DOC, DOCX, TXT — max 10MB)</span></label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ padding: '0.4rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
                  {uploadLoading ? 'Uploading...' : 'Upload Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper used in download handler
const SOCKET_URL_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default Research;
