import axios from 'axios'
import Shelly from '../models/Shelly.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getStatus = async () => {
  const ahora = Date.now(); // Timestamp Unix en milisegundos
  const milisegundosHastaSiguienteSegundo = 1000 - (ahora % 1000); // Tiempo hasta el siguiente segundo exacto

  setTimeout(async () => {
    const timestampInicio = Math.floor(Date.now() / 1000); // Primer timestamp Unix sincronizado
    console.log("Primer timestamp exacto:", timestampInicio);

    // Usa setInterval para ejecutar cada segundo exacto
    setInterval(async () => {
      const timestampActual = Math.floor(Date.now()); // Timestamp Unix actual en segundos
      
      // Implementar reintentos
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const {data} = await axios.post('https://shelly-131-eu.shelly.cloud/device/status', null, {
            params: {
              id: '84fce63ffc80',
              auth_key: 'Mjk1MDFmdWlkAED068288FAECC11034434A31B9D7E4FC77CE32B879D280F257A8CE2C9511CBF0C7303F6CDB93349'
            },
            timeout: 5000 // 5 segundos de timeout
          });
          
          console.log(`${data.data.device_status["switch:0"].apower} ${timestampActual}`);
          const shellyData = new Shelly({
            apower: data.data.device_status["switch:0"].apower,
            timestamp_unix: timestampActual
          });

          await shellyData.save();
          break; // Si tiene éxito, salir del bucle de reintentos

        } catch (error) {
          retries++;
          console.error(`Error al obtener datos de Shelly (intento ${retries}/${MAX_RETRIES}):`, error.message);
          
          if (retries === MAX_RETRIES) {
            console.error('Máximo número de reintentos alcanzado');
            // Opcionalmente, guardar un registro con potencia 0 o null
            const shellyData = new Shelly({
              apower: null,
              timestamp_unix: timestampActual
            });
            await shellyData.save();
          } else {
            await sleep(RETRY_DELAY);
          }
        }
      }
    }, 1000);
  }, milisegundosHastaSiguienteSegundo);
}