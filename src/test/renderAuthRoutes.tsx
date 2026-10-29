import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import type { InitialEntry } from 'react-router'
import { routes } from '@/app/paths'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { RegisterPage } from '@/features/auth/components/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'
import { AcceptInvitationRoute } from '@/features/invitations/components/AcceptInvitationRoute'
import { LocationProbe } from './LocationProbe'

/** The real public auth screens (and the invitation landing) in StrictMode, with stubs for the app. */
export function renderAuthRoutes(initialEntry: InitialEntry) {
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
          { path: routes.login, element: <LoginPage /> },
          { path: routes.register, element: <RegisterPage /> },
          { path: routes.forgotPassword, element: <ForgotPasswordPage /> },
          { path: routes.resetPassword, element: <ResetPasswordPage /> },
          { path: routes.acceptInvitation, element: <AcceptInvitationRoute /> },
          { path: routes.dashboard, element: <p>Dashboard stub</p> },
          { path: '/pacientes/:pacienteId/cartillas', element: <p>Boards stub</p> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return { queryClient, router }
}
