const required = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
];

const validate = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing env vars: ${missing.join(', ')} — using defaults`);
  }
};

module.exports = { validate };
