// routes/auth.js or similar
const express = require('express');
const router = express.Router();
const { signup, login } = require('../Controllers/AuthController');

router.get('/h', (req, res) => {
    res.send("Hello, this is the API");
});
router.post('/signup', signup);
router.post('/login', login);

module.exports = router;
