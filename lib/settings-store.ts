"use client"

// Settings store for managing user preferences
export interface UserSettings {
  // Appearance
  theme: "light" | "dark" | "system"
  
  // Localization
  language: string
  timezone: string
  dateFormat: string
  timeFormat: "12h" | "24h"
  
  // Smart Features
  smartPrioritization: boolean
  
  // Notifications
  notifications: {
    assignments: boolean
    grades: boolean
    deadlines: boolean
    email: boolean
  }
  
  // Privacy
  privacy: {
    shareGrades: boolean
    shareSchedule: boolean
    analytics: boolean
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  smartPrioritization: true,
  notifications: {
    assignments: true,
    grades: true,
    deadlines: true,
    email: false,
  },
  privacy: {
    shareGrades: false,
    shareSchedule: false,
    analytics: true,
  },
}

class SettingsStore {
  private settings: UserSettings = DEFAULT_SETTINGS
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings()
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('atlas-student-settings')
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('atlas-student-settings', JSON.stringify(this.settings))
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSettings(): UserSettings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<UserSettings>) {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
  }

  updateNestedSettings<K extends keyof UserSettings>(
    key: K,
    updates: UserSettings[K] extends object ? Partial<UserSettings[K]> : never
  ) {
    if (typeof this.settings[key] === 'object' && this.settings[key] !== null) {
      this.settings = {
        ...this.settings,
        [key]: { ...(this.settings[key] as object), ...updates }
      }
      this.saveSettings()
    }
  }

  resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
  }

  // Utility methods for formatting
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const format = this.settings.dateFormat
    
    switch (format) {
      case "MM/DD/YYYY":
        return d.toLocaleDateString('en-US')
      case "DD/MM/YYYY":
        return d.toLocaleDateString('en-GB')
      case "YYYY-MM-DD":
        return d.toISOString().split('T')[0]
      default:
        return d.toLocaleDateString()
    }
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const is24h = this.settings.timeFormat === "24h"
    
    return d.toLocaleTimeString(this.settings.language, {
      hour12: !is24h,
      hour: 'numeric',
      minute: '2-digit',
      timeZone: this.settings.timezone
    })
  }

  formatDateTime(date: Date | string): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`
  }

  getLocalizedText(key: string): string {
    // Basic localization - in a real app this would use a proper i18n library
    const translations: Record<string, Record<string, string>> = {
      en: {
        dashboard: "Dashboard",
        classes: "My Classes",
        grades: "Grade Tracker",
        assignments: "Assignments",
        settings: "Settings",
        profile: "Profile",
        // Add more translations as needed
      },
      es: {
        dashboard: "Panel de Control",
        classes: "Mis Clases",
        grades: "Seguimiento de Calificaciones",
        assignments: "Tareas",
        settings: "Configuración",
        profile: "Perfil",
      },
      fr: {
        dashboard: "Tableau de Bord",
        classes: "Mes Classes",
        grades: "Suivi des Notes",
        assignments: "Devoirs",
        settings: "Paramètres",
        profile: "Profil",
      },
      de: {
        dashboard: "Dashboard",
        classes: "Meine Klassen",
        grades: "Notenverfolgung",
        assignments: "Aufgaben",
        settings: "Einstellungen",
        profile: "Profil",
      }
    }

    return translations[this.settings.language]?.[key] || translations.en[key] || key
  }
}

export const settingsStore = new SettingsStore()
