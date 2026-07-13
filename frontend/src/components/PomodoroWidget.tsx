import React from 'react';
import { Clock, Play, Pause, RotateCcw, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import type { Task } from '../api';

interface PomodoroWidgetProps {
  tasks: Task[];
  // Shared state
  mode: 'focus' | 'short' | 'long';
  timeLeft: number;
  isRunning: boolean;
  selectedTaskId: string;
  setSelectedTaskId: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  switchMode: (mode: 'focus' | 'short' | 'long') => void;
  handleStartPause: () => void;
  handleReset: () => void;
}

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({
  tasks,
  mode,
  timeLeft,
  isRunning,
  selectedTaskId,
  setSelectedTaskId,
  soundEnabled,
  setSoundEnabled,
  switchMode,
  handleStartPause,
  handleReset
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Filter tasks to show only pending ones in the dropdown
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 90,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '12px'
    }}>
      
      {/* 1. EXPANDED TIMER PANEL */}
      {isOpen && (
        <div className="glass-panel fade-in" style={{
          width: '300px',
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          
          {/* Mode Switcher Buttons */}
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            {(['focus', 'short', 'long'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: mode === m ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {m === 'focus' ? 'Enfoque' : m === 'short' ? 'Corto' : 'Largo'}
              </button>
            ))}
          </div>

          {/* Big Clock face */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px', color: 'var(--text-main)' }}>
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px' }}>
              {mode === 'focus' ? 'Enfocando' : 'Descansando'}
            </span>
          </div>

          {/* Task Locking Selector (only relevant in focus mode) */}
          {mode === 'focus' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Vincular a Tarea (Opcional)
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                disabled={isRunning}
              >
                <option value="">-- Ninguna --</option>
                {pendingTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Reset */}
            <button 
              onClick={handleReset} 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--panel-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-smooth)'
              }}
              title="Reiniciar"
            >
              <RotateCcw size={16} />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={handleStartPause} 
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                transition: 'var(--transition-bounce)'
              }}
            >
              {isRunning ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" style={{ marginLeft: '4px' }} />}
            </button>

            {/* Audio volume toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid var(--panel-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: soundEnabled ? 'var(--accent)' : 'var(--text-dark)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-smooth)'
              }}
              title={soundEnabled ? 'Silenciar alarma' : 'Activar alarma'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* 2. FLOATING TRIGGERS BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={isRunning ? 'pomodoro-pulse' : ''}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '1px solid var(--panel-border)',
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(10px)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-premium)',
          transition: 'var(--transition-bounce)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Clock size={20} style={{ color: isRunning ? 'var(--primary)' : 'inherit' }} />
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          {isOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
        </div>
      </button>

    </div>
  );
};
export default PomodoroWidget;
