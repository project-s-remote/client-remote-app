import { app, shell, BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import robot from '@jitsi/robotjs'

interface StoreType {
  id: string
  screens: string[]
}

const store = new Store<StoreType>()

function createWindow(): void {
  // 처음 열 때 스토어에 id 없으면 스토어 다시 저장하기
  // 있으면 그거 가져와 쓰기

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false  // CORS 비활성화
    }
  })

  mainWindow.on('ready-to-show', () => {
    const displays = screen.getAllDisplays()

    mainWindow.show()

    desktopCapturer
      .getSources({
        types: ['screen']
      })
      .then((sources) => {
        const newList = sources.map(item1 => {
          const match = displays.find(item2 => item2.id.toString() === item1.display_id);
          if (match) {
            return { screen_id: item1['id'], display_id: match['id'], size: match['size'] };
          }
          return null;
        }).filter(item => item !== null);
        
        // console.log(newList);

        store.set('screens', newList)
      })
  })

  // 일렉트론 어플리케이션 내부에서 새 창이 열리지 않도록 하는 코드
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR 을 위한 세팅, 프로덕션에서는 html 보여줌
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // f12를 통해 데브툴 열 수 있음
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // const id = store.get('id')

  // getId 요청을 처리하고 응답을 보냄
  ipcMain.handle('getId', async (_event) => {
    const id = store.get('id')

    console.log("id : ", id)
    return id;
  });

  // setId 요청을 처리하고 응답을 보냄
  ipcMain.handle('setId', async (_event, newId) => {
    store.set('id', newId);

    console.log("id set to:", newId);
    return newId;
  });

  ipcMain.handle('getScreens', async (_event) => {
    const screens = store.get('screens');
    return screens;
  });

  ipcMain.handle('mouse_move', async (_event, data) => {
        const ratioX = data.width / data.clientWidth
        const ratioY = data.height / data.clientHeight

        const hostX = data.clientX * ratioX
        const hostY = data.clientY * ratioY

        robot.moveMouse(hostX, hostY)
  })

  ipcMain.handle('mouse_click', (_event, _data) => {
    robot.mouseClick('left', false)
  })


  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 맥 os 제외하고는 창이 다 닫히면 끝냄
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
