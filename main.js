const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const configjs = require('./config.js');
const config = require('electron-json-config')
const db = require('./database.js');

let win;

function createWindow () {
    win = new BrowserWindow({
      width: 1200,
      height: 600,
      icon: __dirname + '/logo.svg',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-config-variable', (event, key) => {
  return config.factory('config.json').get(key)
});

// ipcMain.handle('get-i18n', (event) => {
//   var i18n = new(require('./translation/i18n.js'))
//   return i18n
// });

ipcMain.handle('set-config-variable', (event, key, value) => {
  return config.factory('config.json').set(key, value)
});

ipcMain.handle('remove-config-variable', (event, key) => {
  return config.factory('config.json').delete(key)
});

ipcMain.handle('has-config-variable', (event, key) => {
  return config.factory('config.json').has(key)
});

// Gestion des événements IPC pour la base de données
ipcMain.handle('get-lists', (event) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM lists', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-list', (event, listId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM lists WHERE id = ?', [listId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-tasks', (event, listId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM tasks WHERE list_id = ? ORDER BY position', [listId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-tasks-withId', (event, taskId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM tasks WHERE id = ?', [taskId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-list', (event, listName, color) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO lists (name, color) VALUES (?, ?)', [listName, color], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
});

ipcMain.handle('update-list', (event, id, listName, color) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE lists SET name = ?, color = ? WHERE id = ?', [listName, color, id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
});

ipcMain.handle('add-task', (event, listId, description, date, taskName) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM tasks WHERE list_id = ?', [listId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const position = row.count;
        db.run('INSERT INTO tasks (list_id, name, description, position, date) VALUES (?, ?, ?, ?, ?)', [listId, taskName, description, position, date], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        });
      }
    });
  });
});

// Suppression de liste
ipcMain.handle('delete-list', (event, listId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM lists WHERE id = ?', [listId], function(err) {
      if (err) {
        reject(err);
      } else {
        db.run('DELETE FROM tasks WHERE list_id = ?', [listId], function(taskErr) {
          if (taskErr) {
            reject(taskErr);
          } else {
            resolve();
          }
        });
      }
    });
  });
});

// Suppression de tâche
ipcMain.handle('delete-task', (event, taskId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

// Mise à jour de la position et du list_id des tâches après réorganisation
ipcMain.handle('update-task-list-and-position', (event, taskId, newListId, newPosition) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE tasks SET list_id = ?, position = ? WHERE id = ?', [newListId, newPosition, taskId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});