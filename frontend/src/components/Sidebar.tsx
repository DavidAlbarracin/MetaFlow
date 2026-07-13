import React from 'react';
import { LayoutDashboard, Target, Calendar, Flame, Settings, Clock, BookOpen, Users } from 'lucide-react';
import type { UserProfile } from '../api';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, profile }) => {
  const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'goals', label: 'Metas y Proyectos', icon: Target },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'habits', label: 'Hábitos', icon: Flame },
    { id: 'pomodoro', label: 'Enfoque Pomodoro', icon: Clock },
    { id: 'notes', label: 'Notas y Wiki', icon: BookOpen },
    { id: 'crm', label: 'CRM Personal', icon: Users },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const getProfileImageText = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <aside className="app-sidebar">
      {/* App Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Target size={20} color="#fff" />
        </div>
        <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px' }}>
          Meta<span style={{ color: 'var(--accent)' }}>Flow</span>
        </span>
      </div>

      {/* Profile Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          color: 'var(--accent)',
          fontSize: '16px',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {profile && profile.avatar_path ? (
            <img 
              src={`${apiHost}${profile.avatar_path}`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            profile ? getProfileImageText(profile.username) : 'U'
          )}
        </div>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
            {profile ? profile.username : 'Usuario'}
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile ? profile.bio : 'Planificando metas...'}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--on-primary, #ffffff)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                transition: 'var(--transition-smooth)',
                boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={18} style={{ color: isActive ? 'var(--on-primary, #ffffff)' : 'inherit' }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Version Label */}
      <div style={{ fontSize: '11px', color: 'var(--text-dark)', textAlign: 'center', marginTop: 'auto', paddingTop: '16px' }}>
        v1.0.0 · Código Abierto
      </div>
    </aside>
  );
};
export default Sidebar;
