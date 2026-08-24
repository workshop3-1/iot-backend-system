// Express Router for IoT Devices
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get all IoT devices' });
});

module.exports = router;
```[cite: 2]

* **สมาชิกคนที่ 2**:
```bash
mkdir -p src/models
touch src/models/sensor.js