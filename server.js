require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const volunteerWenhook = require('./routes/volunteerWebhook')
const purchaseRoutes = require('./routes/purchase');

const app = express();
connectDB();

app.use(cors());

// Webhook route needs raw body — must be registered BEFORE express.json()
app.use('/api/webhook/volunteer', volunteerWenhook);

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/purchase', purchaseRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));