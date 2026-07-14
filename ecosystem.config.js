module.exports = {
  apps: [
    {
      name: 'akgec-quiz-backend',
      script: './server.js',
      instances: 'max', // Utilize all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'akgec-sync-worker',
      script: './workers/syncWorker.js',
      instances: 1, // Workers generally should not be clustered unless queue allows it safely
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'akgec-report-worker',
      script: './workers/reportWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
