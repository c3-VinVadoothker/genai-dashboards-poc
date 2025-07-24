"use client"

import dynamic from 'next/dynamic'

// Dynamically import the Dashboard component
const Dashboard = dynamic(() => import('@/dashboard'), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <Dashboard />
}
