import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import taskRoutes from './routes/tasks';
import projectRoutes from './routes/projects';
import feedRoutes from './routes/feed';
import agentRoutes from './routes/agents';
import documentRoutes from './routes/documents';
import channelRoutes from './routes/channels';
import purchaseRoutes from './routes/purchases';

import { AgentOrchestrator } from './agents/orchestrator';
import { initDatabase } from './db/init';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/purchases', purchaseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and orchestrator
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    const orchestrator = new AgentOrchestrator(io);
    await orchestrator.start();
    console.log('✅ Agent orchestrator started');

    // Make orchestrator available to routes
    app.set('orchestrator', orchestrator);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
