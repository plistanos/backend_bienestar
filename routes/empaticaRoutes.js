import express from 'express';
import Empatica from '../models/Empatica.js';
import Papa from "papaparse";
import fs from 'fs';

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

export default router;
