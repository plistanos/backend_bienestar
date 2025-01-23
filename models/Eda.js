import mongoose from 'mongoose';

const edaSchema = new mongoose.Schema({
    unix_timestamp: String,
    eda: Number
});

export default mongoose.model('EDA', edaSchema);