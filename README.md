# MetaFlow

> Workspace de productividad personal *local-first* y de alto rendimiento. Todo en uno, 100% tuyo, sin suscripciones recurrentes ni datos en la nube.

![MetaFlow Interface](docs/screenshot.png)

[![License](https://img.shields.io/badge/license-PolyForm_Noncommercial_1.0.0-orange.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vitejs.dev)
[![SQLite](https://img.shields.io/badge/SQLite-local-003b57?logo=sqlite)](https://sqlite.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com)

---

## 💡 El Problema y la Propuesta de Ingeniería

La mayoría de suites de productividad modernas (Notion, Todoist, ClickUp) operan bajo modelos centralizados en la nube que imponen muros de pago, exigen conectividad continua y recolectan datos privados sobre tus proyectos, hábitos y relaciones.

**MetaFlow** está concebido bajo el paradigma **local-first** y privacidad por diseño (*privacy-by-default*):
- **Cero Nube (Zero-Cloud):** La persistencia se gestiona en un motor SQLite local ultrarrápido (`better-sqlite3`), garantizando transacciones ACID inmediatas y acceso completo sin conexión.
- **Síntesis Procedural de Audio:** Los paisajes sonoros del Pomodoro (lluvia, océano, ruido blanco) se generan matemáticamente en el navegador con la **Web Audio API**. Cero archivos MP3 pesados, cero trackers de streaming y cero latencia.
- **Networking Intencional:** Un módulo enfocado en cuidar relaciones profesionales mediante alertas *Keep in Touch*, evitando que las conexiones clave se enfríen con el tiempo.
- **Estética Inmersiva:** Interfaz en modo oscuro con efectos *Glassmorphism*, 5 paletas de acento cromático y fondos personalizables con opacidad y desenfoque ajustable.

---

## ✨ Módulos de la Plataforma

| Módulo | Enfoque y Capacidades Clave |
| :--- | :--- |
| **📊 Dashboard Diario** | Resumen operativo del día: métricas de tiempo de enfoque, hasta 3 tareas fijadas como máxima prioridad y estado inmediato de hábitos. |
| **🎯 Metas & Proyectos** | Jerarquía relacional estructurada: `Goal → Project → Task` con estados, colores temáticos, barras de progreso y fechas límite. |
| **🔥 Tracker de Hábitos** | Matriz visual anual (estilo grafo de contribuciones de GitHub) con cálculo automático de rachas actuales y récords históricos. |
| **⏱️ Pomodoro Inmersivo** | Temporizador de concentración con anillo de progreso SVG, widget flotante accesible globalmente y generador procedural de ruido ambiental. |
| **📝 Notas & Wiki** | Editor enriquecido WYSIWYG (encabezados, citas, listas, negritas) categorizable por temas y vinculable a contactos. |
| **🤝 Contactos & Keep in Touch** | Directorio de conexiones profesionales para cuidar el networking. Alertas inteligentes para programar interacciones y evitar que los contactos clave se enfríen. |
| **📅 Calendario Unificado** | Agregador temporal que sincroniza tareas por fecha de entrega y eventos independientes con enlace a reuniones. |
| **🎨 Personalización & Ajustes** | 5 paletas de color (*Sapphire, Emerald, Amethyst, Ruby, Obsidian*), gestión local de avatar y soporte de fondos de pantalla personalizados. |

---

## ⌨️ Atajos de Teclado & Productividad

| Atajo | Acción |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Abrir la **Paleta de Comandos** global para saltar a cualquier vista o crear elementos al instante |
| <kbd>Esc</kbd> | Cerrar modales, menús contextuales y la paleta de comandos |

---

## 🚀 Arquitectura y Tecnologías

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript 6, Vite 8 | Renderizado reactivo de última generación y compilación instantánea con HMR. |
| **Backend** | Express 5, TypeScript, Node.js | API REST modular, ligera y desacoplada para operaciones locales. |
| **Base de Datos** | Better-SQLite3 | Motor embebido con migrador interno *self-healing* para evolución automática de tablas. |
| **Generación de Sonido** | Web Audio API | Generación procedural matemática de ondas y ruido blanco sin dependencias externas. |
| **Linter Frontend** | Oxlint | Análisis estático ultrarrápido basado en Rust para garantizar calidad de código. |
| **Iconografía** | Lucide React | Paquete completo de iconos vectoriales optimizados para React. |

---

## 🛠️ Inicio Rápido (Quickstart)

### Requisitos
- **Node.js**: v18 o superior
- **npm**: v9 o superior

### Instalación en 6 Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/DavidAlbarracin/MetaFlow.git
cd MetaFlow

# 2. Instalar dependencias de frontend y backend
npm run install:all

# 3. Configurar variables de entorno iniciales
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Iniciar servidores en modo desarrollo
npm run dev
```

La aplicación estará activa en **[http://localhost:5173](http://localhost:5173)** consumiendo la API local en `http://localhost:5000`.

---

## ⚙️ Variables de Entorno

| Variable | Archivo | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `PORT` | `backend/.env` | `5000` | Puerto en el que escucha el servidor Express |
| `CORS_ORIGIN` | `backend/.env` | `http://localhost:5173` | Origen autorizado para peticiones CORS |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:5000/api` | Endpoint base para las llamadas REST del cliente |
| `VITE_API_HOST` | `frontend/.env` | `http://localhost:5000` | URL del host para servir multimedia local (uploads) |

---

## 📁 Estructura del Repositorio

```text
MetaFlow/
├── backend/
│   ├── src/
│   │   ├── index.ts        # Servidor Express, middlewares y endpoints REST
│   │   └── db.ts           # Inicialización SQLite con migraciones self-healing
│   ├── uploads/            # Almacén local de avatares y fondos (ignorado en Git)
│   ├── wallpapers/         # Colección de fondos preinstalados
│   ├── package.json        # Dependencias y scripts del backend
│   └── .env.example        # Plantilla de configuración
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Gestión del estado global y enrutador de vistas
│   │   ├── api.ts          # Cliente HTTP tipado para consumo de la API
│   │   ├── index.css       # Sistema de diseño con variables CSS y temas
│   │   └── components/     # Vistas modulares (Dashboard, Goals, Habits, Notes, etc.)
│   ├── public/             # Favicons y recursos vectoriales estáticos
│   ├── package.json        # Dependencias y scripts de Vite
│   └── .env.example        # Plantilla de configuración del cliente
├── docs/                   # Capturas e ilustraciones para documentación
└── package.json            # Scripts concurrentes raíz (dev, install:all)
```

---

## 🔒 Seguridad y Privacidad

MetaFlow no recopila información ni almacena datos fuera de tu dispositivo. Para más detalles sobre el modelo de aislamiento y reporte responsable, consulta [SECURITY.md](SECURITY.md).

---

## 🤝 Contribución

¿Quieres sugerir una mejora o colaborar con el código? Revisa nuestra guía completa en [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Licencia

Este proyecto está bajo la licencia **PolyForm Noncommercial License 1.0.0**. Para fines no comerciales, su uso y modificación son libres. Consulta el archivo [LICENSE](LICENSE) para más detalles.
