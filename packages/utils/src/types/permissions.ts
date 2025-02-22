export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export interface Permission {
  id: string
  name: string
  description?: string
}

export interface Team {
  id: string
  name: string
}
