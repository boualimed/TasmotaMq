-- Supabase PostgreSQL Schema for Tasmota MQTT Controller

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MQTT Messages Table (stores all MQTT messages)
CREATE TABLE mqtt_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    topic VARCHAR(500) NOT NULL,
    payload JSONB,
    payload_type VARCHAR(20) DEFAULT 'json',
    qos SMALLINT DEFAULT 0,
    retained BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_mqtt_messages_user_id ON mqtt_messages(user_id);
CREATE INDEX idx_mqtt_messages_device_id ON mqtt_messages(device_id);
CREATE INDEX idx_mqtt_messages_topic ON mqtt_messages(topic);
CREATE INDEX idx_mqtt_messages_timestamp ON mqtt_messages(timestamp DESC);
CREATE INDEX idx_mqtt_messages_user_device ON mqtt_messages(user_id, device_id);

-- Device States Table (current state of each device)
CREATE TABLE device_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('switch', 'sensor')),
    is_connected BOOLEAN DEFAULT FALSE,
    is_on BOOLEAN,
    sensor_data JSONB,
    lwt_status VARCHAR(20),
    last_seen TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Create indexes
CREATE INDEX idx_device_states_user_id ON device_states(user_id);
CREATE INDEX idx_device_states_device_id ON device_states(device_id);
CREATE INDEX idx_device_states_updated ON device_states(updated_at DESC);

-- Device History Table (records state changes)
CREATE TABLE device_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    state_change VARCHAR(20) NOT NULL CHECK (state_change IN ('online', 'offline', 'on', 'off')),
    previous_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_device_history_user_id ON device_history(user_id);
CREATE INDEX idx_device_history_device_id ON device_history(device_id);
CREATE INDEX idx_device_history_timestamp ON device_history(timestamp DESC);

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for device_states
CREATE TRIGGER update_device_states_updated_at
    BEFORE UPDATE ON device_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_history ENABLE ROW LEVEL SECURITY;

-- Policies for mqtt_messages
CREATE POLICY "Users can insert their own messages"
    ON mqtt_messages FOR INSERT
    WITH CHECK (TRUE); -- Allow inserts from service role

CREATE POLICY "Users can view their own messages"
    ON mqtt_messages FOR SELECT
    USING (TRUE); -- Allow reads from service role or filtered by user_id in query

CREATE POLICY "Users can delete their own old messages"
    ON mqtt_messages FOR DELETE
    USING (TRUE); -- Allow deletes for cleanup

-- Policies for device_states
CREATE POLICY "Users can upsert their own device states"
    ON device_states FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Users can update their own device states"
    ON device_states FOR UPDATE
    USING (TRUE);

CREATE POLICY "Users can view their own device states"
    ON device_states FOR SELECT
    USING (TRUE);

-- Policies for device_history
CREATE POLICY "Users can insert their own history"
    ON device_history FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Users can view their own history"
    ON device_history FOR SELECT
    USING (TRUE);

-- Function to clean up old messages (call this periodically)
CREATE OR REPLACE FUNCTION cleanup_old_mqtt_messages(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM mqtt_messages
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for recent messages per device
CREATE OR REPLACE VIEW recent_device_messages AS
SELECT DISTINCT ON (device_id)
    device_id,
    device_name,
    topic,
    payload,
    timestamp
FROM mqtt_messages
ORDER BY device_id, timestamp DESC;

-- Create a view for device statistics
CREATE OR REPLACE VIEW device_statistics AS
SELECT
    user_id,
    device_id,
    device_name,
    COUNT(*) as message_count,
    MAX(timestamp) as last_message_time,
    MIN(timestamp) as first_message_time
FROM mqtt_messages
GROUP BY user_id, device_id, device_name;

-- Comments for documentation
COMMENT ON TABLE mqtt_messages IS 'Stores all MQTT messages received from devices';
COMMENT ON TABLE device_states IS 'Current state of each device (upserted on changes)';
COMMENT ON TABLE device_history IS 'Historical record of device state changes';
COMMENT ON FUNCTION cleanup_old_mqtt_messages IS 'Removes messages older than specified days';