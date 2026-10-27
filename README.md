# TeamHub (React)

React + Vite version of the TeamHub demo.

## Run it in VS Code

1. Open this folder in VS Code.
2. Open a terminal (``Terminal > New Terminal``) and run:
   ```
   npm install
   npm run dev
   ```
3. Open the local URL Vite prints (usually `http://localhost:5173`).

## Structure

- `index.html` — page shell, loads the fonts and mounts React
- `src/main.jsx` — React entry point
- `src/App.jsx` — all app logic and views (login, employees, announcements, meetings)
- `src/index.css` — styling

## Demo login

- **Admin:** `admin` / `admin123`
- **Employee:** username is the part of their email before `@` (e.g. `shoaib`), password `password123`

Data is kept in the browser's `localStorage`, not a real backend.
