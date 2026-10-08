import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { routes } from '@/app/paths'
import { BoardEditorRoute } from '@/features/boards/components/BoardEditorRoute'
import { BoardUseRoute } from '@/features/boards/components/BoardUseRoute'
import { BoardsPage } from '@/features/boards/components/BoardsPage'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'
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
          { path: routes.boards, element: <BoardsPage /> },
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
