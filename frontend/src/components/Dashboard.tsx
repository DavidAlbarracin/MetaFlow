import React, { useState } from 'react';
import { Sparkles, CheckSquare, Clock, Flame, Plus, Calendar, Pin, Check, Users, Send, FileText, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import type { Task, Habit, HabitLog, UserProfile, FocusSession, CRMContact, Note } from '../api';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { showToast } from './ToastContainer';

interface DashboardProps {
  profile: UserProfile | null;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  refreshData: () => void;
  // Shared pomodoro states
  pomodoroMode: 'focus' | 'short' | 'long';
  pomodoroTimeLeft: number;
  pomodoroIsRunning: boolean;
  pomodoroTaskId: string;
  setPomodoroTaskId: (id: string) => void;
  pomodoroSound: boolean;
  setPomodoroSound: (enabled: boolean) => void;
  switchPomodoroMode: (mode: 'focus' | 'short' | 'long') => void;
  handleStartPause: () => void;
  handleReset: () => void;
  contacts: CRMContact[];
  notes: Note[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  tasks,
  habits,
  habitLogs,
  focusSessions,
  refreshData,
  pomodoroMode,
  pomodoroTimeLeft,
  pomodoroIsRunning,
  pomodoroTaskId,
  setPomodoroTaskId,
  pomodoroSound,
  setPomodoroSound,
  switchPomodoroMode,
  handleStartPause,
  handleReset,
  contacts,
  notes
}) => {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper: get today's date in local YYYY-MM-DD
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayDateStr();

  const pinnedTaskIds = tasks.filter(t => t.is_pinned === 1).map(t => t.id);

  // Toggle task pin state (max 3)
  const handleTogglePin = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const currentlyPinnedCount = tasks.filter(t => t.is_pinned === 1).length;

    if (task.is_pinned === 1) {
      // Unpin
      try {
        await api.updateTask(id, { ...task, is_pinned: 0 });
        refreshData();
      } catch (err) {
        showToast('Error al desfijar la tarea', 'error');
      }
    } else {
      // Pin
      if (currentlyPinnedCount >= 3) {
        showToast('Solo puedes fijar un máximo de 3 tareas prioritarias.', 'error');
        return;
      }
      try {
        await api.updateTask(id, { ...task, is_pinned: 1 });
        refreshData();
      } catch (err) {
        showToast('Error al fijar la tarea', 'error');
      }
    }
  };

  // Complete a task
  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await api.updateTask(task.id, { ...task, status: nextStatus });
    if (nextStatus === 'done') {
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { y: 0.8 }
      });
    }
    refreshData();
  };

  // Habit completion toggle
  const handleToggleHabit = async (habitId: string) => {
    try {
      const result = await api.toggleHabit(habitId, todayStr);
      if (result.toggled) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#10b981', '#a855f7']
        });
      }
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick add task for today
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    setLoading(true);
    try {
      const currentlyPinnedCount = tasks.filter(t => t.is_pinned === 1).length;
      const shouldPin = currentlyPinnedCount < 3;

      await api.createTask({
        title: quickTaskTitle,
        due_date: todayStr,
        priority: 'medium',
        status: 'todo',
        is_pinned: shouldPin ? 1 : 0
      });
      setQuickTaskTitle('');
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // STATS CALCULATIONS
  // 1. Focus Time Today
  const focusTodayMinutes = focusSessions
    .filter(s => s.completed_at.startsWith(todayStr))
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  // 2. Tasks finished this month
  const thisMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
  const completedTasksThisMonth = tasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at.startsWith(thisMonthPrefix)).length;
  const totalTasksThisMonth = tasks.filter(t => t.created_at.startsWith(thisMonthPrefix)).length;
  const taskCompletionRate = totalTasksThisMonth > 0 ? Math.round((completedTasksThisMonth / totalTasksThisMonth) * 100) : 0;

  // 3. Habit consistency today
  const habitsTodayCount = habits.length;
  const completedHabitsTodayCount = habits.filter(h => 
    habitLogs.some(log => log.habit_id === h.id && log.completed_date === todayStr)
  ).length;
  const habitConsistencyRate = habitsTodayCount > 0 ? Math.round((completedHabitsTodayCount / habitsTodayCount) * 100) : 0;

  // Get uncompleted tasks to let user choose for Pin
  const uncompletedTasks = tasks.filter(t => t.status !== 'done');
  
  // Resolve Pinned Tasks data
  const pinnedTasks = tasks.filter(t => pinnedTaskIds.includes(t.id));

  // Welcoming greeting
  const getGreeting = () => {
    const hrs = new Date().getHours();
    let timeGreeting = '¡Buenas noches!';
    if (hrs < 12) timeGreeting = '¡Buenos días!';
    else if (hrs < 18) timeGreeting = '¡Buenas tardes!';

    let progressComment = 'Es un buen momento para definir tu enfoque.';
    if (completedHabitsTodayCount > 0 || pinnedTasks.filter(t => t.status === 'done').length > 0) {
      progressComment = '¡Buen avance el de hoy! Sigue así.';
    }

    return { timeGreeting, progressComment };
  };

  const { timeGreeting, progressComment } = getGreeting();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. WELCOME CARD */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, var(--panel-bg) 0%, rgba(255,255,255,0.01) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: '26px', fontWeight: 700 }}>
              {timeGreeting}, {profile ? profile.username : 'Usuario'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {profile ? profile.bio : 'Bienvenido a tu panel de enfoque diario.'}
          </p>
          <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
            {progressComment}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            <Calendar size={14} /> Fecha
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        
        {/* Stat 1: Focus Hours */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Enfoque Hoy
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              {focusTodayMinutes} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>minutos</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
              Sesiones de temporizador completadas
            </span>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={22} />
          </div>
        </div>

        {/* Stat 2: Tasks rate */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tareas del Mes
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              {completedTasksThisMonth} / {totalTasksThisMonth}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
              Tasa de finalización: {taskCompletionRate}%
            </span>
          </div>
          
          {/* Circular SVG Ring */}
          <div style={{ position: 'relative', width: '50px', height: '50px' }}>
            <svg width="50" height="50" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeDasharray={`${taskCompletionRate}, 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
              <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        {/* Stat 3: Habits completed today */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Hábitos de Hoy
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              {completedHabitsTodayCount} / {habitsTodayCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
              Consistencia: {habitConsistencyRate}%
            </span>
          </div>

          <div style={{ position: 'relative', width: '50px', height: '50px' }}>
            <svg width="50" height="50" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeDasharray={`${habitConsistencyRate}, 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
              <Flame size={14} style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px' }}>
        
        {/* 3. FOCUS OF THE DAY: TOP 3 TASKS WIDGET */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pin size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Mi Enfoque del Día (Max 3)</h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '12px' }}>
              {pinnedTasks.length} / 3 fijadas
            </span>
          </div>

          {/* Quick task adder for today */}
          <form onSubmit={handleQuickAddSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="¿Qué vas a lograr hoy? Escribe y presiona Enter..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '10px 16px' }}>
              <Plus size={16} /> Agregar
            </button>
          </form>

          {/* Pinned Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
            {pinnedTasks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dark)', border: '1px dashed var(--panel-border)', borderRadius: 'var(--radius-md)' }}>
                No has fijado tareas para hoy. Selecciona tareas pendientes abajo para fijarlas.
              </div>
            ) : (
              pinnedTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="glass-card" 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderColor: 'rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                      onClick={() => handleToggleTaskStatus(task)}
                    >
                      ✓
                    </div>
                    <div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)'
                      }}>
                        {task.title}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        <span className={`priority-tag priority-${task.priority}`}>
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        {task.pomodoros_completed > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ⏱️ {task.pomodoros_completed} pomodoros
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleTogglePin(task.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                    title="Desfijar de hoy"
                  >
                    <Pin size={16} fill="var(--primary)" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Drawer to Pin other uncompleted tasks */}
          {uncompletedTasks.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Fijar Tareas Pendientes:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {uncompletedTasks
                  .filter(t => !pinnedTaskIds.includes(t.id))
                  .map((task) => (
                    <div 
                      key={task.id} 
                      onClick={() => handleTogglePin(task.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--panel-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    >
                      <span>{task.title}</span>
                      <Pin size={12} style={{ color: 'var(--text-dark)' }} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* MINI POMODORO WIDGET */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px', width: '100%' }}>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Pomodoro</h2>
          </div>

          {/* Time face */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0' }}>
            <span style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
              {(() => {
                const mins = Math.floor(pomodoroTimeLeft / 60);
                const secs = pomodoroTimeLeft % 60;
                return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
              })()}
            </span>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>
              {pomodoroMode === 'focus' ? 'Enfoque' : 'Descanso'}
            </span>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
            {(['focus', 'short', 'long'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchPomodoroMode(m)}
                style={{
                  flex: 1,
                  padding: '5px 2px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '9px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: pomodoroMode === m ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                  color: pomodoroMode === m ? 'var(--on-primary, #ffffff)' : 'var(--text-muted)'
                }}
              >
                {m === 'focus' ? 'Enfoque' : m === 'short' ? 'Corto' : 'Largo'}
              </button>
            ))}
          </div>

          {/* Controls toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
            <button 
              onClick={handleReset} 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--panel-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Reiniciar"
            >
              <RotateCcw size={14} />
            </button>

            <button 
              onClick={handleStartPause} 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--primary)',
                color: 'var(--on-primary, #ffffff)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              {pomodoroIsRunning ? <Pause size={18} fill="var(--on-primary, #ffffff)" /> : <Play size={18} fill="var(--on-primary, #ffffff)" style={{ marginLeft: '2px' }} />}
            </button>

            <button 
              onClick={() => setPomodoroSound(!pomodoroSound)} 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--panel-border)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: pomodoroSound ? 'var(--accent)' : 'var(--text-dark)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={pomodoroSound ? 'Silenciar' : 'Activar'}
            >
              {pomodoroSound ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>

          {/* Task Link Selector */}
          {pomodoroMode === 'focus' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--panel-border)', paddingTop: '12px', marginTop: '6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Vincular Tarea
              </label>
              <select
                value={pomodoroTaskId}
                onChange={(e) => setPomodoroTaskId(e.target.value)}
                disabled={pomodoroIsRunning}
                style={{ width: '100%', fontSize: '11px', padding: '5px 8px' }}
              >
                <option value="">-- Ninguna --</option>
                {tasks.filter(t => t.status !== 'done').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 4. TODAY'S HABITS WIDGET */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
            <Flame size={18} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Hábitos de Hoy</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {habits.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
                No tienes hábitos creados. Ve a la pestaña de hábitos para agregar uno.
              </div>
            ) : (
              habits.map((habit) => {
                const isCompleted = habitLogs.some(log => log.habit_id === habit.id && log.completed_date === todayStr);
                return (
                  <div 
                    key={habit.id} 
                    className="glass-card" 
                    onClick={() => handleToggleHabit(habit.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      borderColor: isCompleted ? 'rgba(245, 158, 11, 0.2)' : 'var(--panel-border)',
                      background: isCompleted ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: isCompleted ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                      background: isCompleted ? '#f59e0b' : 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0
                    }}>
                      {isCompleted && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      color: isCompleted ? 'var(--text-dark)' : 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {habit.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 5. SECOND ROW: CRM KEEP IN TOUCH & RECENT NOTES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginTop: '10px' }}>
        
        {/* CRM Recordatorios Widget */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>CRM Personal: Recordatorios de Conexión</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {(() => {
              // Helper: compute days since last interaction
              const getDaysSinceLastInteraction = (contact: CRMContact) => {
                if (!contact.last_interaction_date) return null;
                const lastDate = new Date(contact.last_interaction_date);
                const today = new Date();
                lastDate.setHours(0,0,0,0);
                today.setHours(0,0,0,0);
                const diffTime = today.getTime() - lastDate.getTime();
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
              };

              const contactsToReconnect = contacts.filter((c) => {
                const days = getDaysSinceLastInteraction(c);
                if (days === null) return true;
                return days >= c.keep_in_touch_interval;
              });

              if (contactsToReconnect.length === 0) {
                return (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
                    <CheckCircle size={20} style={{ color: '#34d399', marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                    ¡Al día con tus contactos comerciales!
                  </div>
                );
              }

              return contactsToReconnect.slice(0, 3).map((c) => {
                const days = getDaysSinceLastInteraction(c);
                return (
                  <div key={c.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 'bold' }}>
                        {days === null ? '⚠️ Sin registrar contacto' : `⚠️ Sin hablar hace ${days} días`}
                      </span>
                    </div>
                    {c.email && (
                      <a 
                        href={`mailto:${c.email}?subject=MetaFlow - Saludos&body=Hola ${c.name}, espero que todo vaya bien.`}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Send size={11} /> Correo
                      </a>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Recent Notes Widget */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Notas Recientes</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {notes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
                No tienes notas creadas.
              </div>
            ) : (
              notes.slice(0, 3).map((note) => (
                <div key={note.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', width: '80%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{note.title || 'Sin título'}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Categoría: {note.category}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>
                    {new Date(note.updated_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Dashboard;
