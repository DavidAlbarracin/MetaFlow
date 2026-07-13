import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Calendar } from 'lucide-react';
import { api } from '../api';
import type { Task, CalendarEvent } from '../api';
import { showConfirm } from './ConfirmDialog';

interface CalendarSpaceProps {
  tasks: Task[];
  events: CalendarEvent[];
  refreshData: () => void;
}

export const CalendarSpace: React.FC<CalendarSpaceProps> = ({ tasks, events, refreshData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Quick add form states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickType, setQuickType] = useState<'task' | 'event'>('task');
  const [loading, setLoading] = useState(false);

  // New detailed event states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [quickTime, setQuickTime] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickMeetingLink, setQuickMeetingLink] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Calculate days in the current month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(year, month);

  // First day of the month index (shifted so Monday is 0)
  const getFirstDayIndex = (y: number, m: number) => {
    const firstDay = new Date(y, m, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };
  const firstDayIndex = getFirstDayIndex(year, month);

  // Generate calendar grid cells (including padding from prev/next months)
  const generateGridCells = () => {
    const cells = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);

    // Padding from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      cells.push({
        dayNum: d,
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dayNum: d,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }

    // Padding from next month to make grid standard 42 cells (6 rows)
    const totalCellsSoFar = cells.length;
    const remainingCells = 42 - totalCellsSoFar;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      cells.push({
        dayNum: d,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    return cells;
  };

  const cells = generateGridCells();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await api.updateTask(task.id, { ...task, status: nextStatus });
    refreshData();
  };

  const handleQuickAddClick = (dateStr: string) => {
    setQuickDate(dateStr);
    setQuickTitle('');
    setQuickType('task');
    setQuickTime('');
    setQuickDescription('');
    setQuickMeetingLink('');
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setLoading(true);
    try {
      if (quickType === 'task') {
        await api.createTask({
          title: quickTitle,
          due_date: quickDate,
          priority: 'medium',
          status: 'todo'
        });
      } else {
        await api.createEvent({
          title: quickTitle,
          date: quickDate,
          time: quickTime || null,
          meeting_link: quickMeetingLink || null,
          description: quickDescription || null
        });
      }
      setShowQuickAdd(false);
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Calendario Mensual</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Visualiza y programa tus tareas o eventos. Haz clic en cualquier día para añadir una nueva entrada.
          </p>
        </div>

        {/* Navigation Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn-secondary" onClick={handleGoToday} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Hoy
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)' }}>
            <button 
              onClick={handlePrevMonth} 
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '6px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '130px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button 
              onClick={handleNextMonth} 
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '6px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR MONTH GRID */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(15, 23, 42, 0.45)' }}>
        
        {/* Day Name Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '8px', textAlign: 'center' }}>
          {dayNames.map((name) => (
            <div key={name} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              {name}
            </div>
          ))}
        </div>

        {/* 6-Row Days Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: 'repeat(6, 110px)',
          gap: '8px'
        }}>
          {cells.map((cell, idx) => {
            const dayTasks = tasks.filter(t => t.due_date === cell.dateStr);
            const dayEvents = events.filter(e => e.date === cell.dateStr);
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={idx}
                style={{
                  background: cell.isCurrentMonth ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.15)',
                  border: isToday ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                  boxShadow: isToday ? '0 0 10px rgba(59, 130, 246, 0.15)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  opacity: cell.isCurrentMonth ? 1 : 0.4,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'var(--transition-smooth)'
                }}
                onClick={() => handleQuickAddClick(cell.dateStr)}
                onMouseEnter={(e) => {
                  if (cell.isCurrentMonth) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (cell.isCurrentMonth) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = isToday ? 'var(--primary)' : 'var(--panel-border)';
                  }
                }}
              >
                {/* Day Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isToday ? 'var(--accent)' : 'var(--text-main)',
                    background: isToday ? 'rgba(255,255,255,0.08)' : 'transparent',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {cell.dayNum}
                  </span>
                  
                  {/* Plus icon on hover */}
                  <span className="add-task-hover-icon" style={{ opacity: 0.3, display: 'flex', color: 'var(--text-muted)' }}>
                    <Plus size={12} />
                  </span>
                </div>

                {/* Day Content (Tasks and Events) */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }} onClick={(e) => e.stopPropagation()}>
                  
                  {/* Events List */}
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      title={ev.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderLeft: '3px solid var(--accent)',
                        fontSize: '11px',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', flex: 1 }}>
                        {ev.meeting_link ? (
                          <span style={{ fontSize: '10px', flexShrink: 0 }} title="Reunión Online (📹)">📹</span>
                        ) : (
                          <Calendar size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        )}
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}>
                          {ev.time ? `${ev.time} ` : ''}{ev.title}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Tasks List */}
                  {dayTasks.map((task) => {
                    const isCompleted = task.status === 'done';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTaskStatus(task)}
                        title={task.title}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: isCompleted ? 'rgba(255,255,255,0.02)' : 'rgba(255, 255, 255, 0.04)',
                          borderLeft: `3px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#fb923c' : '#3b82f6'}`,
                          opacity: isCompleted ? 0.5 : 1,
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          border: '1px solid var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isCompleted ? 'var(--primary)' : 'transparent',
                          borderColor: isCompleted ? 'var(--primary)' : 'var(--text-muted)',
                          color: '#fff',
                          flexShrink: 0
                        }}>
                          {isCompleted && <Check size={8} strokeWidth={4} />}
                        </div>
                        <span style={{
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: 'var(--text-main)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK ADD POPUP (INLINE DIALOG OVERLAY) */}
      {showQuickAdd && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowQuickAdd(false)}
        >
          <div 
            className="glass-panel" 
            style={{ width: '90%', maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleQuickAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Nueva entrada para el {quickDate}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Tipo de entrada</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setQuickType('task')}
                    className={quickType === 'task' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Tarea
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickType('event')}
                    className={quickType === 'event' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Evento
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Título</label>
                <input
                  type="text"
                  placeholder={quickType === 'task' ? "Ej. Terminar propuesta de diseño..." : "Ej. Reunión con cliente..."}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {quickType === 'event' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Hora</label>
                    <input
                      type="time"
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Enlace de Reunión</label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={quickMeetingLink}
                      onChange={(e) => setQuickMeetingLink(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Descripción</label>
                    <textarea
                      placeholder="Detalles adicionales del evento..."
                      value={quickDescription}
                      onChange={(e) => setQuickDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQuickAdd(false)} style={{ padding: '8px 14px', fontSize: '13px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '8px 14px', fontSize: '13px' }}>
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAILS DIALOG OVERLAY */}
      {selectedEvent && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="glass-panel" 
            style={{ width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Evento de Calendario
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                {selectedEvent.date}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedEvent.time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                  <span style={{ opacity: 0.7 }}>⏰ Hora:</span>
                  <span style={{ fontWeight: 600 }}>{selectedEvent.time}</span>
                </div>
              )}

              {selectedEvent.meeting_link && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enlace de Reunión</span>
                  <a 
                    href={selectedEvent.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      padding: '10px',
                      fontSize: '13px',
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                    }}
                  >
                    📹 Unirse a Reunión
                  </a>
                </div>
              )}

              {selectedEvent.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Descripción</span>
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-main)', 
                    background: 'rgba(0,0,0,0.2)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--panel-border)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--panel-border)', paddingTop: '15px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={async () => {
                  const confirmed = await showConfirm(
                    '¿Eliminar evento?',
                    '¿Estás seguro de que quieres eliminar este evento de tu calendario?'
                  );
                  if (confirmed) {
                    setLoading(true);
                    try {
                      await api.deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      refreshData();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setLoading(false);
                    }
                  }
                }} 
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '8px 14px', fontSize: '13px' }}
                disabled={loading}
              >
                🗑️ Eliminar Evento
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSelectedEvent(null)} 
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default CalendarSpace;
