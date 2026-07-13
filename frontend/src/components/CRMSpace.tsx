import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Mail, Phone, Building, Briefcase, FileText, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { api } from '../api';
import type { CRMContact, CRMInteraction, Project, Note } from '../api';
import { showToast } from './ToastContainer';
import { showConfirm } from './ConfirmDialog';

interface CRMSpaceProps {
  contacts: CRMContact[];
  interactions: CRMInteraction[];
  projects: Project[];
  notes: Note[];
  refreshData: () => void;
}

export const CRMSpace: React.FC<CRMSpaceProps> = ({
  contacts,
  interactions,
  projects,
  notes,
  refreshData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'reminders'>('contacts');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  
  // Modals / Form visibility states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactInterval, setContactInterval] = useState(30);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Interaction Form State
  const [interType, setInterType] = useState<CRMInteraction['type']>('email');
  const [interSummary, setInterSummary] = useState('');
  const [interDate, setInterDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // Helper: compute days since last interaction
  const getDaysSinceLastInteraction = (contact: CRMContact) => {
    if (!contact.last_interaction_date) return null;
    const lastDate = new Date(contact.last_interaction_date);
    const today = new Date();
    // Set hours to 0 to compare days
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Contacts handlers
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    setLoading(true);
    const payload = {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      company: contactCompany,
      keep_in_touch_interval: Number(contactInterval)
    };

    try {
      if (editingContactId) {
        await api.updateCRMContact(editingContactId, payload);
        showToast('Contacto actualizado', 'success');
      } else {
        await api.createCRMContact(payload);
        showToast('Contacto creado con éxito', 'success');
      }
      refreshData();
      closeContactModal();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar contacto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      '¿Eliminar este cliente?',
      'Se borrarán sus datos y se desvincularán proyectos y notas asociados.'
    );
    if (confirmed) {
      try {
        await api.deleteCRMContact(id);
        if (selectedContactId === id) setSelectedContactId(null);
        refreshData();
        showToast('Contacto eliminado', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar contacto', 'error');
      }
    }
  };

  const openContactEdit = (contact: CRMContact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactEmail(contact.email);
    setContactPhone(contact.phone);
    setContactCompany(contact.company);
    setContactInterval(contact.keep_in_touch_interval);
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setEditingContactId(null);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactCompany('');
    setContactInterval(30);
    setShowContactModal(false);
  };

  // Interaction logger
  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) return;
    setLoading(true);
    try {
      await api.createCRMInteraction({
        contact_id: selectedContactId,
        type: interType,
        summary: interSummary,
        date: interDate
      });
      setInterSummary('');
      setShowInteractionForm(false);
      refreshData();
      showToast('Interacción registrada con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al registrar interacción', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    const confirmed = await showConfirm('¿Eliminar esta interacción de comunicación?');
    if (confirmed) {
      try {
        await api.deleteCRMInteraction(id);
        refreshData();
        showToast('Interacción eliminada', 'success');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Contacts that require reconnection (Keep in Touch)
  const contactsToReconnect = contacts.filter((c) => {
    const days = getDaysSinceLastInteraction(c);
    if (days === null) return true; // Never contacted
    return days >= c.keep_in_touch_interval;
  });

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedContactInteractions = interactions.filter(i => i.contact_id === selectedContactId);
  const selectedContactProjects = projects.filter(p => p.contact_id === selectedContactId);
  const selectedContactNotes = notes.filter(n => n.contact_id === selectedContactId);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HEADER & TAB CONTROL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Contactos y Conexiones</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Gestiona tu directorio de clientes y recordatorios automáticos de comunicación ("Keep in Touch").
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)' }}>
          {[
            { id: 'contacts', label: 'Directorio de Clientes' },
            { id: 'reminders', label: 'Keep in Touch' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={activeSubTab === tab.id ? 'btn-primary' : 'btn-secondary'}
              style={{ border: 'none', padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              {tab.label}
              {tab.id === 'reminders' && contactsToReconnect.length > 0 && (
                <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                  {contactsToReconnect.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================================================
         A. CONTACTS LIST & DETAIL VIEW
         ========================================================================== */}
      {activeSubTab === 'contacts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* Left panel: Contacts Grid */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Directorio Comercial</h3>
              <button onClick={() => setShowContactModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Plus size={16} /> Agregar Contacto
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {contacts.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dark)', fontSize: '13px' }}>
                  No hay contactos registrados aún.
                </div>
              ) : (
                contacts.map((contact) => {
                  const isSelected = contact.id === selectedContactId;
                  return (
                    <div 
                      key={contact.id} 
                      onClick={() => setSelectedContactId(contact.id)}
                      className="glass-card" 
                      style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--panel-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{contact.name}</h4>
                        {contact.company && (
                          <span style={{ fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={11} /> {contact.company}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {contact.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={11} /> {contact.email}</span>}
                          {contact.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} /> {contact.phone}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={(e) => openContactEdit(contact, e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={(e) => handleDeleteContact(contact.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Contact Smart Profile Detail */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '400px' }}>
            {selectedContact ? (
              <>
                {/* Profile Card Header */}
                <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedContact.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedContact.company ? `Empresa: ${selectedContact.company}` : 'Profesional Independiente'}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    {selectedContact.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {selectedContact.email}</span>}
                    {selectedContact.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {selectedContact.phone}</span>}
                  </div>
                </div>

                {/* Keep In Touch Status Indicator */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: selectedContact.last_interaction_date ? 'var(--accent)' : 'var(--text-dark)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      Último contacto: {selectedContact.last_interaction_date ? new Date(selectedContact.last_interaction_date).toLocaleDateString('es-ES') : 'Sin registro'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Frecuencia: cada {selectedContact.keep_in_touch_interval} días
                  </span>
                </div>

                {/* Tabular info of the Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                  
                  {/* Active Projects */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Briefcase size={12} /> Proyectos Relacionados ({selectedContactProjects.length})
                    </h4>
                    {selectedContactProjects.length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--text-dark)' }}>No hay proyectos vinculados.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedContactProjects.map(p => (
                          <div key={p.id} className="glass-card" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.title}</span>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: p.status === 'completed' ? '#34d399' : 'var(--accent)', fontWeight: 'bold' }}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes & Wiki */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} /> Notas y Documentos ({selectedContactNotes.length})
                    </h4>
                    {selectedContactNotes.length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--text-dark)' }}>No hay notas tomadas sobre este contacto.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedContactNotes.map(n => (
                          <div key={n.id} className="glass-card" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{n.title}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logged Interactions */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> Historial de Comunicaciones ({selectedContactInteractions.length})
                      </h4>
                      <button 
                        onClick={() => setShowInteractionForm(!showInteractionForm)}
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '10px' }}
                      >
                        {showInteractionForm ? 'Cancelar' : 'Registrar'}
                      </button>
                    </div>

                    {/* Inline interaction Form */}
                    {showInteractionForm && (
                      <form onSubmit={handleLogInteraction} style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vía de contacto</label>
                            <select value={interType} onChange={(e) => setInterType(e.target.value as any)} style={{ padding: '6px', fontSize: '11px' }}>
                              <option value="email">Correo Electrónico</option>
                              <option value="call">Llamada Telefónica</option>
                              <option value="meeting">Reunión / Videollamada</option>
                              <option value="message">Mensaje / Whatsapp</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fecha</label>
                            <input type="date" value={interDate} onChange={(e) => setInterDate(e.target.value)} style={{ padding: '6px', fontSize: '11px' }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Resumen / Notas</label>
                          <textarea 
                            value={interSummary} 
                            onChange={(e) => setInterSummary(e.target.value)} 
                            placeholder="Ej. Hablamos de la nueva propuesta..."
                            rows={2}
                            style={{ fontSize: '11px', padding: '6px' }}
                            required
                          />
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', alignSelf: 'flex-end' }}>
                          Guardar Historial
                        </button>
                      </form>
                    )}

                    {selectedContactInteractions.length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--text-dark)' }}>No se han registrado interacciones.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedContactInteractions.map(inter => (
                          <div key={inter.id} className="glass-card" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>{inter.type}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>{new Date(inter.date).toLocaleDateString('es-ES')}</span>
                                <button onClick={() => handleDeleteInteraction(inter.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }} title="Eliminar log">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-main)', margin: 0 }}>{inter.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', gap: '12px' }}>
                <Users size={48} />
                <p style={{ fontSize: '13px' }}>Selecciona un contacto comercial para visualizar su historial inteligente.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==========================================================================
         B. REMINDERS: KEEP IN TOUCH VIEW
         ========================================================================== */}
      {activeSubTab === 'reminders' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#fb923c' }} /> Recordatorios de Relación
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Los siguientes clientes han superado tu límite de contacto establecido. Mantén vivas tus relaciones de negocio.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {contactsToReconnect.length === 0 ? (
              <div style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', color: 'var(--text-dark)' }}>
                <CheckCircle size={32} style={{ color: '#34d399', marginBottom: '10px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>¡Excelente trabajo! Estás al día con todos tus contactos comerciales.</p>
              </div>
            ) : (
              contactsToReconnect.map((c) => {
                const days = getDaysSinceLastInteraction(c);
                return (
                  <div key={c.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{c.name}</h4>
                      {c.company && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.company}</span>}
                      
                      <div style={{ marginTop: '8px' }}>
                        {days === null ? (
                          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 'bold' }}>
                            ⚠️ Nunca has registrado un contacto
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 'bold' }}>
                            ⚠️ Sin hablar hace {days} días (Límite: {c.keep_in_touch_interval} días)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* mailto quick link */}
                      {c.email && (
                        <a 
                          href={`mailto:${c.email}?subject=MetaFlow - Saludos&body=Hola ${c.name}, espero que todo vaya bien.`}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '11px', textDecoration: 'none' }}
                          title="Enviar correo"
                        >
                          <Send size={13} /> Enviar Mail
                        </a>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedContactId(c.id);
                          setActiveSubTab('contacts');
                          setShowInteractionForm(true);
                        }}
                        className="btn-primary"
                        style={{ padding: '8px 12px', fontSize: '11px' }}
                      >
                        Registrar Contacto
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
         C. MODALS FOR FORMS
         ========================================================================== */}
      {/* Contact Creator/Editor Modal */}
      {showContactModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel fade-in" style={{ width: '90%', maxWidth: '450px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              {editingContactId ? 'Editar Contacto comercial' : 'Registrar Nuevo Contacto'}
            </h3>
            
            <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nombre Completo *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ej. Juan Pérez" required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Empresa / Organización</label>
                <input type="text" value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder="Ej. Acme Corp" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="juan@correo.com" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Teléfono</label>
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+34 600 000 000" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recordatorio de reconexión (días)</label>
                <input type="number" min="1" max="365" value={contactInterval} onChange={(e) => setContactInterval(Number(e.target.value))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={closeContactModal} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default CRMSpace;
