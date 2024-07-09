const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { authorize, getSheetData, updateSheetData } = require('./sheets');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('fetch-data', async () => {
  try {
    const settings = getSettings();
    const { apiKey, spreadsheetId, sheetPage, qtyCrosscheck } = settings;

    if (!apiKey || !spreadsheetId || !sheetPage) {
      throw new Error('Missing one or more required settings');
    }

    const auth = await authorize();
    const { columnNames, data } = await getSheetData(auth, spreadsheetId, sheetPage);
    return { columnNames, data, timestamp: new Date(), settings };
  } catch (error) {
    console.error('Failed to fetch data from Google Sheets:', error.message);
    throw new Error('Failed to fetch data from Google Sheets.');
  }
});

ipcMain.handle('update-spreadsheet', async (event, rowIndex, columnName, value) => {
  try {
    const settings = getSettings();
    const { apiKey, spreadsheetId, sheetPage } = settings;

    if (!apiKey || !spreadsheetId || !sheetPage) {
      throw new Error('Missing one or more required settings');
    }

    const auth = await authorize();
    await updateSheetData(auth, spreadsheetId, sheetPage, rowIndex, columnName, value);
    return 'Update successful';
  } catch (error) {
    console.error('Failed to update spreadsheet:', error.message);
    throw new Error(`Failed to update spreadsheet: ${error.message}`);
  }
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
    return 'Settings saved successfully';
  } catch (error) {
    console.error('Failed to save settings:', error.message);
    throw new Error('Failed to save settings.');
  }
});

ipcMain.handle('load-settings', () => {
  try {
    const settings = getSettings();
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error.message);
    throw new Error('Failed to load settings.');
  }
});

function getSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Failed to read settings:', error.message);
    return {};
  }
}
