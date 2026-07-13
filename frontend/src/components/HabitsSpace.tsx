import React, { useState } from 'react';
import { Flame, Plus, Trash2, Calendar, Check, Award, Edit2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import type { Habit, HabitLog } from '../api';
import { showConfirm } from './ConfirmDialog';

interface HabitsSpaceProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  refreshData: () => void;
}

export const HabitsSpace: React.FC<HabitsSpaceProps> = ({ habits, habitLogs, refreshData }) => {
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(false);

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFreq, setEditFreq] = useState<'daily' | 'weekly'>('daily');

  const startEditing = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setEditTitle(habit.title);
    setEditFreq(habit.frequency);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      await api.updateHabit(id, { title: editTitle, frequency: editFreq });
      setEditingHabitId(null);
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: get today's date in local YYYY-MM-DD format
  const getLocalDateString = (dateOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString(0);

  // Handle adding habit
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    setLoading(true);
    try {
      await api.createHabit({ title: newHabitTitle, frequency: newHabitFreq });
      setNewHabitTitle('');
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting habit
  const handleDeleteHabit = async (id: string) => {
    const confirmed = await showConfirm(
      '¿Eliminar este hábito?',
      'Se borrará todo su historial.'
    );
    if (confirmed) {
      try {
        await api.deleteHabit(id);
        refreshData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Toggle habit log
  const handleToggleHabit = async (habitId: string, date: string) => {
    try {
      const result = await api.toggleHabit(habitId, date);
      if (result.toggled && date === todayStr) {
        // Trigger confetti for checking today's habit!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#10b981', '#a855f7']
        });
      }
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate streaks
  const calculateStreak = (habitId: string) => {
    const logs = habitLogs
      .filter(l => l.habit_id === habitId)
      .map(l => l.completed_date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Descending order (newest first)

    if (logs.length === 0) return { current: 0, max: 0 };

    // Unique logs set
    const logSet = new Set(logs);

    // Current Streak
    let current = 0;
    
    // Check if completed today or yesterday
    const completedToday = logSet.has(todayStr);
    const yesterdayStr = getLocalDateString(-1);
    const completedYesterday = logSet.has(yesterdayStr);

    if (completedToday || completedYesterday) {
      // Start counting from whichever date is latest
      let startOffset = completedToday ? 0 : -1;
      while (true) {
        const dStr = getLocalDateString(startOffset);
        if (logSet.has(dStr)) {
          current++;
          startOffset--;
        } else {
          break;
        }
      }
    }

    // Max Streak
    const ascLogs = [...logs].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let max = 0;
    let temp = 0;
    let prevTime: number | null = null;

    ascLogs.forEach((dateStr) => {
      const currTime = new Date(dateStr).getTime();
      if (prevTime === null) {
        temp = 1;
      } else {
        const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          temp++;
        } else if (diffDays > 1) {
          if (temp > max) max = temp;
          temp = 1;
        }
      }
      prevTime = currTime;
    });
    if (temp > max) max = temp;

    return { current, max };
  };

  // Generate last 365 days for the GitHub grid
  const generateYearDates = () => {
    const dates = [];
    // Start 364 days ago to have exactly 365 cells
    for (let i = 364; i >= 0; i--) {
      dates.push(getLocalDateString(-i));
    }
    return dates;
  };

  const yearDates = generateYearDates();

  // Get total completions per day for styling the grid
  const completionsPerDay = habitLogs.reduce((acc, log) => {
    acc[log.completed_date] = (acc[log.completed_date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate current week dates (Monday to Sunday)
  const getCurrentWeekDates = () => {
    const current = new Date();
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday, etc.
    // Shift so Monday is index 0
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + distanceToMonday + i);
      week.push({
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return week;
  };

  const currentWeek = getCurrentWeekDates();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Tracker de Hábitos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Construye consistencia. Haz seguimiento de tus hábitos diarios y mantén tus rachas activas.
          </p>
        </div>
      </div>

      {/* 1. AGGREGATED ANNUAL CONTRIBUTION GRID (GITHUB STYLE) */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <Calendar size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Consistencia Anual</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Frecuencia agregada de hábitos completados en los últimos 365 días.
        </p>

        {/* Contribution Grid Wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '6px' }}>
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 10px)',
            gridAutoFlow: 'column',
            gap: '3px',
            width: 'fit-content'
          }}>
            {yearDates.map((dateStr) => {
              const completions = completionsPerDay[dateStr] || 0;
              let level = 'rgba(255, 255, 255, 0.03)';
              let tooltip = `${dateStr}: Sin completados`;

              if (completions > 0) {
                tooltip = `${dateStr}: ${completions} hábito${completions > 1 ? 's' : ''} completado${completions > 1 ? 's' : ''}`;
                if (completions === 1) level = 'rgba(59, 130, 246, 0.35)'; // Light
                else if (completions === 2) level = 'rgba(59, 130, 246, 0.65)'; // Medium
                else level = 'var(--primary)'; // High
              }

              return (
                <div
                  key={dateStr}
                  title={tooltip}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: level,
                    border: '1px solid rgba(255,255,255,0.03)',
                    transition: 'var(--transition-smooth)'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* 2. ADD NEW HABIT FORM */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--accent)' }} /> Crear Nuevo Hábito
          </h2>
          
          <form onSubmit={handleAddHabit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Nombre del Hábito</label>
              <input
                type="text"
                placeholder="Ej. Meditar 10 minutos, Leer..."
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                maxLength={40}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Frecuencia</label>
              <select value={newHabitFreq} onChange={(e) => setNewHabitFreq(e.target.value as any)}>
                <option value="daily">Todos los días (Diario)</option>
                <option value="weekly">Una vez por semana</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? 'Creando...' : 'Agregar Hábito'}
            </button>
          </form>
        </div>

        {/* 3. HABIT LISTS WITH STREAKS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {habits.length === 0 ? (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              <Flame size={32} style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '14px' }}>No tienes hábitos registrados. Agrega uno a la izquierda para empezar.</p>
            </div>
          ) : (
            habits.map((habit) => {
              const streak = calculateStreak(habit.id);
              return (
                <div key={habit.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Title & Actions */}
                  {editingHabitId === habit.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={40}
                          style={{ flex: 1, fontSize: '14px', padding: '6px 10px' }}
                          placeholder="Nombre del hábito"
                        />
                        <select
                          value={editFreq}
                          onChange={(e) => setEditFreq(e.target.value as any)}
                          style={{ width: '130px', fontSize: '13px', padding: '6px 8px' }}
                        >
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setEditingHabitId(null)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(habit.id)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={loading}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--panel-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: streak.current > 0 ? '#f59e0b' : 'var(--text-muted)'
                        }}>
                          <Flame size={18} fill={streak.current > 0 ? '#f59e0b' : 'none'} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{habit.title}</h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-dark)', textTransform: 'uppercase' }}>
                            {habit.frequency === 'daily' ? 'Diario' : 'Semanal'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Streaks counters */}
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Racha:</span>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{streak.current}d</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--panel-border)', paddingLeft: '12px' }}>
                            <Award size={14} style={{ color: 'var(--accent)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Máxima:</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{streak.max}d</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => startEditing(habit)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Editar Hábito"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            title="Eliminar Hábito"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Week Calendar Checklist */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                    {currentWeek.map((day) => {
                      const isCompleted = habitLogs.some(l => l.habit_id === habit.id && l.completed_date === day.dateStr);
                      const isToday = day.dateStr === todayStr;

                      return (
                        <div 
                          key={day.dateStr} 
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px',
                            borderRadius: 'var(--radius-sm)',
                            background: isToday ? 'rgba(255,255,255,0.03)' : 'transparent',
                            border: isToday ? '1px solid var(--panel-border)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500 }}>
                            {day.dayName}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isToday ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {day.dayNum}
                          </span>
                          
                          {/* Toggle log checkbox */}
                          <div
                            onClick={() => handleToggleHabit(habit.id, day.dateStr)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: isCompleted ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                              background: isCompleted ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#fff',
                              transition: 'var(--transition-bounce)'
                            }}
                          >
                            {isCompleted && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
export default HabitsSpace;
