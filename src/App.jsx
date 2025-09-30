import React from 'react'
import MicroSkillForm from './components/MicroSkillForm'
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">MicroSkill — 1-Minute MicroMentor</h1>
          <p className="text-sm text-gray-600 mt-1">Generate 5 micro-lessons, profile blurbs, and a short cover message for any gig.</p>
        </header>
        <main>
          <MicroSkillForm />
        </main>
      </div>
    </div>
  )
}
