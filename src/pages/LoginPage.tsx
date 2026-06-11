import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '@/hooks/useAuth'
import { POOL_MEMBERS } from '@/config/pool'
import type { PoolMember } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationState {
  from?: { pathname: string }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shakingMemberId, setShakingMemberId] = useState<string | null>(null)

  const passwordFieldRef = useRef<HTMLInputElement>(null)

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/scores" replace />
  }

  function handleSelectMember(member: PoolMember) {
    setSelectedMemberId(member.id)
    setPassword('')
    setAuthError(null)
    setShakingMemberId(null)
  }

  function handleToggleShowPassword() {
    setShowPassword((prev) => !prev)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedMemberId) return

    setIsSubmitting(true)
    setAuthError(null)

    const success = login(selectedMemberId, password)

    if (success) {
      const destination = state?.from?.pathname ?? '/scores'
      navigate(destination, { replace: true })
    } else {
      setAuthError('Incorrect password. Please try again.')
      setShakingMemberId(selectedMemberId)
      setPassword('')
      // Clear shake after animation completes
      setTimeout(() => {
        setShakingMemberId(null)
        // Re-focus the password field
        passwordFieldRef.current?.focus()
      }, 400)
    }

    setIsSubmitting(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      {/* Tournament title */}
      <Typography
        variant="h4"
        sx={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 700,
          letterSpacing: 2,
          mb: 1,
          textAlign: 'center',
        }}
      >
        WORLD CUP POOL 2026
      </Typography>

      {/* Subtitle */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select your name to continue
      </Typography>

      {/* Member card grid */}
      <Grid container spacing={2} sx={{ maxWidth: 480, width: '100%' }}>
        {POOL_MEMBERS.map((member) => {
          const isSelected = selectedMemberId === member.id
          const isOtherSelected =
            selectedMemberId !== null && !isSelected
          const isShaking = shakingMemberId === member.id

          return (
            <MemberCard
              key={member.id}
              member={member}
              isSelected={isSelected}
              isOtherSelected={isOtherSelected}
              isShaking={isShaking}
              password={password}
              showPassword={showPassword}
              authError={authError}
              isSubmitting={isSubmitting}
              passwordFieldRef={isSelected ? passwordFieldRef : undefined}
              onSelect={handleSelectMember}
              onPasswordChange={setPassword}
              onToggleShowPassword={handleToggleShowPassword}
              onSubmit={handleSubmit}
            />
          )
        })}
      </Grid>
    </Box>
  )
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: PoolMember
  isSelected: boolean
  isOtherSelected: boolean
  isShaking: boolean
  password: string
  showPassword: boolean
  authError: string | null
  isSubmitting: boolean
  passwordFieldRef?: React.RefObject<HTMLInputElement | null>
  onSelect: (member: PoolMember) => void
  onPasswordChange: (value: string) => void
  onToggleShowPassword: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

function MemberCard({
  member,
  isSelected,
  isOtherSelected,
  isShaking,
  password,
  showPassword,
  authError,
  isSubmitting,
  passwordFieldRef,
  onSelect,
  onPasswordChange,
  onToggleShowPassword,
  onSubmit,
}: MemberCardProps) {
  // Auto-focus password field when this card becomes selected
  useEffect(() => {
    if (isSelected && passwordFieldRef?.current) {
      // Small delay lets Collapse animation begin before we focus
      const timer = setTimeout(() => {
        passwordFieldRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isSelected, passwordFieldRef])

  return (
    <Grid size={{ xs: 6, sm: 4 }}>
      <Card
        elevation={0}
        sx={{
          border: '2px solid',
          borderColor: isSelected ? 'primary.main' : 'transparent',
          opacity: isOtherSelected ? 0.6 : 1,
          transition: 'opacity 200ms ease, border-color 200ms ease',
          ...(isShaking && {
            animation: 'shake 300ms ease-in-out',
          }),
        }}
      >
        <CardActionArea
          onClick={() => onSelect(member)}
          aria-pressed={isSelected}
          aria-label={`Sign in as ${member.displayName}`}
          sx={{ p: 1.5 }}
        >
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {/* Avatar with initials */}
            <Avatar
              sx={{
                bgcolor: 'primary.dark',
                width: 40,
                height: 40,
                fontSize: '0.8rem',
                mb: 1,
              }}
            >
              {member.avatarInitials}
            </Avatar>

            {/* Display name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Barlow Condensed',
                fontWeight: 700,
              }}
            >
              {member.displayName}
            </Typography>

            {/* Team chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {member.teams.map((teamCode) => (
                <Chip
                  key={teamCode}
                  size="small"
                  label={teamCode}
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              ))}
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Inline password form — shown only for the selected card */}
        <Collapse in={isSelected} timeout={200}>
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}
          >
            <TextField
              inputRef={passwordFieldRef}
              type={showPassword ? 'text' : 'password'}
              label="Password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        onClick={onToggleShowPassword}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: authError ? 1 : 1.5 }}
            />

            {authError && (
              <Alert severity="error" sx={{ mb: 1, py: 0.25 }}>
                {authError}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              disabled={isSubmitting || password.length === 0}
            >
              {isSubmitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
        </Collapse>
      </Card>
    </Grid>
  )
}
