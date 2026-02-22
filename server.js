const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./src/config/database');
const rankRoutes = require('./src/routes/rankRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'ZygoSMP API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/ranks', rankRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// Minecraft Server Status API (proxy to external API)
app.get('/api/server-status', async (req, res) => {
    try {
        const serverIp = process.env.SERVER_IP || 'mc.zygosmp.qzz.io';
        const response = await fetch(`https://api.mcsrvstat.us/2/${serverIp}`);
        const data = await response.json();
        
        res.json({
            success: true,
            data: {
                online: data.online,
                players: data.players ? {
                    online: data.players.online || 0,
                    max: data.players.max || 0
                } : { online: 0, max: 0 },
                version: data.version || 'Unknown',
                motd: data.motd ? data.motd.clean : '',
                hostname: serverIp
            }
        });
    } catch (error) {
        console.error('Error fetching server status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch server status'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const startServer = async () => {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.warn('⚠️  Warning: Database not connected. Some features may not work.');
    }

    app.listen(PORT, () => {
        console.log(`🚀 ZygoSMP API Server running on port ${PORT}`);
        console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer();