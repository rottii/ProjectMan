const { PrismaClient } = require('@prisma/client');

// Singleton PrismaClient with connection pooling configuration.
// Every file should import from here instead of creating new PrismaClient().
// This prevents opening dozens of separate connection pools (one per file)
// which would exhaust the database's connection limit under load.

const prisma = global.__prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Log slow queries in development
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ]
    : [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
});

// In development, attach the client to `global` so it survives hot-reloads
// without creating a fresh pool each time (common Next.js / nodemon pattern).
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
