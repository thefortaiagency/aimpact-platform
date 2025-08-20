import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export interface GuacamoleConnection {
  id: string
  name: string
  protocol: 'rdp' | 'vnc' | 'ssh' | 'telnet'
  parameters: {
    hostname: string
    port: number
    username?: string
    password?: string
    domain?: string
    security?: string
    'ignore-cert'?: boolean
    'enable-drive'?: boolean
    'create-drive-path'?: boolean
    'resize-method'?: string
    'enable-audio'?: boolean
  }
}

export interface GuacamoleUser {
  username: string
  attributes: {
    email?: string
    organization?: string
    role?: string
  }
  permissions: {
    connectionPermissions: {
      [connectionId: string]: ['READ' | 'UPDATE' | 'DELETE' | 'ADMINISTER']
    }
    systemPermissions?: string[]
  }
}

export class GuacamoleAuthService {
  private baseUrl: string
  private jwtSecret: string
  private adminToken?: string

  constructor(baseUrl: string, jwtSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.jwtSecret = jwtSecret
  }

  /**
   * Generate a JWT token for API authentication
   */
  generateToken(username: string, expiresIn = '1h'): string {
    return jwt.sign(
      {
        sub: username,
        iss: 'aimpactnexus',
        iat: Math.floor(Date.now() / 1000),
        guac: true
      },
      this.jwtSecret,
      { expiresIn }
    )
  }

  /**
   * Authenticate as admin to perform administrative tasks
   */
  async authenticateAdmin(username: string, password: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to authenticate with Guacamole')
    }

    const data = await response.json()
    this.adminToken = data.authToken
    return data.authToken
  }

  /**
   * Create a temporary user for remote support session
   */
  async createTemporaryUser(
    sessionId: string,
    connectionId: string,
    expiresIn = 3600 // 1 hour
  ): Promise<GuacamoleUser> {
    const username = `support_${sessionId}`
    const password = crypto.randomBytes(32).toString('hex')

    // Create user via API
    const userResponse = await fetch(`${this.baseUrl}/api/session/data/postgresql/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Guacamole-Token': this.adminToken!,
      },
      body: JSON.stringify({
        username,
        password,
        attributes: {
          disabled: '',
          expired: '',
          'access-window-start': '',
          'access-window-end': '',
          'valid-from': '',
          'valid-until': new Date(Date.now() + expiresIn * 1000).toISOString(),
          timezone: 'UTC',
        },
      }),
    })

    if (!userResponse.ok) {
      throw new Error('Failed to create temporary user')
    }

    // Grant connection permission
    await this.grantConnectionPermission(username, connectionId)

    return {
      username,
      attributes: {
        role: 'temporary_support',
      },
      permissions: {
        connectionPermissions: {
          [connectionId]: ['READ'],
        },
      },
    }
  }

  /**
   * Create a support connection for a client
   */
  async createSupportConnection(
    clientId: string,
    clientInfo: {
      hostname: string
      port?: number
      protocol?: 'rdp' | 'vnc'
    }
  ): Promise<GuacamoleConnection> {
    const connectionId = `conn_${clientId}_${Date.now()}`
    
    const connection: GuacamoleConnection = {
      id: connectionId,
      name: `Support Session - ${clientId}`,
      protocol: clientInfo.protocol || 'rdp',
      parameters: {
        hostname: clientInfo.hostname,
        port: clientInfo.port || (clientInfo.protocol === 'vnc' ? 5900 : 3389),
        'ignore-cert': true,
        'resize-method': 'display-update',
        'enable-drive': true,
        'create-drive-path': true,
        'enable-audio': true,
      },
    }

    const response = await fetch(`${this.baseUrl}/api/session/data/postgresql/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Guacamole-Token': this.adminToken!,
      },
      body: JSON.stringify({
        parentIdentifier: 'ROOT',
        name: connection.name,
        protocol: connection.protocol,
        parameters: connection.parameters,
        attributes: {
          'max-connections': '2',
          'max-connections-per-user': '1',
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create connection')
    }

    const data = await response.json()
    connection.id = data.identifier

    return connection
  }

  /**
   * Grant connection permission to a user
   */
  private async grantConnectionPermission(
    username: string,
    connectionId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/session/data/postgresql/users/${username}/permissions`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Guacamole-Token': this.adminToken!,
        },
        body: JSON.stringify([
          {
            op: 'add',
            path: `/connectionPermissions/${connectionId}`,
            value: ['READ'],
          },
        ]),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to grant connection permission')
    }
  }

  /**
   * Generate a one-time URL for accessing a connection
   */
  generateConnectionUrl(
    connectionId: string,
    username: string,
    token: string
  ): string {
    // Create a signed URL that includes authentication
    const params = new URLSearchParams({
      token,
      connection: connectionId,
      username,
    })

    return `${this.baseUrl}/#/client/${connectionId}?${params.toString()}`
  }

  /**
   * Revoke access for a temporary user
   */
  async revokeAccess(username: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/session/data/postgresql/users/${username}`,
      {
        method: 'DELETE',
        headers: {
          'Guacamole-Token': this.adminToken!,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to revoke user access')
    }
  }

  /**
   * Clean up expired connections and users
   */
  async cleanup(): Promise<void> {
    // This would be called periodically to clean up expired resources
    // Implementation depends on your specific requirements
  }
}