document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const statusMessage = document.getElementById('status-message');
  const spreadsheetUrlInput = document.getElementById('spreadsheet-url');
  const spreadsheetIdInput = document.getElementById('spreadsheet-id');
  const qtyCrosscheckInput = document.getElementById('qty-crosscheck');

  // Load saved settings
  window.electron.loadSettings().then(settings => {
    document.getElementById('api-key').value = settings.apiKey || '';
    spreadsheetUrlInput.value = settings.spreadsheetUrl || '';
    spreadsheetIdInput.value = settings.spreadsheetId || '';
    document.getElementById('sheet-page').value = settings.sheetPage || 'Sheet1';
    qtyCrosscheckInput.checked = settings.qtyCrosscheck || false;
  });

  spreadsheetUrlInput.addEventListener('input', () => {
    const url = spreadsheetUrlInput.value;
    const id = extractSpreadsheetId(url);
    spreadsheetIdInput.value = id;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const apiKey = document.getElementById('api-key').value;
    const spreadsheetUrl = spreadsheetUrlInput.value;
    const spreadsheetId = spreadsheetIdInput.value;
    const sheetPage = document.getElementById('sheet-page').value;
    const qtyCrosscheck = qtyCrosscheckInput.checked;

    if (!sheetPage) {
      statusMessage.textContent = 'Please fill in all the required fields.';
      return;
    }

    try {
      await window.electron.saveSettings({ apiKey, spreadsheetUrl, spreadsheetId, sheetPage, qtyCrosscheck });
      statusMessage.textContent = 'Settings saved successfully!';
    } catch (error) {
      console.error('Error saving settings:', error);
      statusMessage.textContent = 'Failed to save settings.';
    }
  });

  function extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  }
});
