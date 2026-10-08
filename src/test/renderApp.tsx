import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { routes } from '@/app/paths'
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
import { LocationProbe } from './LocationProbe'

/**
 * Renders the real routes with a fresh QueryClient; `/login` is a stub. Uses a data router because
 * the board editor needs `useBlocker`.
 */
export function renderApp(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <LocationProbe />
            <Outlet />
          </>
        ),
        children: [
          { path: routes.login, element: <p>Login stub</p> },
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
    ],
    { initialEntries: [initialPath] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
