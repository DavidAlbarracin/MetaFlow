# Guía de Contribución

¡Gracias por tu interés en colaborar con **MetaFlow**! Buscamos mantener un código limpio, estructurado y enfocado en la mejor experiencia de usuario en aplicaciones *local-first*.

---

## 🛠️ Flujo de Trabajo (Git Workflow)

1. Haz un **Fork** del repositorio.
2. Crea una rama semántica para tu trabajo:
   ```bash
   git checkout -b feature/nueva-vista
   # o para resolución de errores:
   git checkout -b fix/error-pomodoro
   ```

---

## 📝 Convención de Commits

Utilizamos el estándar de **Conventional Commits**:

- `feat:` Nuevas características (ej. nueva paleta de color, widget interactivo).
- `fix:` Corrección de fallos en frontend o backend.
- `docs:` Mejoras en documentación o diagramas.
- `style:` Cambios visuales, márgenes, tipografías o CSS Glassmorphism.
- `refactor:` Optimización de código sin alterar comportamiento externo.
- `chore:` Actualización de dependencias o scripts.

*Ejemplo:* `feat(habits): agregar calculo de racha maxima historica`

---

## 💻 Configuración Local y Validación

MetaFlow funciona como un monorepo modular con backend en Express y frontend en Vite:

```bash
# 1. Instalar todas las dependencias
npm run install:all

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Arrancar ambos servicios en simultáneo
npm run dev
```

### Verificación de Calidad

Antes de proponer un Pull Request, valida que no haya errores de tipado o de análisis estático:

```bash
# Chequeo de tipos en el frontend
npm run build --prefix frontend

# Análisis estático ultrarrápido con Oxlint
npm run lint --prefix frontend

# Chequeo de compilación en el backend
npm run build --prefix backend
```

---

## 🚀 Envío de Pull Requests

1. Haz push a tu fork:
   ```bash
   git push origin feature/nueva-vista
   ```
2. Abre un **Pull Request** hacia la rama `main`.
3. Detalla:
   - Motivo y descripción del cambio.
   - Capturas o GIFs demostrativos si modificas la interfaz gráfica o temas.
   - Confirmación de que las pruebas manuales y los linters pasaron exitosamente.
