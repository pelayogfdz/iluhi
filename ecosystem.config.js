module.exports = {
  apps: [
    {
      name: "sat-bot-scheduler",
      script: "./scheduler_sat.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "encuestas-scheduler",
      script: "./scheduler_encuestas.js",
      watch: false,
    },
    {
      name: "sat-qa-bot-monitor",
      script: "./sat_dom_qa_bot.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "0 0 * * *", // A las 00:00 diario previo a barridos
      watch: false,
      autorestart: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
