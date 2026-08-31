// config/database.js
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: "iot_backend_db",
  user: "admin",
  password: "secretpassword",
};

const connectDB = () => {
  console.log(`Connecting to database at ${dbConfig.host}:${dbConfig.port}...`);
};

module.exports = { dbConfig, connectDB };
