import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Search, FileText, User, Bold, Italic, Heading1, Heading2, List, Quote, RemoveFormatting } from 'lucide-react';
import { api } from '../api';
import type { Note, CRMContact } from '../api';
import { showToast } from './ToastContainer';
import { showConfirm } from './ConfirmDialog';

interface NotesSpaceProps {
  notes: Note[];
  contacts: CRMContact[];
  refreshData: () => void;
}

export const NotesSpace: React.FC<NotesSpaceProps> = ({ notes, contacts, refreshData }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'wiki' | 'general' | 'personal'>('all');
  
  // Note Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'wiki' | 'general' | 'personal'>('wiki');
  const [contactId, setContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content dynamically only when selectedNoteId or notes array changes
  useEffect(() => {
    if (editorRef.current) {
      const currentNote = notes.find(n => n.id === selectedNoteId);
      const noteContent = currentNote ? (currentNote.content || '') : '';
      // Only set innerHTML if it's actually different to preserve cursor focus
      if (editorRef.current.innerHTML !== noteContent) {
        editorRef.current.innerHTML = noteContent;
      }
    }
  }, [selectedNoteId, notes]);

  const handleCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (command === 'formatBlock') {
      // 1. Get current selected parent block element
      let parentEl: HTMLElement | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        parentEl = range.commonAncestorContainer as HTMLElement;
        if (parentEl.nodeType !== 1) {
          parentEl = parentEl.parentNode as HTMLElement;
        }
      }

      // 2. Find closest block tag name
      let currentTag = 'p';
      let current = parentEl;
      while (current && current !== editorRef.current) {
        const tag = current.tagName?.toLowerCase();
        if (['h1', 'h2', 'blockquote', 'p'].includes(tag)) {
          currentTag = tag;
          break;
        }
        current = current.parentNode as HTMLElement;
      }

      // 3. Toggle format: if already target tag, revert to paragraph
      const targetTag = value.toLowerCase();
      if (currentTag === targetTag) {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, targetTag);
      }
    } else if (command === 'clearFormat') {
      // Clear inline formatting styles
      document.execCommand('removeFormat', false);
      // Revert block formatting back to paragraph
      document.execCommand('formatBlock', false, 'p');
    } else {
      document.execCommand(command, false, value);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setCategory(note.category);
    setContactId(note.contact_id);
  };

  const handleCreateNewNote = async () => {
    setLoading(true);
    try {
      const created = await api.createNote({
        title: 'Nueva Nota',
        content: '',
        category: 'wiki',
        contact_id: null
      });
      refreshData();
      handleSelectNote(created);
      showToast('Nota creada con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al crear nota', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNoteId) return;
    setLoading(true);
    const htmlContent = editorRef.current ? editorRef.current.innerHTML : '';
    try {
      await api.updateNote(selectedNoteId, {
        title: title || 'Sin título',
        content: htmlContent,
        category,
        contact_id: contactId || null
      });
      refreshData();
      showToast('Nota guardada correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar nota', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const confirmed = await showConfirm(
      '¿Eliminar esta nota?',
      'Esta acción no se puede deshacer.'
    );
    if (confirmed) {
      setLoading(true);
      try {
        await api.deleteNote(id);
        if (selectedNoteId === id) {
          setSelectedNoteId(null);
          setTitle('');
        }
        refreshData();
        showToast('Nota eliminada', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar la nota', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(q) ||
      stripHtml(note.content).toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* 1. LEFT PANEL: NOTE LIST & SEARCH */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: 'var(--accent)' }} /> Notas y Wiki
          </h2>
          <button onClick={handleCreateNewNote} className="btn-primary" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }} title="Nueva Nota">
            <Plus size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-dark)' }} />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px' }}
          />
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {([
            { id: 'all', label: 'Todo' },
            { id: 'wiki', label: 'Wiki' },
            { id: 'general', label: 'General' },
            { id: 'personal', label: 'Personal' }
          ] as const).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                border: 'none',
                cursor: 'pointer',
                background: selectedCategory === cat.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: selectedCategory === cat.id ? 'var(--on-primary, #ffffff)' : 'var(--text-muted)',
                fontWeight: 600,
                transition: 'var(--transition-smooth)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notes Scroll list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
              No se encontraron notas.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const textSnippet = note.content ? stripHtml(note.content).substring(0, 60) + '...' : 'Sin contenido';
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--panel-border)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '80%' }}>
                      {note.title || 'Sin título'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dark)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{textSnippet}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--accent)', fontWeight: 700 }}>
                      {note.category}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>
                      {new Date(note.updated_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: EDITOR / VISOR */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
        {selectedNoteId ? (
          <>
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la nota..."
                  style={{ fontSize: '18px', fontWeight: 700, border: 'none', background: 'transparent', padding: '4px 0', width: '100%', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={handleSaveNote} className="btn-primary" disabled={loading} style={{ padding: '8px 16px', fontSize: '12px' }}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Note Details Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', flexShrink: 0, background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              {/* Category */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría:</span>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                >
                  <option value="wiki">Wiki / Documentación</option>
                  <option value="general">Nota General</option>
                  <option value="personal">Personal / Privada</option>
                </select>
              </div>

              {/* Linked contact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente CRM:</span>
                <select 
                  value={contactId || ''} 
                  onChange={(e) => setContactId(e.target.value || null)}
                  style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', flex: 1 }}
                >
                  <option value="">-- Sin vincular --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company || 'Independiente'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Editor WYSIWYG Container */}
            <div className="notes-editor-container">
              {/* WYSIWYG Formatting Toolbar */}
              <div className="notes-toolbar">
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('bold')}
                  title="Negrita"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('italic')}
                  title="Cursiva"
                >
                  <Italic size={14} />
                </button>
                
                <div style={{ width: '1px', height: '18px', background: 'var(--panel-border)', margin: '0 4px' }} />
                
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('formatBlock', 'h1')}
                  title="Título Grande"
                >
                  <Heading1 size={14} />
                </button>
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('formatBlock', 'h2')}
                  title="Título Mediano"
                >
                  <Heading2 size={14} />
                </button>

                <div style={{ width: '1px', height: '18px', background: 'var(--panel-border)', margin: '0 4px' }} />

                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('insertUnorderedList')}
                  title="Lista"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('formatBlock', 'blockquote')}
                  title="Cita"
                >
                  <Quote size={14} />
                </button>

                <div style={{ width: '1px', height: '18px', background: 'var(--panel-border)', margin: '0 4px' }} />

                <button
                  type="button"
                  className="notes-toolbar-btn"
                  onClick={() => handleCommand('clearFormat')}
                  title="Limpiar Formato"
                >
                  <RemoveFormatting size={14} />
                </button>
              </div>

              {/* Editable Area */}
              <div 
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="notes-editor-area"
                data-placeholder="Comienza a escribir tu nota aquí y dale formato visual..."
              />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', gap: '12px' }}>
            <FileText size={48} />
            <p style={{ fontSize: '14px' }}>Selecciona una nota de la izquierda para comenzar a editar o crea una nueva.</p>
          </div>
        )}
      </div>

    </div>
  );
};
export default NotesSpace;
