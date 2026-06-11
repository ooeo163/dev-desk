module.exports = {
  apps: [{
    name: 'dev-desk',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: 'D:\\workspace\\dev-desk',
    env: {
      PORT: 3001,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
