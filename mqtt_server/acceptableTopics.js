module.exports = {
    request: ["request/state", "request/mode", "request/files", "request/onlineInterface", "request/interfacesConfiguration"],
    command: ["command/stopPipeline", "command/stop", "command/startPipeline", "command/start", "command/createPipeline", "command/cp", "command/useMode", "command/gesture", "command/startRecording", "command/runScript", "command/controlSensor", "command/finishLearn"],
    interfaces: ["interfaces/add", "interfaces/edit", "interfaces/remove", "interfaces/use", "interfaces/end"],
    sensors: ["sensors/data/emg", "sensors/control/emg", "sensors/log/emg", "sensors/data/mmg", "sensors/control/mmg", "sensors/log/mmg"]
  }