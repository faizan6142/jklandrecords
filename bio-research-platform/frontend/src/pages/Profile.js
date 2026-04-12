import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ bio: '', expertise: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser && currentUser._id === id;

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const [userRes, papersRes] = await Promise.all([
        axios.get(`${API_URL}/users/${id}`),
        axios.get(`${API_URL}/research`, { params: { uploadedBy: id, limit: 50 } }),
      ]);

      if (userRes.data.success) {
        setProfile(userRes.data.data.user);
      }
      if (papersRes.data.success) {
        // Filter client-side since backend may not support uploadedBy param
        const allPapers = papersRes.data.data.papers || [];
        const userPapers = allPapers.filter(
          (p) => p.uploadedBy?._id === id || p.uploadedBy === id
        );
        setPapers(userPapers);
      }
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFollow = async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/${id}/follow`);
      if (res.data.success) {
        const followed = res.data.data.followed;
        setProfile((prev) => {
          if (!prev) return prev;
          const followers = followed
            ? [...(prev.followers || []), currentUser._id]
            : (prev.followers || []).filter((f) => f !== currentUser._id);
          return { ...prev, followers };
        });
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const startEdit = () => {
    setEditData({
      bio: profile?.bio || '',
      expertise: (profile?.expertise || []).join(', '),
    });
    setEditing(true);
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      const expertiseArray = editData.expertise
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await axios.put(`${API_URL}/users/${id}`, {
        bio: editData.bio,
        expertise: expertiseArray,
      });

      if (res.data.success) {
        setProfile((prev) => ({ ...prev, ...res.data.data.user }));
        updateUser({ bio: editData.bio, expertise: expertiseArray });
        setEditing(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div> Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error">{error || 'Profile not found.'}</div>
        </div>
      </div>
    );
  }

  const isFollowing =
    currentUser &&
    profile.followers?.some(
      (f) => f === currentUser._id || f?._id === currentUser._id
    );

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Profile card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div
              className="avatar-initials avatar-xl"
              style={{ flexShrink: 0, fontSize: '2rem' }}
            >
              {getInitials(profile.username)}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              {/* Username + edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{profile.username}</h1>
                {isOwnProfile && !editing && (
                  <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                    <FiEdit2 size={14} /> Edit Profile
                  </button>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                {profile.email}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
                Member since {formatDate(profile.createdAt)}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                {[
                  { label: 'Followers', value: profile.followers?.length || 0 },
                  { label: 'Following', value: profile.following?.length || 0 },
                  { label: 'Papers', value: papers.length },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Follow button */}
              {!isOwnProfile && currentUser && (
                <button
                  className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                  style={{ marginTop: '1rem' }}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : isFollowing ? 'Unfollow' : '+ Follow'}
                </button>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Bio + Expertise */}
          {editing ? (
            <div>
              {editError && <div className="alert alert-error">{editError}</div>}
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={editData.bio}
                  onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell people about yourself..."
                />
              </div>
              <div className="form-group">
                <label>Expertise <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={editData.expertise}
                  onChange={(e) => setEditData((p) => ({ ...p, expertise: e.target.value }))}
                  placeholder="e.g. Cell Biology, Radiation Physics"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={editLoading}>
                  <FiCheck size={14} /> {editLoading ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                  <FiX size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  BIO
                </h3>
                <p style={{ color: profile.bio ? 'var(--text-primary)' : 'var(--text-light)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {profile.bio || 'No bio provided.'}
                </p>
              </div>
              {profile.expertise?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    EXPERTISE
                  </h3>
                  <div className="tags-list">
                    {profile.expertise.map((e) => (
                      <span key={e} className="tag" style={{ background: '#eff6ff', color: 'var(--primary)', borderColor: '#bfdbfe' }}>
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Research Papers */}
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
            Research Papers ({papers.length})
          </h2>

          {papers.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              <p>No research papers uploaded yet.</p>
              {isOwnProfile && (
                <Link to="/research" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                  Upload a Paper
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {papers.map((p) => (
                <div key={p._id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <span
                        className={`badge ${
                          p.category === 'Biology' ? 'badge-biology' :
                          p.category === 'Medical Physics' ? 'badge-medical-physics' :
                          p.category === 'Biophysics' ? 'badge-biophysics' : 'badge-other'
                        }`}
                        style={{ marginBottom: '0.5rem', display: 'inline-block' }}
                      >
                        {p.category}
                      </span>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>{p.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        {p.authors.join(', ')}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {p.abstract.length > 200 ? p.abstract.slice(0, 200) + '...' : p.abstract}
                      </p>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <div>{formatDate(p.createdAt)}</div>
                      <div style={{ marginTop: '0.2rem' }}>❤️ {p.likes?.length || 0}</div>
                      <div style={{ marginTop: '0.2rem' }}>⬇️ {p.downloads || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
