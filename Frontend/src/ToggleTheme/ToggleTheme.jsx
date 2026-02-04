import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#024990',
    },
    secondary: {
      main: '#22fbff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e1e1e',
    },
  },
});


export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#91eff1',
    },
    secondary: {
      main: '#FF7622',
    },
    background: {
      default: '#0f2027',
      paper: '#1e2a32',
    },
    text: {
      primary: '#ffffff',
    },
  },
});

