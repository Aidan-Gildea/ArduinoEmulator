const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

const isDev = !app.isPackaged
let devServerProcess = null

function startViteDevServer() {
  if (!isDev || devServerProcess) {
    return
  }

  const reactAppDir = path.resolve(__dirname, '../ArduinoEmulator')
  devServerProcess = spawn('npm', ['run', 'dev'], {
    cwd: reactAppDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  devServerProcess.on('exit', () => {
    devServerProcess = null
  })
}

async function waitForDevServer(url, retries = 40, delayMs = 250) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await fetch(url, { method: 'HEAD' })
      return
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(`Dev server not ready after ${retries} attempts: ${url}`)
}

async function createWindow() {
  startViteDevServer()

  const win = new BrowserWindow({
    width: 1000,
    height: 1000
  })
  try {
    if (isDev) {
      const devPort = process.env.VITE_DEV_PORT ?? '5173'
      const devUrl = `http://localhost:${devPort}`
      console.log('Loading:', devUrl)
      await waitForDevServer(devUrl)
      await win.loadURL(devUrl)
    } else {
      const filePath = path.resolve(__dirname, '../ArduinoEmulator/dist/index.html')
      console.log('Loading:', filePath)
      await win.loadFile(filePath)
    }
  } catch (err) {
    console.error('Failed to load file:', err)
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (devServerProcess) {
      devServerProcess.kill()
    }
    app.quit()
  }
})