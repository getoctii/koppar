// contracts/httpContext.ts

import { User, Keychain } from '@prisma/client'

declare module '@ioc:Adonis/Core/HttpContext' {
  interface HttpContextContract {
    user?: User & { keychain?: Keychain }
  }
}
