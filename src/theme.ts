import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  // Force dark as the default colour scheme (MUI v9 CSS-vars API)
  defaultColorScheme: 'dark',

  colorSchemes: {
    dark: {
      palette: {
        background: {
          default: '#0a1628',
          paper: '#0f2040',
        },
        primary: {
          main: '#00a651',
          light: '#33b872',
          dark: '#007a3d',
        },
        secondary: {
          main: '#f5a623',
          light: '#f7c05f',
        },
        error: {
          main: '#d32f2f',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b0bec5',
        },
        divider: 'rgba(255,255,255,0.12)',
      },
    },
  },

  typography: {
    h1: {
      fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif",
      fontWeight: 700,
    },
    h2: {
      fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif",
      fontWeight: 700,
    },
    h3: {
      fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif",
      fontWeight: 700,
    },
    h4: {
      fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif",
      fontWeight: 700,
    },
    h5: {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 600,
    },
    body1: {
      fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
      fontWeight: 400,
    },
    body2: {
      fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
      fontWeight: 400,
    },
    caption: {
      fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
      fontWeight: 400,
    },
  },

  components: {
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          // background and border use static values; CSS variable tokens are
          // not available at theme-build time in styleOverrides for background.paper,
          // so we reference the raw colour directly.
          background: '#0f2040',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },

    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          background: '#0a1628',
          borderTop: '1px solid rgba(255,255,255,0.12)',
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        // Boost filled-variant contrast so severity colours are legible on dark bg.
        // MUI v9 uses slot names 'root', 'filled', 'colorSuccess', etc.
        // We target the filled variant + each colour via compound CSS selectors.
        root: {
          '&.MuiAlert-filled.MuiAlert-colorSuccess': {
            backgroundColor: '#1b5e20',
            color: '#ffffff',
          },
          '&.MuiAlert-filled.MuiAlert-colorInfo': {
            backgroundColor: '#01579b',
            color: '#ffffff',
          },
          '&.MuiAlert-filled.MuiAlert-colorWarning': {
            backgroundColor: '#e65100',
            color: '#ffffff',
          },
          '&.MuiAlert-filled.MuiAlert-colorError': {
            backgroundColor: '#b71c1c',
            color: '#ffffff',
          },
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        // Contained buttons already default to primary.main (green) via MUI palette.
        // Text buttons: override colour to white for legibility on dark backgrounds.
        text: {
          color: '#ffffff',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.04)',
          },
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `,
    },
  },
})

export default theme
