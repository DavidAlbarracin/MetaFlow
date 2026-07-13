import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Award } from 'lucide-react';
import type { Task, FocusSession } from '../api';

interface PomodoroSpaceProps {
  tasks: Task[];
  focusSessions: FocusSession[];
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

export const PomodoroSpace: React.FC<PomodoroSpaceProps> = ({
  tasks,
  focusSessions,
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
  const [activeSound, setActiveSound] = useState<'none' | 'white' | 'rain' | 'ocean'>('none');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPercentage = () => {
    const durations = { focus: 25, short: 5, long: 15 };
    const total = durations[mode] * 60;
    return ((total - timeLeft) / total) * 100;
  };

  // Sound synthesis using Web Audio API
  const startSound = (type: 'white' | 'rain' | 'ocean') => {
    stopSound();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain' || type === 'ocean') {
          // Pink/Brown noise approximation
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; 
        } else {
          // White noise
          output[i] = white * 0.5;
        }
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (type === 'rain') {
        filter.frequency.setValueAtTime(600, ctx.currentTime);
      } else if (type === 'ocean') {
        filter.frequency.setValueAtTime(400, ctx.currentTime);
      } else {
        filter.frequency.setValueAtTime(20000, ctx.currentTime);
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'ocean') {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.frequency.value = 0.08; 
        oscGain.gain.value = 0.07; 
        
        gainNode.gain.setValueAtTime(0.07, ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(gainNode.gain);
        
        osc.start();
        (noiseNode as any).osc = osc;
      }

      noiseNode.start();
      soundNodeRef.current = noiseNode;
      setActiveSound(type);
    } catch (e) {
      console.error('AudioContext synthesis failed:', e);
    }
  };

  const stopSound = () => {
    if (soundNodeRef.current) {
      try {
        soundNodeRef.current.stop();
        if ((soundNodeRef.current as any).osc) {
          (soundNodeRef.current as any).osc.stop();
        }
      } catch {}
      soundNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setActiveSound('none');
  };

  // Clean up sounds on unmount
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  // Filter tasks to show only pending ones in the dropdown
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  // Stats
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
      
      {/* 1. TIMER & AUDIO PLAYER PANEL */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '30px' }}>
        
        {/* Head Title */}
        <div style={{ alignSelf: 'flex-start' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Espacio de Enfoque Inmersivo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Desconéctate del ruido. Usa los sonidos sintetizados para entrar en estado de flujo.
          </p>
        </div>

        {/* Big Circular Progress & Clock Face */}
        <div style={{
          position: 'relative',
          width: '240px',
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '10px'
        }}>
          {/* Progress Ring */}
          <svg width="240" height="240" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="transparent"
              stroke="var(--panel-border)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="transparent"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - getPercentage() / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          
          {/* Timer text */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <span style={{ fontSize: '42px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px', marginTop: '4px' }}>
              {mode === 'focus' ? 'Enfocando' : 'Descanso'}
            </span>
          </div>
        </div>

        {/* Mode Select Buttons */}
        <div style={{ display: 'flex', gap: '8px', maxWidth: '360px', width: '100%', marginTop: '8px' }}>
          {(['focus', 'short', 'long'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={mode === m ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center', textTransform: 'uppercase' }}
            >
              {m === 'focus' ? 'Enfoque' : m === 'short' ? 'Corto' : 'Largo'}
            </button>
          ))}
        </div>

        {/* Control Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '6px' }}>
          <button 
            onClick={handleReset} 
            className="btn-secondary"
            style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            title="Reiniciar"
          >
            <RotateCcw size={18} />
          </button>

          <button 
            onClick={handleStartPause} 
            className="btn-primary"
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              padding: 0, 
              justifyContent: 'center', 
              boxShadow: 'var(--shadow-glow)' 
            }}
          >
            {isRunning ? <Pause size={24} fill="var(--on-primary, #ffffff)" /> : <Play size={24} fill="var(--on-primary, #ffffff)" style={{ marginLeft: '4px' }} />}
          </button>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="btn-secondary"
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              padding: 0, 
              justifyContent: 'center', 
              color: soundEnabled ? 'var(--accent)' : 'var(--text-dark)' 
            }}
            title={soundEnabled ? 'Silenciar alarma' : 'Activar alarma'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Task lock */}
        {mode === 'focus' && (
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px', marginTop: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Vincular a Tarea Activa
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={isRunning}
              style={{ fontSize: '13px' }}
            >
              <option value="">-- Ninguna --</option>
              {pendingTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* 2. AUDIO SYNTHESIS & HISTORY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Procedural Audio tracks */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Sonidos Ambientales Inteligentes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Generados en tiempo real por tu navegador para inducir concentración y bloquear distracciones.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'rain', name: 'Lluvia Relajante', desc: 'Frecuencias bajas simulando tormenta' },
              { id: 'ocean', name: 'Olas de Mar', desc: 'Ciclos de volumen y ruido rosa' },
              { id: 'white', name: 'Ruido Blanco Puro', desc: 'Oscilador plano estático constante' }
            ].map((sound) => {
              const isActive = activeSound === sound.id;
              return (
                <div 
                  key={sound.id} 
                  className="glass-card" 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px',
                    borderColor: isActive ? 'var(--primary)' : 'var(--panel-border)',
                    background: isActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{sound.name}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sound.desc}</p>
                  </div>
                  <button
                    onClick={() => isActive ? stopSound() : startSound(sound.id as any)}
                    className={isActive ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                  >
                    {isActive ? 'Silenciar' : 'Reproducir'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed focus list */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: 'var(--accent)' }} /> Historial y Estadísticas
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
              Total: {totalFocusMinutes} min
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {focusSessions.length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
                Aún no has completado ninguna sesión de enfoque hoy.
              </p>
            ) : (
              focusSessions.map((session) => {
                const linkedTask = tasks.find(t => t.id === session.task_id);
                return (
                  <div key={session.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {linkedTask ? linkedTask.title : 'Sesión de enfoque libre'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>
                        {new Date(session.completed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      +{session.duration_minutes}m
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default PomodoroSpace;
