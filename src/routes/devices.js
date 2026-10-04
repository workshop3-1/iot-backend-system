// Express Router for IoT Devices
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get all IoT devices' });
});

module.exports = router;