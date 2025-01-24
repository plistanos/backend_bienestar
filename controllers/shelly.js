import axios from 'axios'
import Shelly from '../models/Shelly.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

const mode = process.env.SHELLY_MODE;

const url = mode === 'local' ? process.env.SHELLY_URL_LOCAL : `${process.env.SHELLY_URL_CLOUD}?id=${process.env.SHELLY_ID}&auth_key=${process.env.SHELLY_AUTH_KEY}`;

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
          const {data} = await axios.get(url, {
            timeout: 5000 // 5 segundos de timeout
          });
          let shellyData;

          if (mode === 'local') {
            console.log(`${data.apower} ${timestampActual}`);
            shellyData = new Shelly({
              apower: data.apower,
              timestamp_unix: timestampActual
            });
          } else {
            console.log(`${data.data.device_status["switch:0"].apower} ${timestampActual}`);
            shellyData = new Shelly({
              apower: data.data.device_status["switch:0"].apower,
              timestamp_unix: timestampActual
            });
          }
          

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