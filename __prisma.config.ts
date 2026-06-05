import { defineConfig, env } from 'prisma/config'

export default defineConfig({
    datasource: {
        db: {
            provider: 'postgresql',
            url: env('DATABASE_URL'),
        },
    },
})