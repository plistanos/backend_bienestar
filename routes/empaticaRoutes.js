import express from 'express';
import Empatica from '../models/Empatica.js';
import Papa from "papaparse";
import fs from 'fs';
import Shelly from '../models/Shelly.js';

const participantes = {
  "0":"1442-1-1-00000000",
  "1":"1442-1-1-00000001",

}

const router = express.Router();

// Obtener todos los datos
router.get('/', async (req, res) => {
  try {
    const data = await Empatica.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos', error });
  }
});

// Obtener datos por participante
router.get('/participante/:participantId', async (req, res) => {
  const { participantId } = req.params;
  try {
    const data = await Empatica.find({ participant_full_id: participantId }).select('-_id -__v');;
    const csvData = Papa.unparse(JSON.stringify(data));
    const filePath = `./output/data-${participantId}.csv`;
    await fs.writeFile(filePath, csvData, (err) => {
      if (err) {
        console.error('Error al guardar el archivo CSV:', err);
      } else {
        console.log('Archivo CSV guardado exitosamente en:', filePath);

      }
    });
    res.status(200).json(data);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error al obtener los datos del participante', error });
  }
});

router.get('/last', async (req,res) => {
  try {
    // const latestEntry = await Empatica.findOne()
    // .sort({ timestamp_unix: -1 })
    // .limit(1);

    const lastEntries = await Empatica.aggregate([
      {
          // Agrupar por el campo participant_full_id
          $group: {
              _id: "$participant_full_id",
              // Guardar el documento con el mayor timestamp_unix en cada grupo
              latestData: { $last: "$$ROOT" },
              maxTimestamp: { $max: { $toLong: "$timestamp_unix" } }
          }
      },
      {
          // Ordenar por el timestamp máximo si deseas ordenarlos
          $sort: { maxTimestamp: -1 }
      },
      {
          // Proyectar el resultado final para que solo se muestre el último documento
          $replaceRoot: { newRoot: "$latestData" }
      }
    ]);


  
    console.log(lastEntries);
    res.status(200).json(lastEntries);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error al obtener los datos', error });
  }
})

router.get('/empatica/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + 86400000;
    const data = await Empatica.find({ 
      participant_full_id: participantes[participantId], 
      timestamp_unix: { $gte: startTimestamp, $lt: endTimestamp } 
    }).select('-_id -__v');

    
    const csvData = Papa.unparse(JSON.stringify(data));
    const filePath = `./output/data-${participantId}-${startDate}-${endDate}.csv`;
    await fs.writeFile(filePath, csvData, (err) => {
      if (err) {
        console.error('Error al guardar el archivo CSV:', err);
      } else {
        console.log('Archivo CSV guardado exitosamente en:', filePath);
      }
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos del participante', error });
  }
});

router.get('/shelly/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = (new Date(startDate).getTime() / 1000).toString(); // Convertir a segundos
    const endTimestamp = (new Date(endDate).getTime() / 1000 + 86400).toString(); // Añadir 24 horas en segundos
    
    const data = await Shelly.find({ 
      timestamp_unix: { 
        $gte: startTimestamp, 
        $lt: endTimestamp 
      } 
    }).select('-_id -__v');

    const csvData = Papa.unparse(JSON.stringify(data));
    const filePath = `./output/shelly-data-${participantId}-${startDate}-${endDate}.csv`;
    
    await fs.writeFile(filePath, csvData, (err) => {
      if (err) {
        console.error('Error al guardar el archivo CSV:', err);
      } else {
        console.log('Archivo CSV guardado exitosamente en:', filePath);
      }
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los datos de Shelly', error });
  }
});

router.get('/synchronized-data/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = (new Date(startDate).getTime() / 1000).toString();
    const endTimestamp = (new Date(endDate).getTime() / 1000 + 86400).toString();
    
    // Obtener datos de Empatica
    const empaticaData = await Empatica.find({ 
      timestamp_unix: { 
        $gte: (startTimestamp * 1000), // Convertir a milisegundos para Empatica
        $lt: (endTimestamp * 1000) 
      } 
    }).select('-_id -__v');

    // Obtener y agregar datos de Shelly por minuto
    const shellyData = await Shelly.aggregate([
      {
        $match: {
          timestamp_unix: { 
            $gte: startTimestamp, 
            $lt: endTimestamp 
          }
        }
      },
      {
        $group: {
          _id: {
            // Redondear timestamp al minuto más cercano
            minute: {
              $subtract: [
                { $toInt: "$timestamp_unix" },
                { $mod: [{ $toInt: "$timestamp_unix" }, 60] }
              ]
            }
          },
          avg_power: { $avg: "$apower" },
          max_power: { $max: "$apower" },
          min_power: { $min: "$apower" },
          samples_count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.minute": 1 }
      }
    ]);

    // Combinar los datos
    const synchronizedData = empaticaData.map(empaticaEntry => {
      // Convertir timestamp de Empatica a segundos y redondear al minuto
      const empaticaMinute = Math.floor(empaticaEntry.timestamp_unix / 60000) * 60;
      
      // Buscar datos de Shelly correspondientes
      const shellyEntry = shellyData.find(s => s._id.minute === empaticaMinute);
      
      return {
        timestamp: empaticaEntry.timestamp_unix,
        empatica_data: empaticaEntry,
        shelly_data: shellyEntry ? {
          average_power: shellyEntry.avg_power,
          max_power: shellyEntry.max_power,
          min_power: shellyEntry.min_power,
          samples_in_minute: shellyEntry.samples_count
        } : null
      };
    });

    // Generar CSV
    const csvData = Papa.unparse(JSON.stringify(synchronizedData));
    const filePath = `./output/synchronized-data-${startDate}-${endDate}.csv`;
    
    await fs.writeFile(filePath, csvData, (err) => {
      if (err) {
        console.error('Error al guardar el archivo CSV:', err);
      } else {
        console.log('Archivo CSV guardado exitosamente en:', filePath);
      }
    });
    
    res.status(200).json(synchronizedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los datos sincronizados', error });
  }
});

export default router;
