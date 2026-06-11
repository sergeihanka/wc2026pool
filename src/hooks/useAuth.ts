import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'

/**
 * Returns the current auth context value.
 * Must be called inside a component tree wrapped by <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
