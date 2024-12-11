import mongoose from 'mongoose';

const empaticaSchema = new mongoose.Schema({
    timestamp_unix: String,
    timestamp_iso: String,
    participant_full_id: String,
    accelerometers_std_g: String,
    missing_value_reason: String,
    counts_x_axis: String,
    counts_y_axis: String,
    counts_z_axis: String,
    vector_magnitude: String,
    activity_class: String,
    activity_counts: String,
    activity_intensity: String,
    body_position_left: String,
    body_position_right: String,
    eda_scl_usiemens: String,
    met: String,
    prv_rmssd_ms: String,
    pulse_rate_bpm: String,
    respiratory_rate_brpm: String,
    sleep_detection_stage: String,
    step_counts: String,
    temperature_celsius: String,
    wearing_detection_percentage: String
});

export default mongoose.model('Empatica', empaticaSchema);
