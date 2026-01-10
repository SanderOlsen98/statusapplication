import { Link } from 'react-router-dom'

export default function Footer({ siteName }) {
  return (
    <footer className="border-t border-white/5 py-8 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span>Powered by <span className="text-slate-400 font-medium">Staytus</span></span>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Back to top
          </a>
          <Link 
            to="/admin" 
            className="hover:text-slate-300 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}

