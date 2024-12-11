from avro.datafile import DataFileReader
from avro.io import DatumReader
import json
import csv
import os




avro_file_path = "/Users/michaelvilches/Desktop/apps/plataforma-bienestar/datosS3/1/1/participant_data/2024-10-27/00000001-3YK651D13H/raw_data/v6/1-1-00000001_1730009597.avro"
output_dir = "./output/avro"
## Read Avro file
reader = DataFileReader(open(avro_file_path, "rb"), DatumReader())
schema = json.loads(reader.meta.get('avro.schema').decode('utf-8'))
data= next(reader)
## Print the Avro schema
print(schema)

## Export sensors data to csv files

# Accelerometer
acc = data["rawData"]["accelerometer"]
timestamp = [round(acc["timestampStart"] + i * (1e6 / acc["samplingFrequency"]))
 for i in range(len(acc["x"]))]


print(acc["samplingFrequency"])

# Convert ADC counts in g
delta_physical = acc["imuParams"]["physicalMax"] - acc["imuParams"]["physicalMin"]
delta_digital = acc["imuParams"]["digitalMax"] - acc["imuParams"]["digitalMin"]
x_g = [val * delta_physical / delta_digital for val in acc["x"]]
y_g = [val * delta_physical / delta_digital for val in acc["y"]]
z_g = [val * delta_physical / delta_digital for val in acc["z"]]
with open(os.path.join(output_dir, 'accelerometer.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "x", "y", "z"])
 writer.writerows([[ts, x, y, z] for ts, x, y, z in zip(timestamp, x_g, y_g, z_g)])
 
# Gyroscope
gyro = data["rawData"]["gyroscope"]
timestamp = [round(gyro["timestampStart"] + i * (1e6 / gyro["samplingFrequency"]))
 for i in range(len(gyro["x"]))]
with open(os.path.join(output_dir, 'gyroscope.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "x", "y", "z"])
 writer.writerows([[ts, x, y, z] for ts, x, y, z in zip(timestamp, gyro["x"], gyro["y"], gyro["z"])])

print(gyro["samplingFrequency"])

# Eda
eda = data["rawData"]["eda"]
timestamp = [round(eda["timestampStart"] + i * (1e6 / eda["samplingFrequency"]))
 for i in range(len(eda["values"]))]
with open(os.path.join(output_dir, 'eda.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "eda"])
 writer.writerows([[ts, eda] for ts, eda in zip(timestamp, eda["values"])])

print(eda["samplingFrequency"])

# Temperature
tmp = data["rawData"]["temperature"]
timestamp = [round(tmp["timestampStart"] + i * (1e6 / tmp["samplingFrequency"]))
 for i in range(len(tmp["values"]))]
with open(os.path.join(output_dir, 'temperature.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "temperature"])
 writer.writerows([[ts, tmp] for ts, tmp in zip(timestamp, tmp["values"])])

print(tmp["samplingFrequency"])

# Tags
tags = data["rawData"]["tags"]
with open(os.path.join(output_dir, 'tags.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["tags_timestamp"])
 writer.writerows([[tag] for tag in tags["tagsTimeMicros"]])



# BVP
bvp = data["rawData"]["bvp"]
timestamp = [round(bvp["timestampStart"] + i * (1e6 / bvp["samplingFrequency"]))
 for i in range(len(bvp["values"]))]
with open(os.path.join(output_dir, 'bvp.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "bvp"])
 writer.writerows([[ts, bvp] for ts, bvp in zip(timestamp, bvp["values"])])

print(bvp["samplingFrequency"])

# Systolic peaks
sps = data["rawData"]["systolicPeaks"]
with open(os.path.join(output_dir, 'systolic_peaks.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["systolic_peak_timestamp"])
 writer.writerows([[sp] for sp in sps["peaksTimeNanos"]])


# Steps
steps = data["rawData"]["steps"]
timestamp = [round(steps["timestampStart"] + i * (1e6 / steps["samplingFrequency"]))
 for i in range(len(steps["values"]))]
with open(os.path.join(output_dir, 'steps.csv'), 'w', newline='') as f:
 writer = csv.writer(f)
 writer.writerow(["unix_timestamp", "steps"])
 writer.writerows([[ts, step] for ts, step in zip(timestamp, steps["values"])])

print(steps["samplingFrequency"])