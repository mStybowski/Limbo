const mqtt = require("mqtt")

const handleRequests = require("./handleRequests")
const handleInterfaces = require("./handleInterfacesSettings")
const handleCommands = require("./handleCommands")
const handleSensors = require("./handleSensors")

const acceptableTopics = require("./acceptableTopics")

const fs = require('fs');
const path = require("path")


let defaultOptions = {
    mode: 'text',
    scriptPath: './python_scripts/',
    pythonOptions: ['-u'], // get print results in real-time
};


let subscribedTopics = ['sensors/log/+', 'sensors/data/+', 'wills', 'request/#', "interfaces/#", "command/#"];

const PythonInterpreter = require("../python_shell/main")
class MQTTClient{

    client;

    state={
        connected: false,
        mqttBrokerIP: "",
        mode: "idle",
        onlineInterface: null,
        recording: false
    }

    pipeline = {};

    // GETTERS -------------------------------

    getInterfacesConfiguration(){
        return this.interfacesConfig;
    }

    getServerMode(){
        return this.state.mode;
    }

    getOnlineInterface(){
        return this.state.onlineInterface;
    }

    // SETTERS ------------------------------

    setMode(mode){
        this.clearCache();
        let fineTunerOpt = {...defaultOptions, args: ["-f", "-t", this.getOnlineInterface(), "-m", ""]}

        if(this.getServerMode() === "learn" && mode !== "learn"){
            this.finishLearnMode();
        }
        else if(mode === "learn" && this.isAnyScriptDown().includes("fine_tuner")){
            this.pipeline.fine_tuner = PythonInterpreter.spawn("01_fine_tune.py", this.postFineTune, fineTunerOpt);
        }
        this.state.mode = mode;
        this.serverLogs("Changed mode to " + mode, "info", true);
    }

    setOnlineInterface(newInterface){
        this.state.onlineInterface = newInterface;
    }

    setGesture(gesture){
        this.state.currentGesture = gesture;
    }

    setServerState(newState){
        this.state = {...this.state, ...newState};
        this.send("server/state", JSON.stringify(this.state));
    }

    // UTILITIES ------------------------------

    isAnyScriptDown(){
        let downScripts = [];
        if(this.state.onlineInterface){
            if(this.pipeline.preprocessor.terminated)
                downScripts.push("preprocessor")
            if(this.pipeline.fine_tuner.terminated)
                downScripts.push("fine_tuner")
            if(this.pipeline.classifier.terminated)
                downScripts.push("classifier")
        }
        return downScripts
    }

    send(topic, message){
        this.client.publish(topic, message);
    }

    sendToSensor(sensorName, message, type="command"){
        let topic = "sensors/control/" + sensorName;

        let messageObject = {
            command:message
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
        return this.state.onlineInterface === _interface;
    }

    isAnyInterfaceOnline(){
        return this.state.onlineInterface;
    }

    isInterfaceConfigured(_interface){
        return this.interfacesConfig[_interface];
    }

    configurePipelineFor(interfaceName) {

        let interfaceConf = this.interfacesConfig[interfaceName];



        let preprocessorOpt = {...defaultOptions, args: ["-t", interfaceName, "-w", interfaceConf.time_window, "-s", interfaceConf.stride]}
        let fineTunerOpt = {...defaultOptions, args: ["-f", "-t", interfaceName, "-m", ""]} //TODO wpisz sciezke do modelu. Ona jest stała.
        let classifierOpt = {...defaultOptions, args: ["-f", "-t", interfaceName, "-m", "blah.py"]} //TODO wpisz sciezke do modelu. Ona jest stała.

        return {
            preprocessor: PythonInterpreter.spawn("00_preprocess.py", (message) => {
                this.postPreprocessing(message)
            }, preprocessorOpt),
            fine_tuner: PythonInterpreter.spawn("01_fine_tune.py", (message) => {this.postFineTune(message)}, fineTunerOpt),
            classifier: PythonInterpreter.spawn("02_classify.py", (message) => {
                this.postClassifier(message)
            }, classifierOpt),
            mem1: 0,
            mem2: 0
        }

    }

    destroyPipeline(){
        this.pipeline.preprocessor.end();
        this.pipeline.classifier.end();
        this.pipeline.fine_tuner.end();
        this.clearCache()
        this.state.onlineInterface = null;
    }

    createPipeline(_interface){
        if(this.interfacesConfig[_interface]){

            let newPipeline = this.configurePipelineFor(_interface);
            this.savePipeline(_interface, newPipeline);

            this.serverLogs("Freshly configured pipeline for " + this.state.onlineInterface + " interface has been started. Good luck!", "success", true);
        }

        else
            this.serverLogs("There is no " + _interface +" interface configuration available. Check configuration file: interfaces.json.", "warning", true)
    
    }

    savePipeline(_interface, _pipeline){
        this.state.onlineInterface = _interface;
        this.pipeline = _pipeline;
    }

    clearCache(){
        this.pipeline.mem1 = 0
        this.pipeline.mem2 = 0
    }

    // MQTT LOGS PUBLISHERS --------------------

    serverLogs(_payload, type="info", verbose=false){

        let upperCaseType = type.toUpperCase();

        if(!this.isLogTypeCorrect(upperCaseType))
        {
            this.serverLogs("Received message from server of unknown type: :'" + type + "'")
        }

        let messageObject = {
            payload: _payload,
            type: upperCaseType,
            verbose
        }

        this.client.publish("serverLogs", JSON.stringify(messageObject));

        let colors = {
            NEUTRAL: "\x1b[37m%s\x1b[0m",
            SUCCESS: "\x1b[32m%s\x1b[0m",
            INFO: "\x1b[34m%s\x1b[0m",
            WARNING: "\x1b[33m%s\x1b[0m",
            ERROR: "\x1b[31m%s\x1b[0m"
        }

        console.log(colors[upperCaseType], upperCaseType + ": " + _payload);
    }

    scriptLogs(source="unspecified", payload="none", type="info"){

        let upperCaseType = type.toUpperCase();

        if(!this.isLogTypeCorrect(upperCaseType)){
            this.serverLogs("Received message from " + source + " of unknown type: :'" + type + "'")
            return;
        }

        let messageObject = {
            payload,
            type: upperCaseType,
            source
        }

        this.send("scriptLogs", JSON.stringify(messageObject));
    }

    sensorLogs(sensor="unspecified", payload="none", type="info"){

        let upperCaseType = type.toUpperCase();

        if(!this.isLogTypeCorrect(upperCaseType)){
            this.serverLogs("Received message from " + sensor + " of unknown type: :'" + type + "'")
            return;
        }

        let messageObject = {
            payload,
            type: upperCaseType,
            sensor
        }

        this.send("sensorLogs", JSON.stringify(messageObject));
    }

    isLogTypeCorrect(type){
        return (type === "WARNING" || type === "INFO" || type === "SUCCESS" || type === "ERROR" || type === "NEUTRAL")
    }

    // Data handlers --------------------------

    handleScriptLog(log){
        if(log["type"] && log["payload"] && log["source"])
            this.scriptLogs(log.source, log.payload, log.type)
        else
            this.serverLogs("Received invalid log from script", "warning");

    }

    handleRawData(_interface, message){
        if(this.state.recording)
            this.pipeline.mem2 +=1;

        if(this.isInterfaceOnline(_interface))
            this.pipeline.preprocessor.send(message);
        else
            this.serverLogs("Interface '" + _interface + "' is not used at the moment. First you must turn it on.", "warning", true);
    }

    postPreprocessing(message){

        let messageObject = {}
        try{
            messageObject = JSON.parse(message.toString())
        }
        catch{
            return;
        }

        if(messageObject["log"]){
            this.handleScriptLog(messageObject["log"]);
            return;
        }

        if(this.state.mode === "idle"){
            console.log(messageObject)
        }

        else if(this.state.mode === "predict"){
            this.pipeline.classifier.send(message);
        }

        else if(this.state.mode === "learn" && this.state.recording){

            // let featuresArray = [];
            let messageObject = {};

            try{
                messageObject = JSON.parse(message);
                messageObject["label"] = this.state.currentGesture;
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
        let messageObject = {}
        try{
            messageObject = JSON.parse(message.toString())
        }
        catch{
            this.serverLogs("Classifier returned invalid JSON.", "warning", true)
            return;
        }

        if (messageObject["log"]){
            let logVar = messageObject.log;
            this.handleScriptLog(logVar);
        }

        this.send("ClassificationResults", JSON.stringify(messageObject));
        console.log("\n-----")
        console.log(messageObject);
        console.log("-----\n")
    }

    postFineTune(message){
        let messageObject = {}
        try {
            messageObject = JSON.parse(message.toString())
        }
        catch{
            this.serverLogs("Fine_tuner returned invalid JSON.", "warning", true)
            return;
        }

        if(messageObject["log"]){
            let logVar = messageObject["log"];
            this.handleScriptLog(logVar);
        }

        if(messageObject["data"]){
            if(Object.keys(messageObject.data).length > 0){
                let data = messageObject.data;
                let dataKeys = Object.keys(messageObject.data);

                this.pipeline["fine_tune_results"] = data;

                console.log("Fine tuning results:")
                dataKeys.forEach((el)=>{
                    console.log(el + ": " + data[el])
                })
            }

        }
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
        this.state.recording = true;
        this.serverLogs("Recording Started");
        this.sendToSensor(this.state.onlineInterface, "start");


        setTimeout(()=>{this.finishRecording()}, 3500)
    }

    finishRecording(){
        this.state.recording = false;
        this.serverLogs("Recording finished");
        this.sendToSensor(this.state.onlineInterface, "stop");

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
