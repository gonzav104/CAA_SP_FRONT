import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { paths, routes } from '@/app/paths'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { BoardEditorRoute } from '@/features/boards/components/BoardEditorRoute'
import { BoardUseRoute } from '@/features/boards/components/BoardUseRoute'
import { BoardsPage } from '@/features/boards/components/BoardsPage'
import { CollaboratorsPage } from '@/features/collaborators/components/CollaboratorsPage'
import { CustomPictogramsPage } from '@/features/customPictograms/components/CustomPictogramsPage'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { PatientWorkspaceLayout } from '@/features/patients/components/PatientWorkspaceLayout'
import { PatientsPage } from '@/features/patients/components/PatientsPage'
import { EditSessionPage } from '@/features/sessions/components/EditSessionPage'
import { NewSessionPage } from '@/features/sessions/components/NewSessionPage'
import { SessionDetailPage } from '@/features/sessions/components/SessionDetailPage'
import { SessionsListPage } from '@/features/sessions/components/SessionsListPage'

// A data router is required by `useBlocker` (unsaved-changes guard of the board editor).
const router = createBrowserRouter([
  { path: routes.login, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: routes.dashboard, element: <DashboardPage /> },
      { path: routes.patients, element: <PatientsPage /> },
      {
        path: routes.patientSpace,
        element: <PatientWorkspaceLayout />,
        children: [
          { index: true, element: <Navigate to="cartillas" replace /> },
          { path: 'cartillas', element: <BoardsPage /> },
          { path: 'sesiones', element: <SessionsListPage /> },
          { path: 'sesiones/nueva', element: <NewSessionPage /> },
          { path: 'sesiones/:sesionId', element: <SessionDetailPage /> },
          { path: 'sesiones/:sesionId/editar', element: <EditSessionPage /> },
          { path: 'familia', element: <CollaboratorsPage /> },
          { path: 'pictogramas', element: <CustomPictogramsPage /> },
        ],
      },
      { path: routes.boardEditor, element: <BoardEditorRoute /> },
      { path: routes.boardUse, element: <BoardUseRoute /> },
    ],
  },
  { path: '*', element: <Navigate to={paths.dashboard()} replace /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
