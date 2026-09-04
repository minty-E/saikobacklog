import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import GamePage from './pages/GamePage'
import BacklogPage from './pages/BacklogPage'
import ImportPage from './pages/ImportPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/backlog" element={<BacklogPage />} />
            <Route path="/game/:id" element={<GamePage />} />
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
