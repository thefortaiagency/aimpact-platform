import { useState, useEffect } from 'react'

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const addContact = async (contact: Omit<Contact, 'id'>) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      })
      if (response.ok) {
        const newContact = await response.json()
        setContacts([...contacts, newContact])
        return newContact
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  return { contacts, loading, addContact, refetch: fetchContacts }
}