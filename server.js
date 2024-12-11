// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { mainTask } from './controllers/mainTask.js';
import empaticaRoutes from './routes/empaticaRoutes.js'

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("Conectado a MongoDB"))
.catch(err => console.error("Error de conexión a MongoDB:", err));

// Middleware para parsear JSON
app.use(express.json());

// Rutas API
app.use('/api/data', empaticaRoutes);

// Ejecuta la tarea periódica cada 24 horas
// cron.schedule('0 0 * * *', () => {
//   console.log('Ejecutando tarea programada');
//   mainTask();
// });

mainTask()

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
