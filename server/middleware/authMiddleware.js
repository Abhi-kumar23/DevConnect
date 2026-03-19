const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    console.log("PROTECT MIDDLEWARE HIT");
    let token;

    console.log("HEADERS:", req.headers);
    console.log("AUTH:", req.headers.authorization);

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select("-password");

            return next();   // THIS RETURN FIXES EVERYTHING

        } catch (error) {
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    return res.status(401).json({ message: "No token, authorization denied" });
};

module.exports = { protect };