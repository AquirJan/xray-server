module.exports = {
  apps : [
      {
        name: "xray-server",
        script: "./app.js",
        watch: false,
        env: {
          NODE_ENV: "development",
        },
        env_production: {
          NODE_ENV: "production",
        },
	      autorestart: false
      }
  ]
}
