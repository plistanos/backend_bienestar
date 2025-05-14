import express from 'express';
import Empatica from '../models/Empatica.js';
import Papa from "papaparse";
import fs from 'fs';
import Shelly from '../models/Shelly.js';
import AppleW from '../models/AppleW.js';

const participantes = {
  "0":"1442-1-1-00000000",
  "1":"1442-1-1-00000001",

}

const router = express.Router();


router.get('/shelly', async (req, res) => {
  console.log('Migrando datos de Shelly...');
  try {
    const result = await Shelly.updateMany(
      { timestamp_unix: { $type: 'number' } },
      [{ $set: { timestamp_unix: { $toString: '$timestamp_unix' } } }]
    );
    console.log(`Documentos actualizados: ${result.modifiedCount}`);
    res.status(200).json({ message: 'Migración completada', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error en la migración:', error);
    res.status(500).json({ message: 'Error en la migración', error });
  }
})

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

router.get('/applewatch/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
    const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
    const data = await AppleW.find({ 
      participant_full_id: participantes[participantId], 
      timestamp_unix: { $gte: startTimestamp, $lt: endTimestamp } 
    }).select('-_id -__v');

    console.log(data)

    
    // const csvData = Papa.unparse(JSON.stringify(data));
    // const filePath = `./output/data-${participantId}-${startDate}-${endDate}.csv`;
    // await fs.writeFile(filePath, csvData, (err) => {
    //   if (err) {
    //     console.error('Error al guardar el archivo CSV:', err);
    //   } else {
    //     console.log('Archivo CSV guardado exitosamente en:', filePath);
    //   }
    // });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos del participante', error });
  }
});

router.get('/empatica/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
    const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
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
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime(); 
    const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime(); 
    console.log(startTimestamp, endTimestamp)

    const data = await Shelly.find({ 
      participante: participantId,
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

router.get('/todos/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
    const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime(); 
    
    // Obtener datos de Empatica
    const empaticaData = await Empatica.find({ 
      participant_full_id: participantes[participantId], 
      timestamp_unix: { 
        $gte: startTimestamp,
        $lt: endTimestamp 
      } 
    }).select('-_id -__v');

    // Obtener y agregar datos de Shelly por minuto
    const shellyData = await Shelly.aggregate([
      {
        $match: {
          timestamp_unix: { 
            $gte: startTimestamp.toString(), // Convertir a string para coincidir con el tipo en BD
            $lt: endTimestamp.toString()
          }
        }
      },
      {
        $group: {
          _id: {
            minute: {
              $subtract: [
                { $toLong: "$timestamp_unix" }, // Convertir a número antes de la operación
                { $mod: [{ $toLong: "$timestamp_unix" }, 60000] } // Usar 60000 para minutos en milisegundos
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
      const empaticaMinute = Math.floor(empaticaEntry.timestamp_unix / 60000) * 60000;
      const shellyEntry = shellyData.find(s => s._id.minute === empaticaMinute);
      
      return {
        timestamp: empaticaEntry.timestamp_unix,
        empatica_data: empaticaEntry,
        shelly_data: shellyEntry ? {
          timestamp_unix: empaticaEntry.timestamp_unix,
          apower: shellyEntry.avg_power,
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

router.post('/shelly/esp/:participante', async (req, res) => {
  const { participantId } = req.params;
  try {
    const { apower, timestamp_unix } = req.body;
    console.log(apower + ' ' + timestamp_unix*1000)
    const shellyData = new Shelly({
      apower,
      timestamp_unix: timestamp_unix*1000,
      participante: participantId
    });
    
    await shellyData.save();
    res.status(201).json({ message: 'Datos guardados correctamente' });
  } catch (error) {
    console.error('Error al guardar datos:', error);
    res.status(500).json({ message: 'Error al guardar datos', error: error.message });
  }
});

// router.post('/apple/convert-to-milliseconds', async (req, res) => {
//   try {
//     const result = await AppleW.updateMany(
//       {}, // Filtro vacío para aplicar a todos los documentos
//       [
//         {
//           $set: {
//             timestamp_unix: {
//               $toString: { // Convertir el resultado final a string si es necesario
//                 $multiply: [
//                   { $toLong: "$timestamp_unix" }, // Convertir string a número
//                   1000
//                 ]
//               }
//             }
//           }
//         }
//       ]
//     );
    
//     res.status(200).json({
//       message: 'Timestamps convertidos a milisegundos correctamente',
//       modifiedCount: result.modifiedCount
//     });
//   } catch (error) {
//     console.error('Error al convertir timestamps:', error);
//     res.status(500).json({ 
//       message: 'Error al convertir timestamps', 
//       error: error.message 
//     });
//   }
// });

router.post('/apple/:participantId', async (req, res) => {
  const { 
    heart_rate, 
    oxygen_saturation, 
    environmental_sound,
    timestamp_unix,
    steps,
    altitude,
    longitude,
    latitude 
  } = req.body;

  const {participantId} = req.params

  try {
    const roundedTimestamp = timestamp_unix - (timestamp_unix % 10);
    
    const appleData = new AppleW({
      participant_full_id: participantes[participantId],
      heart_rate,
      oxygen_saturation,
      environmental_sound,
      timestamp_unix: roundedTimestamp*1000,
      steps,
      altitude,
      latitude,
      longitude
    });
    
    await appleData.save();
    res.status(201).json({ message: 'Datos guardados correctamente' });
  } catch (error) {
    console.error('Error al guardar datos:', error);
    res.status(500).json({ message: 'Error al guardar datos', error: error.message });
  }
});





export default router;
