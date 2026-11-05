// Único punto de entrada de la biblioteca de navegación: el resto del código
// importa desde acá y nunca directo de react-router (lo impide la regla de oxlint).
// Para sumar un hook o componente, agregalo con el mismo nombre que en la
// biblioteca; para cambiar de biblioteca, solo cambia este archivo.

// Hooks
export {
  useLocation,
  useMatches,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

// Componentes y utilidades de rutas
export {
  generatePath,
  Link,
  Navigate,
  NavLink,
  Outlet,
  parsePath,
  type LinkProps,
} from 'react-router-dom'

// Configuración del router (AppRouter) y routers en memoria para los tests
export {
  createBrowserRouter,
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  type RouterProviderProps,
} from 'react-router-dom'
