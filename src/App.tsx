import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { paths, routes } from '@/app/paths'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { BoardEditorRoute } from '@/features/boards/components/BoardEditorRoute'
import { BoardUseRoute } from '@/features/boards/components/BoardUseRoute'
import { BoardsPage } from '@/features/boards/components/BoardsPage'
import { PatientsPage } from '@/features/patients/components/PatientsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.login} element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path={routes.patients} element={<PatientsPage />} />
          <Route path={routes.boards} element={<BoardsPage />} />
          <Route path={routes.boardEditor} element={<BoardEditorRoute />} />
          <Route path={routes.boardUse} element={<BoardUseRoute />} />
        </Route>
        <Route path="*" element={<Navigate to={paths.patients()} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
