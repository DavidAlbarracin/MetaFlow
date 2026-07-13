import React, { useRef, useState } from 'react';
import { Sliders, User, Sparkles, Image, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { UserProfile } from '../api';
import { showToast } from './ToastContainer';
import { showConfirm } from './ConfirmDialog';

interface SettingsSpaceProps {
  profile: UserProfile | null;
  onProfileUpdate: (updated: UserProfile) => void;
}

export const SettingsSpace: React.FC<SettingsSpaceProps> = ({ profile, onProfileUpdate }) => {
  const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const updated = await api.uploadAvatar(e.target.files[0]);
        onProfileUpdate(updated);
      } catch (err) {
        console.error(err);
        showToast('Error al subir la foto de perfil', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAvatarDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    const confirmed = await showConfirm(
      '¿Eliminar foto de perfil?',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?'
    );
    if (confirmed) {
      setLoading(true);
      try {
        const updated = await api.deleteAvatar();
        onProfileUpdate(updated);
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar la foto', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!profile) {
    return <div className="glass-panel">Cargando perfil...</div>;
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.updateProfile({ username, bio });
      onProfileUpdate(updated);
      showToast('Perfil actualizado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (palette: UserProfile['theme_palette']) => {
    try {
      const updated = await api.updateProfile({ theme_palette: palette });
      onProfileUpdate(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const updated = await api.uploadBackground(e.target.files[0]);
        onProfileUpdate(updated);
      } catch (err) {
        console.error(err);
        showToast('Error al subir el fondo de pantalla', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackgroundDelete = async () => {
    const confirmed = await showConfirm(
      '¿Eliminar fondo personalizado?',
      '¿Estás seguro de que quieres eliminar el fondo personalizado?'
    );
    if (confirmed) {
      setLoading(true);
      try {
        const updated = await api.deleteBackground();
        onProfileUpdate(updated);
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar el fondo', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSliderChange = async (field: 'bg_opacity' | 'bg_blur', value: number) => {
    // Update locally instantly (handled in parent via onProfileUpdate)
    const updatedLocal = { ...profile, [field]: value };
    onProfileUpdate(updatedLocal);
  };

  const handleSliderSave = async (field: 'bg_opacity' | 'bg_blur', value: number) => {
    try {
      await api.updateProfile({ [field]: value });
    } catch (err) {
      console.error('Error saving setting:', err);
    }
  };

  const themes = [
    { id: 'sapphire', name: 'Zafiro', color: '#3b82f6', desc: 'Azul enfoque profesional' },
    { id: 'emerald', name: 'Esmeralda', color: '#10b981', desc: 'Verde calmado natural' },
    { id: 'amethyst', name: 'Amatista', color: '#a855f7', desc: 'Morado creativo profundo' },
    { id: 'ruby', name: 'Rubí', color: '#ef4444', desc: 'Rojo enérgico activo' },
    { id: 'obsidian', name: 'Obsidiana', color: '#9ca3af', desc: 'Monocromo minimalista elegante' },
  ];

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
      
      {/* 1. EDIT PROFILE INFO */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={22} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Mi Perfil</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Configura tus datos para personalizar los títulos y mensajes en MetaFlow.
        </p>

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Foto de Perfil Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <input 
              type="file" 
              ref={avatarInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div 
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--panel-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {profile.avatar_path ? (
                <img 
                  src={`${apiHost}${profile.avatar_path}`} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <User size={24} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                Subir Foto
              </button>
              {profile.avatar_path && (
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                  onClick={handleAvatarDelete}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Nombre de Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. David"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Biografía corta</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ej. Enfocado en completar mis proyectos personales"
              rows={4}
              maxLength={200}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* 2. THEMES & COLOR SCHEMES */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Paleta de Colores</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Elige el color principal de la aplicación. Esto cambiará los acentos, botones y degradados de fondo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {themes.map((t) => {
            const isSelected = profile.theme_palette === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id as UserProfile['theme_palette'])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  padding: '12px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: t.color,
                  boxShadow: isSelected ? `0 0 10px ${t.color}` : 'none',
                  flexShrink: 0
                }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{t.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. WALLPAPER BACKGROUND & CUSTOMIZATION */}
      <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image size={22} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Fondo de Pantalla Personalizado</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Sube tu propia imagen de fondo. Los paneles se adaptarán automáticamente con un elegante efecto de vidrio esmerilado.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
          {/* File Upload Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleBackgroundUpload} 
              accept="image/*" 
              style={{ display: 'none' }}
            />
            
            {profile.bg_image_path ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  height: '140px',
                  borderRadius: 'var(--radius-md)',
                  backgroundImage: `url(${apiHost}${profile.bg_image_path})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid var(--panel-border)'
                }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    disabled={loading}
                  >
                    Cambiar Imagen
                  </button>
                  <button 
                    onClick={handleBackgroundDelete} 
                    className="btn-secondary" 
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '8px 12px' }}
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: '140px',
                  border: '2px dashed var(--panel-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  gap: '8px',
                  transition: 'var(--transition-smooth)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--panel-border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <Image size={28} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Haz clic para subir una imagen</span>
              </div>
            )}
          </div>

          {/* Opacity and Blur sliders */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Ajustes Visuales</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span>Opacidad de la imagen</span>
                <span>{Math.round(profile.bg_opacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="0.8" 
                step="0.05" 
                value={profile.bg_opacity}
                onChange={(e) => handleSliderChange('bg_opacity', parseFloat(e.target.value))}
                onMouseUp={(e) => handleSliderSave('bg_opacity', parseFloat((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderSave('bg_opacity', parseFloat((e.target as HTMLInputElement).value))}
                style={{ width: '100%', cursor: 'pointer' }}
                disabled={!profile.bg_image_path}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span>Efecto Desenfoque (Blur)</span>
                <span>{profile.bg_blur}px</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                step="1" 
                value={profile.bg_blur}
                onChange={(e) => handleSliderChange('bg_blur', parseInt(e.target.value))}
                onMouseUp={(e) => handleSliderSave('bg_blur', parseInt((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderSave('bg_blur', parseInt((e.target as HTMLInputElement).value))}
                style={{ width: '100%', cursor: 'pointer' }}
                disabled={!profile.bg_image_path}
              />
            </div>
            
            {!profile.bg_image_path && (
              <p style={{ fontSize: '11px', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                * Sube una imagen primero para activar los controles visuales.
              </p>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};
export default SettingsSpace;
