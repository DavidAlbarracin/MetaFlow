# Política de Seguridad

**MetaFlow** está diseñado bajo los principios de **soberanía total del usuario y arquitectura *local-first***. Toda tu información personal, metas, tareas y notas pertenecen exclusivamente a tu máquina local.

---

## 🔒 Modelo de Seguridad y Privacidad

1. **Zero-Cloud & Almacenamiento Local:**
   - La base de datos es un archivo SQLite local (`metaflow.db` administrado por `better-sqlite3`).
   - MetaFlow **no implementa telemetría**, rastreadores ni llamadas a servidores remotos.
   - Las imágenes de perfil y fondos personalizados se guardan exclusivamente en el directorio local del host (`backend/uploads/`), el cual está excluido del control de versiones.

2. **Privacidad Multimedia y Audio Procedural:**
   - El reproductor de sonidos ambientales del Pomodoro (lluvia, oleaje marino, ruido blanco) utiliza algoritmos matemáticos en tiempo real generados con la **Web Audio API** del navegador. No descarga archivos de audio externos, eliminando fugas de red y consumo innecesario de ancho de banda.

3. **Restricción de Red (CORS):**
   - El backend en Express restringe las peticiones entrantes a través de una política CORS explícita (`CORS_ORIGIN`), configurada por defecto únicamente para el host local de Vite (`http://localhost:5173`).

---

## 🛡️ Versiones Soportadas

| Versión | Soportada | Rama |
| :--- | :---: | :--- |
| `1.0.x` | :white_check_mark: | `main` |

---

## 🚨 Reporte Responsable de Vulnerabilidades

Si detectas un problema de seguridad, vulnerabilidad en dependencias o riesgo en el manejo de datos locales:

1. **Vía GitHub Security Advisories (Recomendado):**
   - Accede a la sección **Security** del repositorio en GitHub.
   - Selecciona **Report a vulnerability** para iniciar una divulgación coordinada y confidencial.

2. **Vía GitHub Issues:**
   - Para incidencias menores que no comprometan datos sensibles, abre un [Issue](https://github.com/DavidAlbarracin/MetaFlow/issues) utilizando la etiqueta `security`.

Apreciamos el reporte responsable para mantener el ecosistema libre de riesgos.
