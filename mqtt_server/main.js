const mqtt = require("mqtt")

const handleRequests = require("./handleRequests")
const handleInterfaces = require("./handleInterfacesSettings")
const handleCommands = require("./handleCommands")
const handleSensors = require("./handleSensors")

const acceptableTopics = require("./acceptableTopics")

const fs = require('fs');
const path = require("path")

let subscribedTopics = ['sensors/log/+', 'sensors/data/+', 'wills', 'request/#', "interfaces/#", "command/#"];

const PythonInterpreter = require("../python_shell/main")
class MQTTClient{

    client;

    state={
        connected: false,
        mqttBrokerIP: "",
        mode: "idle"
    }
    
    onlineInterface;
    pipeline = {};
    recording = false;

    // GETTERS -------------------------------

    getInterfacesConfiguration(){
        return this.interfacesConfig;
    }

    getServerMode(){
        return this.state.mode;
    }

    getOnlineInterface(){
        return this.onlineInterface;
    }

    // SETTERS ------------------------------

    setMode(mode){
        this.clearCache();

        if(this.getServerMode() === "learn" && mode !== "learn"){
            this.finishLearnMode();
        }
        this.state.mode = mode;
        this.serverLogs("Changed mode to " + mode, "info", true);
    }

    setOnlineInterface(newInterface){
        this.onlineInterface = newInterface;
    }

    setGesture(gesture){
        this.currentGesture = gesture;
    }

    setServerState(newState){
        this.state = {...this.state, ...newState};
        this.send("server/state", JSON.stringify(this.state));
    }

    // UTILITIES ------------------------------

    send(topic, message){
        this.client.publish(topic, message);
    }

    sendToSensor(sensorName, message, type="command"){
        let topic = "sensors/control/" + sensorName;

        let messageObject = {
            type:message
        }

        this.send(topic, JSON.stringify(messageObject));
    }

    finishLearnMode(){

        let objToSend = {
            features: [],
            label: "idle",
            command: "finish"
        }

        this.pipeline.fine_tuner.send(JSON.stringify(objToSend));
    }

    runOnce(script){
        PythonInterpreter.run(script, (err, res) => {console.log(res)})
    }

    isInterfaceOnline(_interface){
        return this.onlineInterface === _interface;
    }

    isAnyInterfaceOnline(){
        return this.onlineInterface;
    }

    isInterfaceConfigured(_interface){
        return this.interfacesConfig[_interface];
    }

    configurePipelineFor(interfaceName) {

        let interfaceConf = this.interfacesConfig[interfaceName];

        let defaultOptions = {
            mode: 'text',
            scriptPath: './python_scripts/',
            pythonOptions: ['-u'], // get print results in real-time
        };

        let preprocessorOpt = {...defaultOptions, args: ["-t", interfaceName, "-w", interfaceConf.time_window, "-s", interfaceConf.stride,"-b", interfaceConf.buffer_size]}
        let fineTunerOpt = {...defaultOptions, args: ["-f", "-t", interfaceName, "-m", ""]} //TODO wpisz sciezke do modelu. Ona jest stała.
        let classifierOpt = {...defaultOptions, args: ["-f", "-t", interfaceName, "-m", "blah.py"]} //TODO wpisz sciezke do modelu. Ona jest stała.

        return {
            preprocessor: PythonInterpreter.spawn("00_preprocess.py", (message) => {
                this.postPreprocessing(message)
            }, preprocessorOpt),
            fine_tuner: PythonInterpreter.spawn("01_fine_tune.py", this.postFineTune, fineTunerOpt),
            classifier: PythonInterpreter.spawn("02_classify.py", (message) => {
                this.postClassifier(message)
            }, classifierOpt),
            mem1: 0,
            mem2: 0
        }

    }

    createPipeline(_interface){
        if(this.interfacesConfig[_interface]){

            let newPipeline = this.configurePipelineFor(_interface);
            this.savePipeline(_interface, newPipeline);

            this.serverLogs("Created " + this.onlineInterface + " interface.", "success", true);
        }

        else
            this.serverLogs("There is no " + _interface +" interface configuration available. Skipped this one.", "warning", true)
    
    }

    savePipeline(_interface, _pipeline){
        this.onlineInterface = _interface;
        this.pipeline = _pipeline;
    }

    clearCache(){
        this.pipeline.mem1 = 0
        this.pipeline.mem2 = 0
    }

    // MQTT LOGS PUBLISHER --------------------

    serverLogs(_payload, type="info", verbose=false){
        let messageObject = {
            payload: _payload,
            type: type,
            verbose
        }

        let typeUppercase = type.toUpperCase();
        this.client.publish("serverLogs", JSON.stringify(messageObject));

        let colors = {
            NEUTRAL: "\x1b[37m%s\x1b[0m",
            SUCCESS: "\x1b[32m%s\x1b[0m",
            INFO: "\x1b[34m%s\x1b[0m",
            WARNING: "\x1b[33m%s\x1b[0m",
            ERROR: "\x1b[31m%s\x1b[0m"
        }

        console.log(colors[typeUppercase],typeUppercase + ": " + _payload);
    }

    // Data handlers --------------------------

    handleRawData(_interface, message){
        this.pipeline.mem2 +=1;
        if(this.isInterfaceOnline(_interface))
            this.pipeline.preprocessor.send(message);
        else
            this.serverLogs("Interface '" + _interface + "' is not used at the moment. First you must turn it on.", "warning", true);
    }

    postPreprocessing(message){

        if(this.state.mode === "idle"){
            console.log(message)
        }

        else if(this.state.mode === "predict"){
            this.pipeline.classifier.send(message);
        }

        else if(this.state.mode === "learn" && this.recording){

            // let featuresArray = [];
            let messageObject = {};

            try{
                messageObject = JSON.parse(message);
                messageObject["label"] = this.currentGesture;
                messageObject["command"] = "gather";
                this.pipeline.mem1 +=1;
                this.pipeline.fine_tuner.send(JSON.stringify(messageObject));
                // featuresArray = messageObject["features"];

                // featuresArray.forEach((el)=>{
                //     this.pipeline.cache.push(el);
                // });
            }
            catch{
                this.serverLogs("Odebrano niepoprawne dane")
            }
        }

    }

    postClassifier(message){
        console.log("From classifier: " + message + "\n\n------------------\n");
    }

    postFineTune(message){
        console.log(message);
    }

    // INTERFACES --------------------------

    loadInterfaces(){
        let rawData = fs.readFileSync('./conf/interfaces.json');
        this.interfacesConfig = JSON.parse(rawData.toString());
        this.saveInterfaces();
    }

    saveInterfaces(){
        fs.writeFileSync('./conf/interfaces.json', JSON.stringify(this.interfacesConfig));
    }

    startRecording(){
        this.clearCache();
        this.recording = true;
        this.serverLogs("Recording Started");
        this.sendToSensor(this.onlineInterface, "start");


        setTimeout(()=>{this.finishRecording()}, 3500)
    }

    finishRecording(){
        this.recording = false;
        this.serverLogs("Recording finished");
        this.sendToSensor(this.onlineInterface, "stop");

        this.serverLogs("Received " + this.pipeline.mem2 + " packets of data.")
        this.serverLogs("Processed " + this.pipeline.mem1 + " packets of data.")
        this.clearCache();
    }

    // CONNECTION ---------------------

    listen(ip){

        let options = {
            clientId: "LimboServer",
            reconnectPeriod: 5
        }

        if(this.state.connected)
            return

        const client = mqtt.connect(ip, options);
        

        client.on("disconnect", () => {
            this.setServerState(
                {
                    connected: false,
                    mqttBrokerIP: "",
                    mode: "idle"
                }
            );
        })
        client.on("connect", () => {

            this.setServerState(
                {
                    connected: true,
                    mqttBrokerIP: ip,
                    mode: "idle"
                }
            );

            console.log("\x1b[32m", "✔ Connected to MQTT Broker at URL: " + this.state.mqttBrokerIP + " (2/2)\x1b[0m");

            client.subscribe(subscribedTopics, function (err) {
                if (!err) {
                    client.publish('serverLogs', 'Server succesfully connected!')
                }
            })
        })
        client.on("error", (err)=>{
            this.serverLogs("Could not connect to MQTT Broker. Please check your MQTT Broker settings.", "error", true)
            client.end();
        })

        client.on("message", (topic, mess)=>{

            let parsedTopic = topic.split('/');

            // SENSORS
            if(parsedTopic[0] === "sensors"){
                handleSensors(this, topic, mess);
                return;
            }

            if(!validateTopic(parsedTopic[0], topic)){
                console.log("\x1b[33m%s\x1b[0m", "\nWarning: Invalid topic: " + topic + "\n")
                console.log("Available options are: ")

                acceptableTopics[parsedTopic[0]].forEach((el)=>{
                    console.log("\x1b[34m%s\x1b[0m", "- " + el);
                })

                return;
            }


            // GUI REQUESTS
            if(parsedTopic[0] === "request")
                handleRequests(this, parsedTopic, mess);



            // INTERFACES
            else if(parsedTopic[0] === "interfaces"){
                handleInterfaces(this, topic, mess);
            }

            else if(parsedTopic[0] === "command"){
                handleCommands(this, parsedTopic, mess)
            }
            else
                this.serverLogs("Server received message at invalid topic: " + parsedTopic[0], "warning")
        })
        this.client = client;
    }
}

function validateTopic(baseTopic, topic){

    return acceptableTopics[baseTopic].includes(topic)
}

module.exports = MQTTClient