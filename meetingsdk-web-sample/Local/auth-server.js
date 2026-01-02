// Zoom Meeting SDK Signature Generation Server
// Run: node auth-server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// SDK Credentials from .env file
const SDK_KEY = process.env.ZOOM_SDK_KEY || 'eJQ8APlznjQtB9rWuQJF3eJEXZmcczrLRn8B';
const SDK_SECRET = process.env.ZOOM_SDK_SECRET || '0Py0umuDw88YGvuC6oERHlicojQYoa1k2WGs';

if (!SDK_KEY || !SDK_SECRET) {
  console.error('⚠️  WARNING: SDK_KEY or SDK_SECRET not set!');
  console.log('Please check your .env file or update the credentials in this file.');
}

// Generate Meeting SDK Signature
app.post('/', (req, res) => {
  const { meetingNumber, role } = req.body;

  if (!meetingNumber || role === undefined) {
    return res.status(400).json({ 
      error: 'Missing meetingNumber or role in request body' 
    });
  }

  try {
    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(SDK_KEY + meetingNumber + timestamp + role).toString('base64');
    const hash = crypto.createHmac('sha256', SDK_SECRET).update(msg).digest('base64');
    const signature = Buffer.from(`${SDK_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');

    console.log(`✅ Signature generated for meeting: ${meetingNumber}, role: ${role}`);
    
    res.json({ 
      signature: signature 
    });
  } catch (error) {
    console.error('❌ Error generating signature:', error);
    res.status(500).json({ 
      error: 'Failed to generate signature',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Zoom Meeting SDK Auth Server is running',
    sdkKey: SDK_KEY ? 'Configured ✓' : 'Missing ✗'
  });
});

app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   🚀 Zoom Meeting SDK Auth Server Started   ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`\n📍 Server running on: http://localhost:${PORT}`);
  console.log(`🔑 SDK Key: ${SDK_KEY ? SDK_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`🔐 SDK Secret: ${SDK_SECRET ? '***' + SDK_SECRET.substring(SDK_SECRET.length - 4) : 'NOT SET'}`);
  console.log('\n✨ Ready to generate signatures!\n');
});
