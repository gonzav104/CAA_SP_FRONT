import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { routes } from '@/app/paths'
import { BoardEditorRoute } from '@/features/boards/components/BoardEditorRoute'
import { BoardUseRoute } from '@/features/boards/components/BoardUseRoute'
import { BoardsPage } from '@/features/boards/components/BoardsPage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'
import { LocationProbe } from './LocationProbe'

/** Renders the real read-only routes with a fresh QueryClient; `/login` is a stub. */
export function renderApp(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route path={routes.login} element={<p>Login stub</p>} />
          <Route path={routes.patients} element={<PatientsPage />} />
          <Route path={routes.boards} element={<BoardsPage />} />
          <Route path={routes.boardEditor} element={<BoardEditorRoute />} />
          <Route path={routes.boardUse} element={<BoardUseRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
