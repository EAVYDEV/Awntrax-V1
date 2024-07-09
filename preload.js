const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  fetchData: () => ipcRenderer.invoke('fetch-data'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  updateSpreadsheet: (rowIndex, columnName, value) => ipcRenderer.invoke('update-spreadsheet', rowIndex, columnName, value)
});
