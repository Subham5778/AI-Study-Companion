const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      hasLoggedInBefore: true
    });

    await user.save();

    // Create JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level, isFirstLogin: true }, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    // Create JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const isFirstLogin = !user.hasLoggedInBefore;
    if (isFirstLogin) {
      user.hasLoggedInBefore = true;
      await user.save();
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level, avatar: user.avatar, isFirstLogin }, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Google Sign-In / Sign-Up
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const isPlaceholder = !clientId || clientId.includes('your_google');

    if (isPlaceholder) {
      console.warn("GOOGLE_CLIENT_ID is not configured. Decoding JWT payload without verification.");
      const parts = credential.split('.');
      if (parts.length === 3) {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      } else {
        // Fallback for custom dev/mock login
        payload = {
          sub: 'mock-google-' + credential,
          email: credential.includes('@') ? credential : `${credential}@gmail.com`,
          name: credential,
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${credential}`
        };
      }
    } else {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find user by email
    let user = await User.findOne({ email });

    let isNewUser = false;

    if (user) {
      // If user exists, link Google ID and update avatar if needed
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (picture && (!user.avatar || user.avatar.includes('dicebear.com/7.x/bottts'))) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create user
      isNewUser = true;
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture || "https://api.dicebear.com/7.x/bottts/svg?seed=study"
      });
      await user.save();
    }

    // Create JWT
    const jwtPayload = { user: { id: user.id } };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const isFirstLogin = isNewUser || !user.hasLoggedInBefore;
    if (!user.hasLoggedInBefore) {
      user.hasLoggedInBefore = true;
      await user.save();
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level, avatar: user.avatar, isFirstLogin }, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get Logged In User
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

// Logout User
router.post('/logout', (req, res) => {
    res.cookie('token', '', { expires: new Date(0) });
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
