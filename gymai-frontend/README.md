# GymAI - Frontend

Single Page Application (SPA) multimodal y hands-free para asistencia de entrenamiento fitness, diseñada bajo los principios de Interacción Humano-Computador (IHC). Optimizada para dispositivos móviles y escritorio.

El sistema elimina la fricción táctil en el gimnasio mediante una interfaz completamente controlable por voz y un mapa anatómico interactivo.

---

## Stack Tecnológico

- **React (Vite):** Framework principal para la gestión reactiva del estado y renderizado eficiente.
- **Web Speech API:** Reconocimiento de comandos por voz (STT) y síntesis de voz (TTS) nativa del navegador.
- **CSS3 Avanzado:** Diseño responsivo Mobile-First con estética Glassmorphism de alto contraste.

---

## Instalación y Ejecución Local

### Requisitos Previos

- Node.js v18 o superior
- npm

### 1. Clonar el repositorio

```bash
https://github.com/GermainR24/Entrenador_Fitnes_IA.git
cd Entrenador_Fitnes_IA
cd gymai-frontend
```

```bash
cd Entrenador_Fitnes_IA
```

```bash
cd gymai-frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |

---

## Estructura del Frontend

```
gymai-frontend/
├── electron/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── screens/
│   └── main.jsx
├── capacitor.config.json
├── index.html
└── package.json
```