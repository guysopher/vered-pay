import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'שם משתמש', type: 'text' },
        password: { label: 'סיסמה', type: 'password' },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.AUTH_USER &&
          credentials?.password === process.env.AUTH_PASSWORD
        ) {
          return { id: '1', name: credentials!.username }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
