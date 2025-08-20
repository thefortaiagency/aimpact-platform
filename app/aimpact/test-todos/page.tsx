'use client'

import { useState, useEffect } from 'react'
// import { useSession } from 'next-auth/react'

export default function TestTodos() {
  // const { data: session, status } = useSession()
  const session = null
  const status = 'unauthenticated'
  const [todos, setTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTodos = async () => {
      if (status === 'loading') return
      
      if (!session) {
        setError('Not logged in')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/aimpact/todos-db')
        const data = await response.json()
        
        if (!response.ok) {
          setError(`API Error: ${JSON.stringify(data)}`)
        } else {
          setTodos(data.todos || [])
        }
      } catch (err) {
        setError(`Fetch Error: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTodos()
  }, [session, status])

  return (
    <div className="p-8 bg-white min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-4">Todo Debug Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Session Info:</h2>
        <p>Status: {status}</p>
        <p>Email: {session?.user?.email || 'Not logged in'}</p>
        <p>Name: {session?.user?.name || 'N/A'}</p>
      </div>

      {loading && <p>Loading todos...</p>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4 p-4 bg-blue-100 rounded">
        <h2 className="font-bold mb-2">Raw API Response:</h2>
        <p>Number of todos: {todos.length}</p>
        {todos.length > 0 && (
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(todos, null, 2)}
          </pre>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-bold mb-2">Todos List:</h2>
        {todos.map((todo, index) => (
          <div key={todo.id || index} className="p-3 border rounded">
            <p className="font-semibold">{todo.title}</p>
            <p className="text-sm text-gray-600">
              Category: {todo.category} | Priority: {todo.priority} | 
              Due: {todo.due_date || todo.dueDate || 'No date'}
            </p>
            <p className="text-xs text-gray-500">
              User: {todo.user_email}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}