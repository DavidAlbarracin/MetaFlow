import React, { useState, useEffect, useRef } from 'react';
import { Search, Target, Folder, CheckSquare, Sparkles, Navigation } from 'lucide-react';
import { api } from '../api';
import type { Goal, Project, Task } from '../api';

interface CommandPaletteProps {
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  refreshData: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  goals,
  projects,
  tasks,
  setActiveTab,
  refreshData
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Listen to keyboard shortcut Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Navigation Shortcuts
  const navigationShortcuts = [
    { label: 'Ir a Dashboard', action: () => { setActiveTab('dashboard'); setIsOpen(false); } },
    { label: 'Ir a Metas y Proyectos', action: () => { setActiveTab('goals'); setIsOpen(false); } },
    { label: 'Ir a Calendario', action: () => { setActiveTab('calendar'); setIsOpen(false); } },
    { label: 'Ir a Tracker de Hábitos', action: () => { setActiveTab('habits'); setIsOpen(false); } },
    { label: 'Ir a Ajustes', action: () => { setActiveTab('settings'); setIsOpen(false); } }
  ];

  // Filtering Logic
  const getFilteredResults = () => {
    const results: any[] = [];
    const q = query.toLowerCase().trim();

    // 1. Check if it is a Quick Capture creation command
    const isCreateCommand = q.startsWith('crear ');
    if (isCreateCommand) {
      const content = query.substring(6).trim(); // Keep original casing
      if (content.length > 0) {
        results.push({
          type: 'create-task',
          label: `Crear Tarea: "${content}"`,
          icon: Sparkles,
          action: async () => {
            await api.createTask({ title: content, priority: 'medium', status: 'todo' });
            refreshData();
            setIsOpen(false);
          }
        });
        results.push({
          type: 'create-goal',
          label: `Crear Meta: "${content}"`,
          icon: Sparkles,
          action: async () => {
            await api.createGoal({ title: content, color: '#3b82f6' });
            refreshData();
            setIsOpen(false);
          }
        });
        results.push({
          type: 'create-project',
          label: `Crear Proyecto: "${content}"`,
          icon: Sparkles,
          action: async () => {
            await api.createProject({ title: content, color: '#10b981' });
            refreshData();
            setIsOpen(false);
          }
        });
      }
    }

    // Standard search matching
    if (q.length > 0 && !isCreateCommand) {
      // Matches navigation shortcuts
      navigationShortcuts.forEach((shortcut) => {
        if (shortcut.label.toLowerCase().includes(q)) {
          results.push({ type: 'nav', label: shortcut.label, icon: Navigation, action: shortcut.action });
        }
      });

      // Matches Goals
      goals.forEach((goal) => {
        if (goal.title.toLowerCase().includes(q)) {
          results.push({
            type: 'goal',
            label: `Meta: ${goal.title}`,
            icon: Target,
            action: () => {
              setActiveTab('goals');
              // Optional: selectedGoalId can be set, but let's let navigation click handle it
              setIsOpen(false);
            }
          });
        }
      });

      // Matches Projects
      projects.forEach((proj) => {
        if (proj.title.toLowerCase().includes(q)) {
          results.push({
            type: 'project',
            label: `Proyecto: ${proj.title}`,
            icon: Folder,
            action: () => {
              setActiveTab('goals');
              setIsOpen(false);
            }
          });
        }
      });

      // Matches Tasks
      tasks.forEach((task) => {
        if (task.title.toLowerCase().includes(q)) {
          results.push({
            type: 'task',
            label: `Tarea: ${task.title} (${task.status === 'done' ? 'Completada' : 'Pendiente'})`,
            icon: CheckSquare,
            action: async () => {
              // Toggle completion
              const nextStatus = task.status === 'done' ? 'todo' : 'done';
              await api.updateTask(task.id, { ...task, status: nextStatus });
              refreshData();
              setIsOpen(false);
            }
          });
        }
      });
    } else if (q.length === 0) {
      // If empty query, show navigation shortcuts and Quick Capture tips
      navigationShortcuts.forEach((shortcut) => {
        results.push({ type: 'nav', label: shortcut.label, icon: Navigation, action: shortcut.action });
      });
      results.push({
        type: 'tip',
        label: 'Tip: Escribe "crear [nombre]" para capturar tareas al instante.',
        icon: Sparkles,
        action: () => {}
      });
    }

    return results;
  };

  const filtered = getFilteredResults();

  // Handle keys inside input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;
    const activeEl = container.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elTop = activeEl.offsetTop;
      const elBottom = elTop + activeEl.clientHeight;

      if (elTop < containerTop) {
        container.scrollTop = elTop;
      } else if (elBottom > containerBottom) {
        container.scrollTop = elBottom - container.clientHeight;
      }
    }
  }, [selectedIndex]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '10vh'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="glass-panel" 
        style={{
          width: '90%',
          maxWidth: '600px',
          height: 'fit-content',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px', marginBottom: '10px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Busca metas, tareas, proyectos o escribe 'crear tarea...'"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              color: 'var(--text-main)',
              width: '100%',
              padding: '4px 0',
              boxShadow: 'none'
            }}
          />
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '3px 6px', borderRadius: '4px', color: 'var(--text-dark)' }}>
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div 
          ref={resultsContainerRef}
          style={{
            overflowY: 'auto',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '13px' }}>
              No se encontraron resultados
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              const isTip = item.type === 'tip';

              return (
                <div
                  key={idx}
                  onClick={() => { if (!isTip) item.action(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    cursor: isTip ? 'default' : 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={() => { if (!isTip) setSelectedIndex(idx); }}
                >
                  <Icon size={16} style={{ color: isSelected ? 'var(--on-primary, #ffffff)' : 'var(--accent)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--on-primary, #ffffff)' : isTip ? 'var(--text-dark)' : 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dark)', borderTop: '1px solid var(--panel-border)', paddingTop: '10px', marginTop: '10px' }}>
          <span>↑↓ para navegar</span>
          <span>ENTER para seleccionar</span>
          <span>Ctrl+K para cerrar</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
