import mongoose from 'mongoose';

const appleWSchema = new mongoose.Schema({
    heart_rate: String,
    oxygen_saturation: String,
    environmental_sound: String,
    timestamp_unix: String,
    steps: String,
    altitude: String,
    latitude: String,
    longitude: String
});

export default mongoose.model('AppleW', appleWSchema);
