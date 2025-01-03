import {
  S3Client,
  GetObjectCommand,
  paginateListObjectsV2
} from "@aws-sdk/client-s3";
import Papa from "papaparse"
import Empatica from '../models/Empatica.js';
import dotenv from 'dotenv';
import fs from "fs";
import path from 'path';
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";    
let agent = new https.Agent({
  maxSockets: 500
});
dotenv.config();
const client = new S3Client({
  region:'us-east-1',
  requestHandler: new NodeHttpHandler({
    requestTimeout: 3_000,
    httpsAgent: agent
  })
});
const BUCKET_NAME = process.env.BUCKET_NAME;
const PREFIX = process.env.PREFIX;
const BATCH_SIZE = 500;

const insertDataInBatches = async (data) => {
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE); // Dividir en lotes
    try {
      await Empatica.insertMany(batch); // Insertar cada lote en MongoDB
      console.log(`Lote insertado con éxito: ${i / BATCH_SIZE + 1}`);
    } catch (error) {
      console.error(`Error al insertar el lote ${i / BATCH_SIZE + 1}:`, error);
    }
  }
};

const unixToIso = (unixTimestamp) => {
  const date = new Date(unixTimestamp);
  date.setUTCHours(date.getUTCHours() - 3);
  const isoStringGMT3 = date.toISOString().replace('.000', '');
  return isoStringGMT3
}

const mergeObjects = (arrays) => {
  // Crear un mapa para almacenar objetos combinados por `timestamp_unix` y `participant_full_id`
  const mergedMap = new Map();

  // Iterar sobre cada arreglo en el conjunto de arreglos
  arrays.forEach(array => {
    array.forEach(obj => {
      const uniqueKey = `${obj.timestamp_unix}-${obj.participant_full_id}`;

      // Si el objeto con esta clave única ya existe en el mapa, fusionar propiedades
      if (mergedMap.has(uniqueKey)) {
        const existingObj = mergedMap.get(uniqueKey);
        mergedMap.set(uniqueKey, { ...existingObj, ...obj });
      } else {
        // Si no existe, agregar el objeto al mapa
        mergedMap.set(uniqueKey, { ...obj });
      }
    });
  });

  // Convertir el mapa en un arreglo
  return Array.from(mergedMap.values());
};

export const mainTask = async() => {

  let objects = [];
  let avroFiles = [];
  const paginator = paginateListObjectsV2(
    { client, pageSize: Number.parseInt('1000') },
    { Bucket: BUCKET_NAME , Prefix:PREFIX},
  );

  for await (const page of paginator) {
    objects = [...objects,...page.Contents.map((o) => (
      o.Key.endsWith(".csv") && !o.Key.includes("metadata") ? o.Key : undefined)
    ).filter(Boolean)];

    avroFiles = [...avroFiles,...page.Contents.map((o) => o.Key.endsWith(".avro") ? o.Key : undefined ).filter(Boolean)]
    
  }

  const avroFilesPerUser = new Map()

  avroFilesPerUser.set("1442-1-1-00000001",[])
  avroFilesPerUser.set("1442-1-1-00000000",[])


  const outputPath = './output/avro'
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  console.log(avroFiles.length)
  avroFiles.forEach(async(avro) => {
    var {Body} = await client.send(
      new GetObjectCommand({
        Bucket:BUCKET_NAME,
        Key: avro
      })
    )

    if(avro.split('/').includes("00000000-3YK661D2N8")){
      // const prevData = avroFilesPerUser.get("1442-1-1-00000000");
      // avroFilesPerUser.set("1442-1-1-00000000", [...prevData, Body]);
      const userOutputPath = path.join(outputPath, "1442-1-1-00000000");
      if (!fs.existsSync(userOutputPath)) {
        fs.mkdirSync(userOutputPath, { recursive: true });
      }
      const fileName = path.basename(avro); // Obtener el nombre del archivo
      const destPath = path.join(userOutputPath, fileName);
      const writeStream = fs.createWriteStream(destPath);
      Body.pipe(writeStream);
        
    }else{
      // const prevData = avroFilesPerUser.get("1442-1-1-00000001");
      // avroFilesPerUser.set("1442-1-1-00000001", [...prevData, Body]);
      const userOutputPath = path.join(outputPath, "1442-1-1-00000001");
      if (!fs.existsSync(userOutputPath)) {
        fs.mkdirSync(userOutputPath, { recursive: true });
      }
      const fileName = path.basename(avro); // Obtener el nombre del archivo
      const destPath = path.join(userOutputPath, fileName);
      const writeStream = fs.createWriteStream(destPath);
      Body.pipe(writeStream);
      
    }
  })

  // let digital_markers = []
  // const lastEntries = await Empatica.aggregate([
  //   {
  //       // Agrupar por el campo participant_full_id
  //       $group: {
  //           _id: "$participant_full_id",
  //           // Guardar el documento con el mayor timestamp_unix en cada grupo
  //           latestData: { $last: "$$ROOT" },
  //           maxTimestamp: { $max: { $toLong: "$timestamp_unix" } }
  //       }
  //   },
  //   {
  //       // Ordenar por el timestamp máximo si deseas ordenarlos
  //       $sort: { maxTimestamp: -1 }
  //   },
  //   {
  //       // Proyectar el resultado final para que solo se muestre el último documento
  //       $replaceRoot: { newRoot: "$latestData" }
  //   }
  // ]);
  // const participantes = new Map()


  // if (lastEntries.length !== 0){
  //   lastEntries.forEach((entry)=>{
  //     participantes.set(entry.participant_full_id, Number(entry.timestamp_unix))
  //   })
  // }

  // // const latestEntry = await Empatica.findOne()
  // // .sort({ timestamp_unix: -1 })
  // // .limit(1);

  // //let currentMaxTimestamp = latestEntry ? Number(latestEntry.timestamp_unix) : 0

  // console.time("for")

  // for (const marker of objects) {

  //   var {Body} = await client.send(
  //     new GetObjectCommand({
  //       Bucket:BUCKET_NAME,
  //       Key:marker
  //     })
  //   )

  //   Papa.parse(await Body.transformToString(), {
  //     header: true, // Para incluir los nombres de las columnas como propiedades
  //     complete: (result) => {

  //       const jsonData = result.data
  //         .filter((obj) => obj.timestamp_unix !== '' && obj.missing_value_reason !== "device_not_recording" && obj.missing_value_reason !== "device_not_worn_correctly")
  //         .map((obj) => {
  //           if(lastEntries.length !==0){
  //             if(Number(obj.timestamp_unix) > participantes.get(obj.participant_full_id)){
  //               obj.timestamp_iso = unixToIso(Number(obj.timestamp_unix))
  //               return obj
  //             }else{
  //               return undefined
  //             }
  //           }else{
  //             obj.timestamp_iso = unixToIso(Number(obj.timestamp_unix))
  //             return obj
  //           }
  //         }).filter(Boolean);
    
  //       try {

  //         digital_markers = [...digital_markers,jsonData]

  //       } catch (error) {
  //         console.error(error);
  //       }
  //     }
  //   });
  // };

  // console.timeEnd("for")

  // let result = mergeObjects(digital_markers)

  // console.time("guardado")

  // result = result.map((obj)=> {
  //   if(Number(obj.wearing_detection_percentage)<=75){
  //     return undefined
  //   }else{
  //     return obj
  //   }
  // }).filter(Boolean);

  // console.log(result.length)
  


  // if (result.length) {
  //   await insertDataInBatches(result);
  // } else {
  //   console.warn("No hay documentos para insertar.");
  // }

  // console.timeEnd("guardado")
}

