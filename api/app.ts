/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import emailRoutes from './routes/email.js'

// for esm mode (兼容CJS打包)
let __dirname: string
try {
  const __filename = fileURLToPath(import.meta.url)
  __dirname = path.dirname(__filename)
} catch {
  // CJS环境下使用全局__dirname或process.cwd()
  __dirname = (typeof globalThis.__dirname !== 'undefined') ? globalThis.__dirname : process.cwd()
}

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/email', emailRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

// 生产环境：提供静态文件服务（Electron打包后使用）
if (process.env.SERVE_STATIC === 'true') {
  const staticPath = process.env.STATIC_PATH || path.join(__dirname, '..', 'dist')
  app.use(express.static(staticPath))
  // SPA回退：非API路由返回index.html
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'))
    } else {
      res.status(404).json({ success: false, error: 'API not found' })
    }
  })
}

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler (非静态文件模式)
 */
if (process.env.SERVE_STATIC !== 'true') {
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
  })
}

export default app
