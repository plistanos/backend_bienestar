// server.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { mainTask } from './controllers/mainTask.js';
import empaticaRoutes from './routes/empaticaRoutes.js'
import { getStatus } from './controllers/shelly.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Añade aquí los orígenes permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Aplicar CORS antes de otras middlewares
app.use(cors());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("Conectado a MongoDB"))
.catch(err => console.error("Error de conexión a MongoDB:", err));

// Middleware para parsear JSON
app.use(express.json());

// Rutas API
app.use('/api/data', empaticaRoutes);



cron.schedule('0 0 * * *', () => {
  console.log('Ejecutando tarea programada:', new Date().toLocaleString());
  mainTask();
}, {
  scheduled: true,
  timezone: "America/Santiago" // Ajusta esto a tu zona horaria
});

// mainTask()
// getStatus()

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
