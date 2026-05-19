const jwt = require('jsonwebtoken');

const SECRET = 'fitnesstracker_secret';

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Kein Token' });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token ungültig' });
        req.user = user;
        next();
    });
}

module.exports = { verifyToken, SECRET };
