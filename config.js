const fs = require('fs');

const configPath = './config.txt';

// Leer el archivo y convertirlo en un objeto
const config = {};
const rawConfig = fs.readFileSync(configPath, 'utf8');

rawConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    config[key.trim()] = value.trim();
  }
});

module.exports = {
  db: {
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASS,
    database: config.DB_NAME,
    port: Number(config.DB_PORT) || 3306
  }
};
