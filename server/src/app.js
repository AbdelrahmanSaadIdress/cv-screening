const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const {
  securityHeaders,
  corsPolicy,
  csrfGuard,
  globalLimiter,
} = require('./middleware/security');
const authRoutes = require('./routes/auth');
const areaRoutes = require('./routes/areas');

const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(securityHeaders);
app.use(corsPolicy);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', globalLimiter, csrfGuard);
app.use('/api/auth', authRoutes);
app.use('/api', areaRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Last resort: never leak stack traces or internals to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

module.exports = app;
