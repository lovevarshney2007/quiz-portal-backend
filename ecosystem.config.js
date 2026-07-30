module.exports = {
  apps: [
    {
      name: 'akgec-quiz-backend',
      script: './server.js',
      instances: 1, // Fork mode prevents Socket.IO broadcast issues without Redis adapter
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
    }
  ]
};
