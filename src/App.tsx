import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { paths, routes } from '@/app/paths'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { BoardEditorRoute } from '@/features/boards/components/BoardEditorRoute'
import { BoardUseRoute } from '@/features/boards/components/BoardUseRoute'
import { BoardsPage } from '@/features/boards/components/BoardsPage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'

// A data router is required by `useBlocker` (unsaved-changes guard of the board editor).
const router = createBrowserRouter([
  { path: routes.login, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: routes.patients, element: <PatientsPage /> },
      { path: routes.boards, element: <BoardsPage /> },
      { path: routes.boardEditor, element: <BoardEditorRoute /> },
      { path: routes.boardUse, element: <BoardUseRoute /> },
    ],
  },
  { path: '*', element: <Navigate to={paths.patients()} replace /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
