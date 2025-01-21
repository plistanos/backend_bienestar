import axios from 'axios'
import Shelly from '../models/Shelly.js';


export const getStatus = () => {
  const ahora = Date.now(); // Timestamp Unix en milisegundos
  const milisegundosHastaSiguienteSegundo = 1000 - (ahora % 1000); // Tiempo hasta el siguiente segundo exacto

  setTimeout(() => {
    const timestampInicio = Math.floor(Date.now() / 1000); // Primer timestamp Unix sincronizado
    console.log("Primer timestamp exacto:", timestampInicio);

    // Usa setInterval para ejecutar cada segundo exacto
    setInterval(async() => {
      const timestampActual = Math.floor(Date.now() / 1000); // Timestamp Unix actual en segundos
      const {data} = await axios.post('https://shelly-131-eu.shelly.cloud/device/status?id=84fce63ffc80&auth_key=Mjk1MDFmdWlkAED068288FAECC11034434A31B9D7E4FC77CE32B879D280F257A8CE2C9511CBF0C7303F6CDB93349')
      
      console.log(`${data.data.device_status["switch:0"].apower} ${timestampActual}`);
      const shellyData = new Shelly()

      shellyData.apower = data.data.device_status["switch:0"].apower;
      shellyData.timestamp_unix = timestampActual;

      await shellyData.save()

      // Aquí puedes usar el timestamp actual
    }, 1000);
  }, milisegundosHastaSiguienteSegundo);
}