import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost:19092',
  },
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  },
  odoo: {
    url: process.env.ODOO_URL || 'https://dealflow3602.odoo.com',
    db: process.env.ODOO_DB || 'dealflow3602',
    email: process.env.ODOO_EMAIL || 'chaitanyadalvi655@gmail.com',
    apiKey: process.env.ODOO_API_KEY || 'e6e7e1617f7e22742936bde94a6efcd6e10a869b',
  },
};
