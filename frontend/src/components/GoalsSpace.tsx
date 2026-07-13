import React, { useState, useEffect, useRef } from 'react';
import { Target, Folder, CheckSquare, Plus, Trash2, Edit2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
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

  // Initialize dialog dismissal fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleLightDismiss = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return; // Browser supports it natively
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
        // Resolve goal_id if project is selected (inherits goal_id from project)
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

  // Calculations
  const getProjectProgress = (projId: string) => {
    const projTasks = tasks.filter(t => t.project_id === projId);
    if (projTasks.length === 0) return 0;
    const completed = projTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  const getGoalProgress = (goalId: string) => {
    // Collect all tasks belonging directly to the goal + all tasks belonging to projects of the goal
    const goalProjects = projects.filter(p => p.goal_id === goalId);
    const goalProjectIds = goalProjects.map(p => p.id);

    const goalTasks = tasks.filter(t => t.goal_id === goalId || (t.project_id && goalProjectIds.includes(t.project_id)));
    if (goalTasks.length === 0) return 0;

    const completed = goalTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / goalTasks.length) * 100);
  };

  // Filter independent tasks
  const independentTasks = tasks.filter(t => !t.goal_id && !t.project_id);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const selectedGoalProjects = projects.filter(p => p.goal_id === selectedGoalId);
  const selectedGoalDirectTasks = tasks.filter(t => t.goal_id === selectedGoalId && !t.project_id);
  const independentProjects = projects.filter(p => !p.goal_id);

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => openModal('goal')} style={{ background: '#3b82f6', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
            <Plus size={16} /> Nueva Meta
          </button>
          <button className="btn-primary" onClick={() => openModal('project')} style={{ background: '#10b981', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
            <Plus size={16} /> Nuevo Proyecto
          </button>
          <button className="btn-primary" onClick={() => openModal('task')} style={{ background: '#a855f7', boxShadow: '0 4px 14px rgba(168,85,247,0.3)' }}>
            <Plus size={16} /> Nueva Tarea
          </button>
        </div>
      </div>

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
              {/* Color Tag */}
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

              {/* Progress bar */}
              <div style={{ marginTop: '8px' }}>
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
        
        {/* DETAIL VIEW OF SELECTED GOAL / TREE VIEW */}
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

              {/* Tree: Projects & their Tasks */}
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
                  const projTasks = tasks.filter(t => t.project_id === project.id);
                  const isExpanded = !!expandedProjects[project.id];
                  const progress = getProjectProgress(project.id);

                  return (
                    <div key={project.id} className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
                      {/* Project Header */}
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

                      {/* Project Tasks */}
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

              {/* Direct Goal Tasks */}
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
                    const projTasks = tasks.filter(t => t.project_id === project.id);
                    const isExpanded = !!expandedProjects[project.id];
                    const progress = getProjectProgress(project.id);

                    return (
                      <div key={project.id} className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
                        {/* Project Header */}
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

                        {/* Project Tasks */}
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

        {/* INDEPENDENT TASKS COLUMN */}
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

          {/* Form conditional selections based on modal type */}
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
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Cliente CRM</label>
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
                      setFormParentProject(''); // Clear project to prevent double mapping conflict
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
                      // Autofill parent goal if project has one
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

          {/* Action buttons */}
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
