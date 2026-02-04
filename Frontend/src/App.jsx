import React from 'react';
import { ThemeModeProvider } from './ToggleTheme/ThemeContext';
import './App.css';
import AppLayout from './AppLayout/AppLayout';

function App() {
  return (
    <ThemeModeProvider>
        <AppLayout />
    </ThemeModeProvider>
  );
}

export default App;
