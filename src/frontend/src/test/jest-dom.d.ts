// Registra los matchers de @testing-library/jest-dom para el type-check de tsc.
// El tsconfig fija "types": ["vite/client", "node"], así que los tipos ambiente
// de jest-dom no se cargan solos; esta referencia los incorpora solo a los tests.
import "@testing-library/jest-dom/vitest";
