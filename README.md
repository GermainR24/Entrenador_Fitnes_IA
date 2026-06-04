# **Entrenador_Fitnes_IA**

# GymAI Backend - Guía de Ejecución

Este directorio contiene el código fuente del backend de GymAI, desarrollado con **FastAPI** y **PostgreSQL**. Esta API es responsable de gestionar los perfiles de usuario, adaptar dinámicamente las rutinas mediante IA y controlar el sistema de gamificación.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
* Python 3.10 o superior

---

## Pasos para levantar el entorno de desarrollo

### 1. Navegar al directorio del backend
Todo el ecosistema de Python debe ejecutarse desde su propia raíz para evitar conflictos de rutas.
```bash
cd gymai-backend

```

### 2. Activar el Entorno Virtual (venv)

El entorno virtual aísla las librerías de este proyecto de las dependencias globales de tu computadora.

* **En Linux/macOS:**
    ```bash
    source venv/bin/activate
    ```


* **En Windows:**
    ```bash
    venv\Scripts\activate
    ```



### 3. Instalar las dependencias

Este comando lee el archivo de requerimientos y descarga las versiones exactas de FastAPI, Uvicorn, Pydantic y SQLAlchemy que necesita el proyecto para funcionar.

```bash
pip install -r requirements.txt
```

### 4. Configurar las Variables de Entorno

El sistema requiere credenciales para conectarse a la base de datos. Pydantic bloqueará el arranque si esta información no está presente.

```
cp .env.example .env
```


### 5. Ejecutar el Servidor local

Para iniciar la aplicación usamos Uvicorn. El parámetro `app.main:app` le indica a Python que busque el paquete `app`, abra el archivo `main.py` y ejecute la instancia llamada `app`. La bandera `--reload` reiniciará automáticamente el servidor cada vez que guardes un cambio en el código.

```bash
uvicorn app.main:app --reload
```

### 6. Probar la API (Swagger UI)

FastAPI genera documentación interactiva automáticamente basada en tus endpoints y esquemas (OpenAPI). Una vez que el servidor esté corriendo, abre tu navegador y visita:

**[http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)**

Desde esta interfaz podrás ver todas las rutas disponibles, probar envíos de datos (POST) y revisar las respuestas del servidor sin necesidad de usar herramientas externas como Postman.

--- 

# GymAI Frontend - Guía de Ejecución

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
