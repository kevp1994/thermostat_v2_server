const devices = new Map()

let _targetTemp = null

function getDevice(id) {
  return devices.get(id) || null
}

function setDevice(id, data) {
  const now = new Date().toISOString()
  const record = Object.assign({ receivedAt: now }, data)
  devices.set(id, record)
  return record
}

function listDevices() {
  return Array.from(devices.entries()).map(([id, data]) => ({ id, ...data }))
}

// Target temperature functions (in-memory)
function getTargetTemp() {
  return _targetTemp
}

function setTargetTemp(value) {
  _targetTemp = value
  return _targetTemp
}

module.exports = { getDevice, setDevice, listDevices, getTargetTemp, setTargetTemp }
