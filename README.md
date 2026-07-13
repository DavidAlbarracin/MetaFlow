# MetaFlow

> Tu workspace de productividad personal. Todo en uno, todo tuyo, sin suscripciones.

![MetaFlow Screenshot](docs/screenshot.png)

[![License](https://img.shields.io/badge/license-PolyForm_Noncommercial_1.0.0-orange.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vitejs.dev)
[![SQLite](https://img.shields.io/badge/SQLite-local-003b57?logo=sqlite)](https://sqlite.org)

MetaFlow es una aplicación de productividad personal que corre **completamente en tu máquina**. Sin cuentas en la nube, sin datos enviados a terceros, sin límites de uso. Combina gestión de metas, tareas, hábitos, notas, contactos y temporizador Pomodoro en una interfaz glassmorphism oscura.

---

## Características

- **Dashboard diario** con estadísticas de enfoque, tareas y hábitos. Hasta 3 tareas fijadas como prioridad del día.
- **Metas y Proyectos** organizados jerárquicamente: Goal → Proyecto → Tarea, con estados, colores y fechas límite.
- **Tracker de Hábitos** con grid anual estilo GitHub, rachas y registro semanal.
- **Pomodoro inmersivo** con anillo de progreso, sonidos ambientales generados proceduralmente (lluvia, océano, ruido blanco) y widget flotante accesible desde cualquier vista.
- **Notas y Wiki** con editor WYSIWYG (negrita, cursiva, encabezados, listas, citas).
- **CRM Personal** para gestionar contactos profesionales con historial de interacciones y recordatorios automáticos de reconexión ("Keep in Touch").
- **Calendario** con tareas por fecha límite y eventos propios con hora y enlace de reunión.
- **5 paletas de color** (Sapphire, Emerald, Amethyst, Ruby, Obsidian) y fondo personalizable con imagen, opacidad y desenfoque.
- **Paleta de comandos** (`Ctrl+K`) para navegar y crear contenido rápidamente.
- **100% local** — SQLite embebido, sin servidores externos ni cuentas.

---

## Inicio rápido

```bash
git clone https://github.com/DavidAlbarracin/MetaFlow.git
cd MetaFlow
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

Abre http://localhost:5173 en tu navegador.

---

## Instalación detallada

### Requisitos

- Node.js 18+
- npm 9+

### Variables de entorno

**`backend/.env`**
```env
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
VITE_API_HOST=http://localhost:5000
```

Los archivos `.env.example` incluidos en el repo ya tienen estos valores por defecto. Solo necesitas copiarlos si quieres modificar algo.

### Comandos disponibles

```bash
npm run dev          # Arranca backend y frontend a la vez
npm run backend      # Solo servidor Express (puerto 5000)
npm run frontend     # Solo Vite dev server (puerto 5173)
npm run install:all  # Instala dependencias de ambos proyectos
```

---

## Módulos

| Vista | Descripción |
|-------|-------------|
| Dashboard | Resumen diario con estadísticas, tareas prioritarias y hábitos del día |
| Metas y Proyectos | Jerarquía Goals → Projects → Tasks con estados y colores |
| Calendario | Tareas por fecha + eventos propios con hora y enlace de reunión |
| Hábitos | Grid anual, rachas actuales y máxima histórica |
| Pomodoro | Timer full-page con sonidos ambientales + widget flotante persistente |
| Notas y Wiki | Editor WYSIWYG por categorías, vinculable a contactos CRM |
| CRM Personal | Directorio de clientes, historial de interacciones y recordatorios Keep in Touch |
| Ajustes | Avatar, fondo personalizado, bio y paleta de colores |

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Backend | Express 5, TypeScript, better-sqlite3 |
| Base de datos | SQLite (local, sin configuración) |
| Iconos | Lucide React |
| Audio | Web Audio API (procedural, sin archivos externos) |

---

## Estructura del proyecto

```
MetaFlow/
├── backend/
│   ├── src/
│   │   ├── index.ts        # Servidor Express + endpoints REST
│   │   └── db.ts           # SQLite + migraciones self-healing
│   ├── uploads/            # Avatares y fondos (git-ignorado)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Estado global + router de vistas
│   │   ├── api.ts          # Cliente HTTP + tipos TypeScript
│   │   ├── index.css       # Sistema de diseño y temas
│   │   └── components/     # Una carpeta por vista + utilidades
│   └── .env.example
└── package.json            # Scripts raíz
```

---

## Contribuir

Las contribuciones son bienvenidas. Para cambios grandes, abre primero un issue para discutir lo que quieres modificar.

1. Haz fork del repositorio
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Licencia

PolyForm Noncommercial License 1.0.0 — ver [LICENSE](LICENSE) para más detalles.
