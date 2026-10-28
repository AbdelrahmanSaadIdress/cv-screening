import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { PublicOnly, RequireOwner, RequireRole, RoleRedirect } from './auth/guards'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import { ApplicantHome, Placeholder, RecruiterHome } from './pages/Overviews'
import Register from './pages/Register'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route path="/u/:slug" element={<RequireOwner />}>
            <Route index element={<RoleRedirect />} />

            <Route path="recruiter" element={<RequireRole role="recruiter" />}>
              <Route element={<AppShell />}>
                <Route index element={<RecruiterHome />} />
                <Route
                  path="candidates"
                  element={
                    <Placeholder
                      title="Candidates"
                      text="Every CV you upload will be searchable here and ranked against your roles."
                    />
                  }
                />
                <Route
                  path="roles"
                  element={
                    <Placeholder
                      title="Roles"
                      text="Create a role, paste the job description and see the best-matching CVs first."
                    />
                  }
                />
              </Route>
            </Route>

            <Route path="applicant" element={<RequireRole role="applicant" />}>
              <Route element={<AppShell />}>
                <Route index element={<ApplicantHome />} />
                <Route
                  path="jobs"
                  element={<Placeholder title="Open roles" text="Roles that match your CV will appear here." />}
                />
                <Route
                  path="applications"
                  element={
                    <Placeholder
                      title="My applications"
                      text="Track every application and its status in one place."
                    />
                  }
                />
              </Route>
            </Route>
          </Route>

          {/* Old addresses without a name go to the home page */}
          <Route path="/recruiter/*" element={<Navigate to="/" replace />} />
          <Route path="/applicant/*" element={<Navigate to="/" replace />} />

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}