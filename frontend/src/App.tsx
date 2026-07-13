import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ToastContainer, showToast } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { GoalsSpace } from './components/GoalsSpace';
import { CalendarSpace } from './components/CalendarSpace';
import { HabitsSpace } from './components/HabitsSpace';
import { SettingsSpace } from './components/SettingsSpace';
import { PomodoroWidget } from './components/PomodoroWidget';
import { CommandPalette } from './components/CommandPalette';
import { PomodoroSpace } from './components/PomodoroSpace';
import { NotesSpace } from './components/NotesSpace';
import { CRMSpace } from './components/CRMSpace';
import { api } from './api';
import type { UserProfile, Goal, Project, Task, Habit, HabitLog, FocusSession, Note, CRMContact, CRMInteraction, CalendarEvent } from './api';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared Pomodoro state
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false);
  const [pomodoroTaskId, setPomodoroTaskId] = useState('');
  const [pomodoroSound, setPomodoroSound] = useState(true);

  const durations = {
    focus: 25,
    short: 5,
    long: 15
  };

  const pomodoroModeRef = useRef(pomodoroMode);
  const pomodoroTaskIdRef = useRef(pomodoroTaskId);

  useEffect(() => {
    pomodoroModeRef.current = pomodoroMode;
  }, [pomodoroMode]);

  useEffect(() => {
    pomodoroTaskIdRef.current = pomodoroTaskId;
  }, [pomodoroTaskId]);

  const playAlarmSound = () => {
    if (!pomodoroSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.2);
        osc.start(ctx.currentTime + i * 0.3);
        osc.stop(ctx.currentTime + i * 0.3 + 0.2);
      }
    } catch (e) {
      console.error('AudioContext alarm sound synthesizing blocked:', e);
    }
  };

  const handleTimerComplete = async () => {
    setPomodoroIsRunning(false);
    playAlarmSound();

    const currentMode = pomodoroModeRef.current;
    const currentTaskId = pomodoroTaskIdRef.current;

    if (currentMode === 'focus') {
      showToast('¡Buen trabajo! Sesión de enfoque completada.', 'success');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('MetaFlow Pomodoro', {
          body: '¡Buen trabajo! Sesión de enfoque completada.',
          icon: '/favicon.ico'
        });
      }
      try {
        await api.createFocusSession({
          task_id: currentTaskId || null,
          duration_minutes: durations.focus
        });
        refreshData();
      } catch (err) {
        console.error('Error logging focus session:', err);
      }
      switchMode('short');
    } else {
      showToast('El descanso ha terminado. ¡A enfocar!', 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('MetaFlow Pomodoro', {
          body: 'El descanso ha terminado. ¡A enfocar!',
          icon: '/favicon.ico'
        });
      }
      switchMode('focus');
    }
  };

  const switchMode = (newMode: 'focus' | 'short' | 'long') => {
    setPomodoroIsRunning(false);
    setPomodoroMode(newMode);
    setPomodoroTimeLeft(durations[newMode] * 60);
  };

  const handleStartPause = () => {
    setPomodoroIsRunning(!pomodoroIsRunning);
  };

  const handleReset = () => {
    setPomodoroIsRunning(false);
    setPomodoroTimeLeft(durations[pomodoroMode] * 60);
  };

  // Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (pomodoroIsRunning) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroIsRunning]);

  // Request Notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch all database records
  const refreshData = async () => {
    try {
      const [profData, goalsData, projData, tasksData, habitsData, logsData, focusData, notesData, contactsData, interactionsData, eventsData] = await Promise.all([
        api.getProfile(),
        api.getGoals(),
        api.getProjects(),
        api.getTasks(),
        api.getHabits(),
        api.getHabitLogs(),
        api.getFocusSessions(),
        api.getNotes(),
        api.getCRMContacts(),
        api.getCRMInteractions(),
        api.getEvents()
      ]);

      setProfile(profData);
      setGoals(goalsData);
      setProjects(projData);
      setTasks(tasksData);
      setHabits(habitsData);
      setHabitLogs(logsData);
      setFocusSessions(focusData);
      setNotes(notesData);
      setContacts(contactsData);
      setInteractions(interactionsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Update theme and styling parameters on profile changes
  useEffect(() => {
    if (profile) {
      document.documentElement.setAttribute('data-theme', profile.theme_palette);
    }
  }, [profile]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.05)',
          borderTopColor: '#3b82f6',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>Cargando MetaFlow...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Active page router
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            profile={profile}
            tasks={tasks}
            habits={habits}
            habitLogs={habitLogs}
            focusSessions={focusSessions}
            refreshData={refreshData}
            pomodoroMode={pomodoroMode}
            pomodoroTimeLeft={pomodoroTimeLeft}
            pomodoroIsRunning={pomodoroIsRunning}
            pomodoroTaskId={pomodoroTaskId}
            setPomodoroTaskId={setPomodoroTaskId}
            pomodoroSound={pomodoroSound}
            setPomodoroSound={setPomodoroSound}
            switchPomodoroMode={switchMode}
            handleStartPause={handleStartPause}
            handleReset={handleReset}
            contacts={contacts}
            notes={notes}
          />
        );
      case 'goals':
        return (
          <GoalsSpace 
            goals={goals}
            projects={projects}
            tasks={tasks}
            refreshData={refreshData}
            contacts={contacts}
          />
        );
      case 'calendar':
        return (
          <CalendarSpace 
            tasks={tasks}
            events={events}
            refreshData={refreshData}
          />
        );
      case 'habits':
        return (
          <HabitsSpace 
            habits={habits}
            habitLogs={habitLogs}
            refreshData={refreshData}
          />
        );
      case 'pomodoro':
        return (
          <PomodoroSpace
            tasks={tasks}
            focusSessions={focusSessions}
            mode={pomodoroMode}
            timeLeft={pomodoroTimeLeft}
            isRunning={pomodoroIsRunning}
            selectedTaskId={pomodoroTaskId}
            setSelectedTaskId={setPomodoroTaskId}
            soundEnabled={pomodoroSound}
            setSoundEnabled={setPomodoroSound}
            switchMode={switchMode}
            handleStartPause={handleStartPause}
            handleReset={handleReset}
          />
        );
      case 'notes':
        return (
          <NotesSpace
            notes={notes}
            contacts={contacts}
            refreshData={refreshData}
          />
        );
      case 'crm':
        return (
          <CRMSpace
            contacts={contacts}
            interactions={interactions}
            projects={projects}
            notes={notes}
            refreshData={refreshData}
          />
        );
      case 'settings':
        return (
          <SettingsSpace 
            profile={profile}
            onProfileUpdate={setProfile}
          />
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
  const bgImageStyle: React.CSSProperties = profile?.bg_image_path
    ? {
        backgroundImage: `url(${apiHost}${profile.bg_image_path})`,
        opacity: profile.bg_opacity,
        filter: `blur(${profile.bg_blur}px)`
      }
    : { display: 'none' };

  return (
    <>
      <ToastContainer />
      <ConfirmDialog />
      {/* Dynamic Background Customization Layers */}
      <div className="app-bg-image" style={bgImageStyle} />
      <div className="app-bg-overlay" />

      {/* Main Workspace Layout */}
      <div className="app-container">
        
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          profile={profile} 
        />

        {/* Dynamic Section Contents */}
        <main className="main-content">
          {renderActiveView()}
        </main>

        {/* Floating Focus Sessions Widget */}
        <PomodoroWidget
          tasks={tasks}
          mode={pomodoroMode}
          timeLeft={pomodoroTimeLeft}
          isRunning={pomodoroIsRunning}
          selectedTaskId={pomodoroTaskId}
          setSelectedTaskId={setPomodoroTaskId}
          soundEnabled={pomodoroSound}
          setSoundEnabled={setPomodoroSound}
          switchMode={switchMode}
          handleStartPause={handleStartPause}
          handleReset={handleReset}
        />

        {/* Keyboard Command Palette (Ctrl+K) */}
        <CommandPalette 
          goals={goals}
          projects={projects}
          tasks={tasks}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          refreshData={refreshData}
        />

      </div>
    </>
  );
}

export default App;
