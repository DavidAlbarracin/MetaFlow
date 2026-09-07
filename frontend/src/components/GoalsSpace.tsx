import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Target, Folder, CheckSquare, Plus, Trash2, Edit2, ChevronDown, ChevronRight, AlertCircle, Sliders, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import { showToast } from './ToastContainer';
import { showConfirm } from './ConfirmDialog';

import type { Goal, Project, Task, CRMContact } from '../api';

interface GoalsSpaceProps {
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  refreshData: () => void;
  contacts: CRMContact[];
}

export const GoalsSpace: React.FC<GoalsSpaceProps> = ({ goals, projects, tasks, refreshData, contacts }) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // View settings
  const [viewMode, setViewMode] = useState<'classic' | 'map' | 'kanban'>('classic');

  // Filters State
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'none' | 'overdue'>('all');
  const [filterSearch, setFilterSearch] = useState('');

  // Interactive Map Focus State
  const [hoveredGoalId, setHoveredGoalId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ id: string; path: string; color: string; active: boolean }[]>([]);

  // Modal form states
  const [modalType, setModalType] = useState<'goal' | 'project' | 'task' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formParentGoal, setFormParentGoal] = useState<string>('');
  const [formContactId, setFormContactId] = useState<string>('');
  const [formParentProject, setFormParentProject] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);


  // Task filtering logic
  const getFilteredTasks = (tasksList: Task[]) => {
    return tasksList.filter((task) => {
      // 1. Text Search Filter
      if (filterSearch.trim() !== '') {
        const q = filterSearch.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Priority Filter
      if (filterPriority !== 'all') {
        if (task.priority !== filterPriority) return false;
      }

      // 3. Date Filter
      if (filterDate !== 'all') {
        if (filterDate === 'none') {
          if (task.due_date) return false;
        } else {
          if (!task.due_date) return false;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const taskDate = new Date(task.due_date);
          taskDate.setHours(0, 0, 0, 0);

          if (filterDate === 'today') {
            if (taskDate.getTime() !== today.getTime()) return false;
          } else if (filterDate === 'week') {
            const oneWeekLater = new Date(today);
            oneWeekLater.setDate(today.getDate() + 7);
            if (taskDate.getTime() < today.getTime() || taskDate.getTime() > oneWeekLater.getTime()) return false;
          } else if (filterDate === 'overdue') {
            if (taskDate.getTime() >= today.getTime() || task.status === 'done') return false;
          }
        }
      }

      return true;
    });
  };

  const filteredTasks = getFilteredTasks(tasks);

  // SVG connection lines calculation
  const updateConnections = () => {
    if (viewMode !== 'map' || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newConnections: typeof connections = [];

    // Connection: Goal -> Project
    projects.forEach(project => {
      if (!project.goal_id) return;
      const goalEl = document.getElementById(`node-goal-${project.goal_id}`);
      const projectEl = document.getElementById(`node-project-${project.id}`);

      if (goalEl && projectEl) {
        const goalRect = goalEl.getBoundingClientRect();
        const projectRect = projectEl.getBoundingClientRect();

        const x1 = goalRect.right - containerRect.left;
        const y1 = goalRect.top + goalRect.height / 2 - containerRect.top;
        const x2 = projectRect.left - containerRect.left;
        const y2 = projectRect.top + projectRect.height / 2 - containerRect.top;

        const cx1 = x1 + (x2 - x1) / 2;
        const cy1 = y1;
        const cx2 = x1 + (x2 - x1) / 2;
        const cy2 = y2;
        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        // Focus Highlight logic
        const isGoalHovered = hoveredGoalId === project.goal_id;
        const isProjectHovered = hoveredProjectId === project.id;
        const active = isGoalHovered || isProjectHovered || (hoveredGoalId === null && hoveredProjectId === null);

        const goal = goals.find(g => g.id === project.goal_id);
        const color = goal ? goal.color : '#3b82f6';

        newConnections.push({
          id: `line-gp-${project.id}`,
          path,
          color: active ? color : 'rgba(255, 255, 255, 0.05)',
          active
        });
      }
    });

    // Connection: Project -> Task
    filteredTasks.forEach(task => {
      if (!task.project_id) return;
      const projectEl = document.getElementById(`node-project-${task.project_id}`);
      const taskEl = document.getElementById(`node-task-${task.id}`);

      if (projectEl && taskEl) {
        const projectRect = projectEl.getBoundingClientRect();
        const taskRect = taskEl.getBoundingClientRect();

        const x1 = projectRect.right - containerRect.left;
        const y1 = projectRect.top + projectRect.height / 2 - containerRect.top;
        const x2 = taskRect.left - containerRect.left;
        const y2 = taskRect.top + taskRect.height / 2 - containerRect.top;

        const cx1 = x1 + (x2 - x1) / 2;
        const cy1 = y1;
        const cx2 = x1 + (x2 - x1) / 2;
        const cy2 = y2;
        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        const project = projects.find(p => p.id === task.project_id);
        const isProjectActive = project && (hoveredProjectId === project.id || (project.goal_id && hoveredGoalId === project.goal_id));
        const active = isProjectActive || (hoveredGoalId === null && hoveredProjectId === null);

        const color = project ? project.color : '#10b981';

        newConnections.push({
          id: `line-pt-${task.id}`,
          path,
          color: active ? color : 'rgba(255, 255, 255, 0.05)',
          active
        });
      }
    });

    // Connection: Direct Goal -> Task (without project)
    filteredTasks.forEach(task => {
      if (!task.goal_id || task.project_id) return;
      const goalEl = document.getElementById(`node-goal-${task.goal_id}`);
      const taskEl = document.getElementById(`node-task-${task.id}`);

      if (goalEl && taskEl) {
        const goalRect = goalEl.getBoundingClientRect();
        const taskRect = taskEl.getBoundingClientRect();

        const x1 = goalRect.right - containerRect.left;
        const y1 = goalRect.top + goalRect.height / 2 - containerRect.top;
        const x2 = taskRect.left - containerRect.left;
        const y2 = taskRect.top + taskRect.height / 2 - containerRect.top;

        const cx1 = x1 + (x2 - x1) / 2;
        const cy1 = y1;
        const cx2 = x1 + (x2 - x1) / 2;
        const cy2 = y2;
        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        const isGoalHovered = hoveredGoalId === task.goal_id;
        const active = isGoalHovered || (hoveredGoalId === null && hoveredProjectId === null);

        const goal = goals.find(g => g.id === task.goal_id);
        const color = goal ? goal.color : '#3b82f6';

        newConnections.push({
          id: `line-gt-${task.id}`,
          path,
          color: active ? color : 'rgba(255, 255, 255, 0.05)',
          active
        });
      }
    });

    setConnections(newConnections);
  };

  const triggerUpdateConnections = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(() => {
      updateConnections();
    });
  };

  // Re-calculate connection lines on viewport or layout modifications
  useLayoutEffect(() => {
    if (viewMode === 'map') {
      triggerUpdateConnections();
      window.addEventListener('resize', triggerUpdateConnections);
      return () => {
        window.removeEventListener('resize', triggerUpdateConnections);
      };
    }
  }, [viewMode, goals, projects, tasks, hoveredGoalId, hoveredProjectId, filterPriority, filterDate, filterSearch]);

  // Dialog dismissal fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleLightDismiss = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) {
        dialog.close();
        setModalType(null);
      }
    };

    dialog.addEventListener('click', handleLightDismiss);
    return () => dialog.removeEventListener('click', handleLightDismiss);
  }, [modalType]);

  // Open modals
  const openModal = (type: 'goal' | 'project' | 'task', editItem?: any) => {
    setModalType(type);
    setIsEditing(!!editItem);
    setEditingId(editItem?.id || null);

    if (editItem) {
      setFormTitle(editItem.title || '');
      setFormDesc(editItem.description || '');
      setFormDueDate(editItem.due_date || '');
      setFormColor(editItem.color || '#3b82f6');
      setFormParentGoal(editItem.goal_id || '');
      setFormParentProject(editItem.project_id || '');
      setFormPriority(editItem.priority || 'medium');
      setFormContactId((editItem as any).contact_id || '');
    } else {
      setFormTitle('');
      setFormDesc('');
      setFormDueDate('');
      setFormColor(type === 'goal' ? '#3b82f6' : type === 'project' ? '#10b981' : '#a855f7');
      setFormParentGoal(selectedGoalId || '');
      setFormParentProject('');
      setFormPriority('medium');
      setFormContactId('');
    }

    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setModalType(null);
  };

  // Submit forms
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'goal') {
        const payload = { title: formTitle, description: formDesc, due_date: formDueDate || null, color: formColor };
        if (isEditing && editingId) {
          await api.updateGoal(editingId, payload);
        } else {
          await api.createGoal(payload);
        }
      } else if (modalType === 'project') {
        const payload = { 
          title: formTitle, 
          description: formDesc, 
          goal_id: formParentGoal || null, 
          due_date: formDueDate || null, 
          color: formColor,
          contact_id: formContactId || null
        };
        if (isEditing && editingId) {
          await api.updateProject(editingId, payload);
        } else {
          await api.createProject(payload);
          if (formParentGoal) setSelectedGoalId(formParentGoal);
        }
      } else if (modalType === 'task') {
        let resolvedGoalId = formParentGoal || null;
        if (formParentProject) {
          const parentProj = projects.find(p => p.id === formParentProject);
          if (parentProj && parentProj.goal_id) {
            resolvedGoalId = parentProj.goal_id;
          }
        }

        const payload = { 
          title: formTitle, 
          description: formDesc, 
          project_id: formParentProject || null, 
          goal_id: resolvedGoalId, 
          due_date: formDueDate || null, 
          priority: formPriority 
        };

        if (isEditing && editingId) {
          await api.updateTask(editingId, payload);
        } else {
          await api.createTask(payload);
        }
      }

      refreshData();
      closeModal();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar los datos', 'error');
    }
  };

  // Delete handlers
  const handleDeleteGoal = async (id: string) => {
    const confirmed = await showConfirm(
      '¿Eliminar esta meta?',
      'Los proyectos y tareas asociadas se desvincularán.'
    );
    if (confirmed) {
      await api.deleteGoal(id);
      if (selectedGoalId === id) setSelectedGoalId(null);
      refreshData();
    }
  };

  const handleDeleteProject = async (id: string) => {
    const confirmed = await showConfirm(
      '¿Eliminar este proyecto?',
      'Las tareas asociadas se desvincularán.'
    );
    if (confirmed) {
      await api.deleteProject(id);
      refreshData();
    }
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = await showConfirm(
      '¿Eliminar esta tarea?'
    );
    if (confirmed) {
      await api.deleteTask(id);
      refreshData();
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await api.updateTask(task.id, { ...task, status: nextStatus });
    refreshData();
  };

  const toggleProjectExpand = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculations (Progress counters)
  const getProjectProgress = (projId: string) => {
    const projTasks = tasks.filter(t => t.project_id === projId);
    if (projTasks.length === 0) return 0;
    const completed = projTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  const getGoalProgress = (goalId: string) => {
    const goalProjects = projects.filter(p => p.goal_id === goalId);
    const goalProjectIds = goalProjects.map(p => p.id);

    const goalTasks = tasks.filter(t => t.goal_id === goalId || (t.project_id && goalProjectIds.includes(t.project_id)));
    if (goalTasks.length === 0) return 0;

    const completed = goalTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / goalTasks.length) * 100);
  };

  // HTML5 Drag and Drop Handlers for Kanban Board
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    try {
      await api.updateTask(taskId, { ...task, status: targetStatus });
      refreshData();
      showToast(`Estado de la tarea actualizado`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el estado de la tarea', 'error');
    }
  };

  const advanceTaskStatus = async (task: Task) => {
    const nextStatusMap: Record<Task['status'], Task['status']> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo'
    };
    const nextStatus = nextStatusMap[task.status];
    await api.updateTask(task.id, { ...task, status: nextStatus });
    refreshData();
  };

  const regressTaskStatus = async (task: Task) => {
    const prevStatusMap: Record<Task['status'], Task['status']> = {
      todo: 'done',
      in_progress: 'todo',
      done: 'in_progress'
    };
    const prevStatus = prevStatusMap[task.status];
    await api.updateTask(task.id, { ...task, status: prevStatus });
    refreshData();
  };

  // Filter lists for structural layout rendering
  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const selectedGoalProjects = projects.filter(p => p.goal_id === selectedGoalId);
  const selectedGoalDirectTasks = filteredTasks.filter(t => t.goal_id === selectedGoalId && !t.project_id);
  const independentProjects = projects.filter(p => !p.goal_id);
  const independentTasks = filteredTasks.filter(t => !t.goal_id && !t.project_id);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Metas & Proyectos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Gestiona la jerarquía de tus objetivos. Define Metas, divídelas en Proyectos y crea Tareas concretas.
          </p>
        </div>
      </div>

      {/* FILTER BAR & VIEW SELECTION TAB CONTROL */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
            {([
              { id: 'classic', label: 'Vista Clásica' },
              { id: 'map', label: 'Mapa de Conexiones' },
              { id: 'kanban', label: 'Tablero Kanban' }
            ] as const).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewMode === mode.id ? 'var(--primary)' : 'transparent',
                  color: viewMode === mode.id ? 'var(--on-primary, #ffffff)' : 'var(--text-muted)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Creation Button Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={() => openModal('goal')} style={{ background: '#3b82f6', boxShadow: '0 4px 14px rgba(59,130,246,0.3)', padding: '8px 14px', fontSize: '13px' }}>
              <Plus size={14} /> Nueva Meta
            </button>
            <button className="btn-primary" onClick={() => openModal('project')} style={{ background: '#10b981', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', padding: '8px 14px', fontSize: '13px' }}>
              <Plus size={14} /> Nuevo Proyecto
            </button>
            <button className="btn-primary" onClick={() => openModal('task')} style={{ background: '#a855f7', boxShadow: '0 4px 14px rgba(168,85,247,0.3)', padding: '8px 14px', fontSize: '13px' }}>
              <Plus size={14} /> Nueva Tarea
            </button>
          </div>
        </div>

        {/* Filters Controls Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
          
          {/* Filter Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> Vencimiento
            </label>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value as any)} style={{ padding: '6px 12px', fontSize: '12px', width: '150px' }}>
              <option value="all">Todo</option>
              <option value="today">Vence hoy</option>
              <option value="week">Esta semana</option>
              <option value="none">Sin fecha</option>
              <option value="overdue">Vencidas</option>
            </select>
          </div>

          {/* Filter Priority */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sliders size={12} /> Prioridad
            </label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)} style={{ padding: '6px 12px', fontSize: '12px', width: '120px' }}>
              <option value="all">Todo</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>

          {/* Search Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Buscar</label>
            <input 
              type="text" 
              placeholder="Buscar por título o descripción..." 
              value={filterSearch} 
              onChange={(e) => setFilterSearch(e.target.value)} 
              style={{ padding: '6px 12px', fontSize: '12px' }}
            />
          </div>

          {/* Clear Button */}
          {(filterDate !== 'all' || filterPriority !== 'all' || filterSearch !== '') && (
            <button 
              onClick={() => { setFilterDate('all'); setFilterPriority('all'); setFilterSearch(''); }}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 12px',
                border: 'none',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* RENDER DYNAMIC LAYOUT BASED ON SELECTED VIEW */}
      {viewMode === 'classic' && (
        <>
          {/* METAS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {goals.map((goal) => {
              const progress = getGoalProgress(goal.id);
              const isSelected = selectedGoalId === goal.id;
              return (
                <div 
                  key={goal.id} 
                  className="glass-card" 
                  onClick={() => setSelectedGoalId(isSelected ? null : goal.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--panel-border)',
                    borderWidth: isSelected ? '2px' : '1px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '20px',
                    width: '40px',
                    height: '4px',
                    borderRadius: '0 0 4px 4px',
                    backgroundColor: goal.color
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{goal.title}</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openModal('goal', goal); }} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1, lineBreak: 'anywhere' }}>
                    {goal.description || 'Sin descripción.'}
                  </p>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      <span>Progreso</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${goal.color} 0%, var(--accent) 100%)`, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
            
            {/* TREE DETAIL LIST */}
            <div className="glass-panel" style={{ minHeight: '350px' }}>
              {selectedGoalId && selectedGoal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Target size={22} style={{ color: selectedGoal.color }} />
                      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{selectedGoal.title}</h2>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Meta Seleccionada
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Proyectos en esta Meta
                    </h3>
                    
                    {selectedGoalProjects.length === 0 && (
                      <p style={{ fontSize: '13px', color: 'var(--text-dark)', paddingLeft: '8px' }}>
                        No hay proyectos asociados a esta meta.
                      </p>
                    )}

                    {selectedGoalProjects.map((project) => {
                      const projTasks = filteredTasks.filter(t => t.project_id === project.id);
                      const isExpanded = !!expandedProjects[project.id];
                      const progress = getProjectProgress(project.id);

                      return (
                        <div key={project.id} className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
                          <div 
                            onClick={() => toggleProjectExpand(project.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              cursor: 'pointer',
                              background: 'rgba(255,255,255,0.01)',
                              borderBottom: isExpanded ? '1px solid var(--panel-border)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              <Folder size={18} style={{ color: project.color }} />
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{project.title}</span>
                              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                {progress}%
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => openModal('project', project)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => handleDeleteProject(project.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '12px 16px 12px 42px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                              {projTasks.length === 0 && (
                                <p style={{ fontSize: '12px', color: 'var(--text-dark)' }}>No hay tareas en este proyecto.</p>
                              )}
                              {projTasks.map((task) => (
                                <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div 
                                      className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                                      onClick={() => handleToggleTaskStatus(task)}
                                    >
                                      ✓
                                    </div>
                                    <span style={{
                                      fontSize: '13px',
                                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                      color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)'
                                    }}>
                                      {task.title}
                                    </span>
                                    <span className={`priority-tag priority-${task.priority}`}>
                                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                    </span>
                                    {task.due_date && (
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        📅 {new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tareas Directas de la Meta
                    </h3>
                    {selectedGoalDirectTasks.length === 0 && (
                      <p style={{ fontSize: '13px', color: 'var(--text-dark)', paddingLeft: '8px' }}>
                        No hay tareas directamente asociadas a esta meta.
                      </p>
                    )}
                    {selectedGoalDirectTasks.map((task) => (
                      <div key={task.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                            onClick={() => handleToggleTaskStatus(task)}
                          >
                            ✓
                          </div>
                          <span style={{
                            fontSize: '13px',
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)'
                          }}>
                            {task.title}
                          </span>
                          <span className={`priority-tag priority-${task.priority}`}>
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          {task.due_date && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              📅 {new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Folder size={22} style={{ color: 'var(--accent)' }} />
                      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Proyectos Independientes</h2>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Sin Meta
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {independentProjects.length === 0 ? (
                      <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
                        <AlertCircle size={32} />
                        <p style={{ fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
                          No hay proyectos independientes. Selecciona una meta arriba o crea un nuevo proyecto sin meta.
                        </p>
                      </div>
                    ) : (
                      independentProjects.map((project) => {
                        const projTasks = filteredTasks.filter(t => t.project_id === project.id);
                        const isExpanded = !!expandedProjects[project.id];
                        const progress = getProjectProgress(project.id);

                        return (
                          <div key={project.id} className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
                            <div 
                              onClick={() => toggleProjectExpand(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.01)',
                                borderBottom: isExpanded ? '1px solid var(--panel-border)' : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <Folder size={18} style={{ color: project.color }} />
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{project.title}</span>
                                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                  {progress}%
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => openModal('project', project)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDeleteProject(project.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '12px 16px 12px 42px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                                {projTasks.length === 0 && (
                                  <p style={{ fontSize: '12px', color: 'var(--text-dark)' }}>No hay tareas en este proyecto.</p>
                                )}
                                {projTasks.map((task) => (
                                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div 
                                        className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                                        onClick={() => handleToggleTaskStatus(task)}
                                      >
                                        ✓
                                      </div>
                                      <span style={{
                                        fontSize: '13px',
                                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                        color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)'
                                      }}>
                                        {task.title}
                                      </span>
                                      <span className={`priority-tag priority-${task.priority}`}>
                                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                      </span>
                                      {task.due_date && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          📅 {new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <Edit2 size={12} />
                                      </button>
                                      <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* INDEPENDENT TASKS */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
                <CheckSquare size={20} style={{ color: '#a855f7' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Tareas Independientes</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Tareas sueltas que no están vinculadas a ningún proyecto ni meta específica.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                {independentTasks.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-dark)' }}>
                    <CheckSquare size={24} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px' }}>No hay tareas sueltas.</span>
                  </div>
                ) : (
                  independentTasks.map((task) => (
                    <div key={task.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div 
                          className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                          onClick={() => handleToggleTaskStatus(task)}
                        >
                          ✓
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}>
                            {task.title}
                          </span>
                          <span style={{ display: 'inline-block', width: 'fit-content', marginTop: '2px' }} className={`priority-tag priority-${task.priority}`}>
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {/* CONNECTION MAP VIEW (SVG CURVES) */}
      {viewMode === 'map' && (
        <div 
          ref={containerRef}
          style={{ 
            position: 'relative', 
            minHeight: '650px', 
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            overflow: 'hidden'
          }}
        >
          {/* Overlay SVG for curves */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {connections.map((c) => (
              <path
                key={c.id}
                d={c.path}
                fill="none"
                stroke={c.color}
                strokeWidth={c.active ? 2.5 : 1}
                style={{ 
                  transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                  opacity: c.active ? 0.75 : 0.15 
                }}
              />
            ))}
          </svg>

          {/* Interactive 3-column Grid layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.2fr', gap: '60px', height: '620px', position: 'relative', zIndex: 2 }}>
            
            {/* Column 1: METAS */}
            <div 
              onScroll={triggerUpdateConnections}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                Metas ({goals.length})
              </h3>
              
              {goals.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-dark)', textAlign: 'center', marginTop: '20px' }}>No hay metas registradas.</p>
              ) : (
                goals.map(goal => {
                  const progress = getGoalProgress(goal.id);
                  const isHovered = hoveredGoalId === goal.id;
                  const opacity = (hoveredGoalId === null || isHovered) ? 1 : 0.3;

                  return (
                    <div
                      key={goal.id}
                      id={`node-goal-${goal.id}`}
                      onMouseEnter={() => setHoveredGoalId(goal.id)}
                      onMouseLeave={() => setHoveredGoalId(null)}
                      className="glass-card"
                      style={{
                        borderColor: isHovered ? goal.color : 'var(--panel-border)',
                        boxShadow: isHovered ? `0 0 16px ${goal.color}33` : 'var(--shadow-sm)',
                        opacity,
                        transition: 'var(--transition-smooth)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: goal.color, fontWeight: 700, letterSpacing: '0.5px' }}>Meta</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openModal('goal', goal)} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}><Edit2 size={11} /></button>
                          <button onClick={() => handleDeleteGoal(goal.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{goal.title}</h4>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: goal.color, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progreso: {progress}%</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Column 2: PROYECTOS */}
            <div 
              onScroll={triggerUpdateConnections}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                Proyectos ({projects.length})
              </h3>
              
              {projects.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-dark)', textAlign: 'center', marginTop: '20px' }}>No hay proyectos registrados.</p>
              ) : (
                projects.map(project => {
                  const parentGoal = goals.find(g => g.id === project.goal_id);
                  const isHovered = hoveredProjectId === project.id || (project.goal_id && hoveredGoalId === project.goal_id);
                  const opacity = (hoveredGoalId === null && hoveredProjectId === null) || isHovered ? 1 : 0.3;
                  const progress = getProjectProgress(project.id);

                  return (
                    <div
                      key={project.id}
                      id={`node-project-${project.id}`}
                      onMouseEnter={() => {
                        setHoveredProjectId(project.id);
                        if (project.goal_id) setHoveredGoalId(project.goal_id);
                      }}
                      onMouseLeave={() => {
                        setHoveredProjectId(null);
                        setHoveredGoalId(null);
                      }}
                      className="glass-card"
                      style={{
                        borderColor: isHovered ? project.color : 'var(--panel-border)',
                        boxShadow: isHovered ? `0 0 16px ${project.color}33` : 'var(--shadow-sm)',
                        opacity,
                        transition: 'var(--transition-smooth)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: project.color, fontWeight: 700, letterSpacing: '0.5px' }}>
                          {parentGoal ? `Proyecto · ${parentGoal.title}` : 'Proyecto Independiente'}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openModal('project', project)} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}><Edit2 size={11} /></button>
                          <button onClick={() => handleDeleteProject(project.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{project.title}</h4>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: project.color, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completado: {progress}%</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Column 3: TAREAS FILTRADAS */}
            <div 
              onScroll={triggerUpdateConnections}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                Tareas ({filteredTasks.length})
              </h3>
              
              {filteredTasks.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-dark)', textAlign: 'center', marginTop: '20px' }}>No hay tareas filtradas.</p>
              ) : (
                filteredTasks.map(task => {
                  const parentProj = projects.find(p => p.id === task.project_id);
                  const parentGoal = goals.find(g => g.id === task.goal_id);
                  
                  const isHovered = (task.project_id && hoveredProjectId === task.project_id) || 
                                    (task.goal_id && hoveredGoalId === task.goal_id);
                  const opacity = (hoveredGoalId === null && hoveredProjectId === null) || isHovered ? 1 : 0.3;

                  return (
                    <div
                      key={task.id}
                      id={`node-task-${task.id}`}
                      className="glass-card"
                      style={{
                        borderColor: isHovered ? 'var(--primary)' : 'var(--panel-border)',
                        opacity,
                        transition: 'var(--transition-smooth)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: 700, 
                          color: parentProj ? parentProj.color : parentGoal ? parentGoal.color : 'var(--text-dark)',
                          textTransform: 'uppercase'
                        }}>
                          {parentProj ? `Tarea · ${parentProj.title}` : parentGoal ? `Tarea · ${parentGoal.title}` : 'Tarea Independiente'}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}><Edit2 size={11} /></button>
                          <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div 
                          className={`custom-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                          onClick={() => handleToggleTaskStatus(task)}
                          style={{ width: '18px', height: '18px', borderRadius: '4px' }}
                        >
                          ✓
                        </div>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 500,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`priority-tag priority-${task.priority}`} style={{ padding: '1px 5px', fontSize: '9px' }}>
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        {task.due_date && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            📅 {new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* KANBAN BOARD VIEW (DRAG & DROP) */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', minHeight: '500px' }}>
          
          {/* Columns looping */}
          {(['todo', 'in_progress', 'done'] as const).map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            const columnName = status === 'todo' ? 'Sin Empezar' : status === 'in_progress' ? 'En Progreso' : 'Terminado';
            const columnColor = status === 'todo' ? '#6b7280' : status === 'in_progress' ? '#eab308' : '#10b981';

            return (
              <div 
                key={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--panel-bg)',
                  borderColor: 'var(--panel-border)',
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid', borderBottomColor: columnColor, paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: columnColor }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{columnName}</h3>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', minHeight: '400px' }}>
                  {columnTasks.length === 0 ? (
                    <div style={{ border: '1px dashed var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '30px 10px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px', marginTop: '10px' }}>
                      Arrastra una tarea aquí
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const parentProj = projects.find(p => p.id === task.project_id);
                      const parentGoal = goals.find(g => g.id === task.goal_id);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="glass-card"
                          style={{
                            cursor: 'grab',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative'
                          }}
                        >
                          {/* Project parent marker line */}
                          {(parentProj || parentGoal) && (
                            <div style={{
                              position: 'absolute',
                              top: '0',
                              left: '12px',
                              width: '24px',
                              height: '3px',
                              borderRadius: '0 0 3px 3px',
                              backgroundColor: parentProj ? parentProj.color : parentGoal ? parentGoal.color : '#fff'
                            }} />
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px' }}>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: 700, 
                              color: parentProj ? parentProj.color : parentGoal ? parentGoal.color : 'var(--text-dark)',
                              textTransform: 'uppercase',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '120px'
                            }}>
                              {parentProj ? parentProj.title : parentGoal ? parentGoal.title : 'Independiente'}
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openModal('task', task)} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}><Edit2 size={11} /></button>
                              <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                            </div>
                          </div>

                          <h4 style={{ 
                            fontSize: '13px', 
                            fontWeight: 600,
                            color: task.status === 'done' ? 'var(--text-dark)' : 'var(--text-main)',
                            textDecoration: task.status === 'done' ? 'line-through' : 'none'
                          }}>
                            {task.title}
                          </h4>

                          {task.description && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineBreak: 'anywhere' }}>
                              {task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <span className={`priority-tag priority-${task.priority}`} style={{ padding: '1px 5px', fontSize: '9px' }}>
                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                              {task.due_date && (
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                  📅 {new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>

                            {/* Quick Action Navigation Arrows */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                onClick={() => regressTaskStatus(task)} 
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px' }}
                                title="Mover a estado previo"
                              >
                                <ArrowLeft size={10} />
                              </button>
                              <button 
                                onClick={() => advanceTaskStatus(task)} 
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px' }}
                                title="Mover a estado siguiente"
                              >
                                <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* POPUP FORM MODAL (DIALOG) */}
      <dialog ref={dialogRef} closedby="any" aria-labelledby="modalTitle">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 id="modalTitle" style={{ fontSize: '20px', fontWeight: 600 }}>
            {isEditing ? 'Editar' : 'Crear'} {modalType === 'goal' ? 'Meta' : modalType === 'project' ? 'Proyecto' : 'Tarea'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Título</label>
            <input 
              type="text" 
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={`Título de la ${modalType}`}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Descripción</label>
            <textarea 
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Escribe detalles adicionales..."
              rows={3}
            />
          </div>

          {modalType === 'goal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Fecha Límite</label>
                <input 
                  type="date" 
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Color Temático</label>
                <input 
                  type="color" 
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  style={{ height: '40px', padding: '2px', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {modalType === 'project' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Meta Asociada</label>
                  <select value={formParentGoal} onChange={(e) => setFormParentGoal(e.target.value)}>
                    <option value="">-- Sin Meta (Independiente) --</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Contacto (Keep in Touch)</label>
                  <select value={formContactId} onChange={(e) => setFormContactId(e.target.value)}>
                    <option value="">-- Sin Vincular --</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || 'Independiente'})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Fecha Límite</label>
                  <input 
                    type="date" 
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Color del Proyecto</label>
                  <input 
                    type="color" 
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ height: '40px', padding: '2px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </>
          )}

          {modalType === 'task' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Meta Directa</label>
                  <select 
                    value={formParentGoal} 
                    onChange={(e) => {
                      setFormParentGoal(e.target.value);
                      setFormParentProject('');
                    }}
                  >
                    <option value="">-- Sin Meta --</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Proyecto</label>
                  <select 
                    value={formParentProject} 
                    onChange={(e) => {
                      setFormParentProject(e.target.value);
                      const proj = projects.find(p => p.id === e.target.value);
                      if (proj && proj.goal_id) {
                        setFormParentGoal(proj.goal_id);
                      }
                    }}
                  >
                    <option value="">-- Sin Proyecto --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Prioridad</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as any)}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Fecha Límite</label>
                  <input 
                    type="date" 
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </dialog>

    </div>
  );
};

export default GoalsSpace;
