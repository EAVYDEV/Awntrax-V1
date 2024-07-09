const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } else {
    return getAccessToken(oAuth2Client);
  }
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets']
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token', err);
          return reject(err);
        }
        console.log('Token received:', token);
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        resolve(oAuth2Client);
      });
    });
  });
}

async function getSheetData(auth, spreadsheetId, sheetPage) {
  const sheets = google.sheets({ version: 'v4', auth });
  const columnsRange = `${sheetPage}!A1:Z1`;
  const dataRange = `${sheetPage}!A2:Z`;

  const columnsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: columnsRange,
  });
  const columnNames = columnsResponse.data.values ? columnsResponse.data.values[0] : [];

  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: dataRange,
  });
  const data = dataResponse.data.values || [];

  return { columnNames, data };
}

async function updateSheetData(auth, spreadsheetId, sheetPage, rowIndex, columnName, value) {
  const sheets = google.sheets({ version: 'v4', auth });
  const columnIndex = getColumnIndex(columnName);
  const range = `${sheetPage}!${columnIndex}${rowIndex + 2}`; // Adjusting for 1-based index and header row
  const request = {
    spreadsheetId: spreadsheetId,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] },
  };

  await sheets.spreadsheets.values.update(request);
}

function getColumnIndex(columnName) {
  const columns = {
    'Fab Complete': 'F',
    'QTY Rec': 'E',
  };
  return columns[columnName] || 'A';
}

module.exports = { authorize, getSheetData, updateSheetData };
