import mongoose from 'mongoose';

const shellySchema = new mongoose.Schema({
    timestamp_unix: String,
    apower: Number,
    participante: Number,
});

export default mongoose.model('Shelly', shellySchema);