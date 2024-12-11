import csv
import os
from avro.datafile import DataFileReader
from avro.io import DatumReader
import json

# Ruta de entrada y salida
avro_file_path = "/Users/michaelvilches/Desktop/apps/plataforma-bienestar/datosS3/1/1/participant_data/2024-10-27/00000001-3YK651D13H/raw_data/v6/1-1-00000001_1730009597.avro"
output_dir = "/Users/michaelvilches/Desktop/apps/plataforma-bienestar/datosAvro"

# Leer el archivo AVRO
reader = DataFileReader(open(avro_file_path, "rb"), DatumReader())
data = next(reader)

# Función para calcular los timestamps
def calculate_timestamps(sensor_data, length_key="values"):
    """
    Calcula los timestamps para un sensor.
    - sensor_data: datos del sensor.
    - length_key: clave que indica qué lista usar para calcular la longitud.
    """
    if length_key not in sensor_data:
        raise ValueError(f"La clave '{length_key}' no está en los datos del sensor.")
    length = len(sensor_data[length_key])
    return [
        round(sensor_data["timestampStart"] + i * (1e6 / sensor_data["samplingFrequency"]))
        for i in range(length)
    ]

# Sensores que necesitan manejo especial
accelerometer = data["rawData"]["accelerometer"]
gyroscope = data["rawData"]["gyroscope"]

# Timestamps
timestamps_acc = calculate_timestamps(accelerometer, length_key="x")
timestamps_gyro = calculate_timestamps(gyroscope, length_key="x")
timestamps_eda = calculate_timestamps(data["rawData"]["eda"])
timestamps_tmp = calculate_timestamps(data["rawData"]["temperature"])
timestamps_bvp = calculate_timestamps(data["rawData"]["bvp"])
timestamps_steps = calculate_timestamps(data["rawData"]["steps"])

# Encontrar la intersección de timestamps
common_timestamps = set(timestamps_acc)
common_timestamps.intersection_update(timestamps_gyro, timestamps_eda, timestamps_tmp, timestamps_bvp, timestamps_steps)
common_timestamps = sorted(common_timestamps)

# Filtrar datos sincronizados
def filter_sensor_data(sensor_data, common_timestamps, length_key="values"):
    """
    Filtra los datos de un sensor para incluir solo los timestamps comunes.
    """
    timestamps = calculate_timestamps(sensor_data, length_key)
    if length_key == "values":
        values = sensor_data[length_key]
    else:
        # Si es acelerómetro o giroscopio, devolver un diccionario
        values = {
            "x": sensor_data["x"],
            "y": sensor_data["y"],
            "z": sensor_data["z"],
        }
    filtered_values = {
        key: [values[key][timestamps.index(ts)] for ts in common_timestamps if ts in timestamps]
        for key in values
    } if isinstance(values, dict) else [
        values[timestamps.index(ts)] for ts in common_timestamps if ts in timestamps
    ]
    return filtered_values

# Filtrar datos
acc = filter_sensor_data(accelerometer, common_timestamps, length_key="x")
gyro = filter_sensor_data(gyroscope, common_timestamps, length_key="x")
eda = filter_sensor_data(data["rawData"]["eda"], common_timestamps)
tmp = filter_sensor_data(data["rawData"]["temperature"], common_timestamps)
bvp = filter_sensor_data(data["rawData"]["bvp"], common_timestamps)
steps = filter_sensor_data(data["rawData"]["steps"], common_timestamps)

# Crear un archivo CSV combinado
output_file = os.path.join(output_dir, 'combined_sensors.csv')
with open(output_file, 'w', newline='') as f:
    writer = csv.writer(f)
    # Escribir encabezados
    writer.writerow([
        "timestamp", "acc_x", "acc_y", "acc_z", "gyro_x", "gyro_y", "gyro_z",
        "eda", "temperature", "bvp", "steps"
    ])
    # Escribir datos sincronizados
    for i, ts in enumerate(common_timestamps):
        writer.writerow([
            ts, acc["x"][i], acc["y"][i], acc["z"][i],
            gyro["x"][i], gyro["y"][i], gyro["z"][i],
            eda[i], tmp[i], bvp[i], steps[i]
        ])

print(f"Archivo CSV combinado creado en {output_file}")

