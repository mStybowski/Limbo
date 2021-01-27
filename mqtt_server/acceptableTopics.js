module.exports = {
    request: ["request/pipelineCreated","request/state", "request/run", "request/mode", "request/gesture", "request/recording", "request/onlineInterface", "request/interfacesConfiguration"],
    command: ["command/dp", "command/destroyPipeline", "command/stopPipeline", "command/stop", "command/startPipeline", "command/start", "command/createPipeline", "command/cp", "command/useMode", "command/gesture", "command/startRecording", "command/runScript", "command/controlSensor", "command/finishLearn"],
    interfaces: ["interfaces/add", "interfaces/edit", "interfaces/remove", "interfaces/use", "interfaces/unset"],
    sensors: ["sensors/data", "sensors/control", "sensors/log"]
  }