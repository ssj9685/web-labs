import { Github, Sparkles } from 'lucide-react'
import { ChessPlayground } from './labs/chess/ChessPlayground'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Web Labs home">
          <span className="brand-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>Web Labs</span>
        </a>
        <a
          className="icon-link"
          href="https://github.com/ssj9685/web-labs"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        >
          <Github size={18} aria-hidden="true" />
        </a>
      </header>

      <ChessPlayground />
    </main>
  )
}

export default App
