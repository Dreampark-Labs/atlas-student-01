"use client"

import { useState, useEffect } from 'react'
import { settingsStore, type UserSettings } from '@/lib/settings-store'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(settingsStore.getSettings())

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setSettings(settingsStore.getSettings())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const updateSettings = (updates: Partial<UserSettings>) => {
    settingsStore.updateSettings(updates)
  }

  const updateNestedSettings = <K extends keyof UserSettings>(
    key: K,
    updates: UserSettings[K] extends object ? Partial<UserSettings[K]> : never
  ) => {
    settingsStore.updateNestedSettings(key, updates)
  }

  const formatDate = (date: Date | string) => settingsStore.formatDate(date)
  const formatTime = (date: Date | string) => settingsStore.formatTime(date)
  const formatDateTime = (date: Date | string) => settingsStore.formatDateTime(date)
  const getLocalizedText = (key: string) => settingsStore.getLocalizedText(key)

  return {
    settings,
    updateSettings,
    updateNestedSettings,
    formatDate,
    formatTime,
    formatDateTime,
    getLocalizedText,
  }
}
