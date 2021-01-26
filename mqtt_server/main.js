const mqtt = require("mqtt")

const handleRequests = require("./handleRequests")
const handleInterfaces = require("./handleInterfacesSettings")
const handleCommands = require("./handleCommands")
const handleSensors = require("./handleSensors")

const availableModes = require("./settings")

const acceptableTopics = require("./acceptableTopics")

const fs = require('fs');
const path = require("path")

let subscribedTopics = ['sensors/log/+', 'sensors/data/+', 'wills', 'request/#', "interfaces/#", "command/#"];

const PythonInterpreter = require("../python_shell/main")
class LimboServer{

    MQTTState={
        connected: false,
        mqttBrokerIP: "",
        protocol: "WS"
    }

    state={
        gesture: null,
        onlineInterface: null,
        mode: null,
        recording: false,
        run: false,
        pipelineCreated: false
    }

    client;

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

    updateAfterSet(path, newValue){
        this.send(path, newValue.toString())
    }

    setMode(newMode){
        if(this.getServerMode() === newMode)
            this.serverLogs("Server is already using " + this.getServerMode() + " mode", "warning", true)

        else if(availableModes.modes[newMode]) {
            this.state.mode = newMode;
            setTimeout(() => {
                this.updateAfterSet("server/state/mode", this.state.mode);
                this.serverLogs(`New server mode: ${this.state.mode}.`, "success");
            },100)
        }
        else{
            this.serverLogs("Received unknown server mode: " + newMode, "warning", true)

            console.log("Available options are: ")
            Object.keys(availableModes.modes).forEach((el)=>{
                console.log("\x1b[34m%s\x1b[0m", "- " + el);
            })
        }
    }

    setInterface(newInterface){
        if(this.getOnlineInterface() === newInterface)
            this.serverLogs("Server is already using " + this.getOnlineInterface() + " interface", "warning", true)

        else if(this.interfacesConfig[newInterface]) {
            this.state.onlineInterface = newInterface;
            setTimeout(() => {
                this.updateAfterSet("server/state/onlineInterface", this.state.onlineInterface);
                this.serverLogs(`New online interface: ${this.state.onlineInterface}.`, "info");
            },100)
        }
        else{
            this.serverLogs("Received unknown interface name: " + newInterface, "warning", true)

            console.log("Configured interfaces are: ")
            Object.keys(this.interfacesConfig).forEach((el)=>{
                console.log("\x1b[34m%s\x1b[0m", "- " + el);
            })
        }
    }

    setGesture(_gesture){
        this.state.gesture = _gesture;
        setTimeout(() => {this.updateAfterSet("server/state/gesture", this.state.gesture)}, 100);
    }

    setServerState(newState){
        this.MQTTState = {...this.MQTTState, ...newState};
        this.send("server/MQTTState", JSON.stringify(this.MQTTState));
        //TODO UpdateAfterSet
    }

    // UTILITIES ------------------------------

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
        this.pipeline.scripts.fine_tuner.send(JSON.stringify(objToSend));
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

    addNewInterface(newInterface, data){

        if(this.interfacesConfig[newInterface])
            this.serverLogs("Interface '" + newInterface + "' already exists. Remove it or choose different name for the new one.", "warning");

        else{
            this.interfacesConfig[newInterface]=data
            this.serverLogs("Newly created interface configuration '" + newInterface + "' had been saved.", "success", true);
        }
        this.saveInterfaces();
    }

    startCreatingPipeline(){
        if(this.isAnyInterfaceOnline() && this.getServerMode() && !this.state.run && !this.state.pipelineCreated)
            this.createPipeline()
        else
            this.serverLogs("Couldn't create Pipeline. Check server state.", "warning", true)

    }

    createPipeline(){
        let newPipeline = {
            scripts:{},
            utilities:{
                mem1: 0,
                mem2: 0
            }
        }

        let defaultOptions = {
            mode: 'text',
            scriptPath: './python_scripts/',
            pythonOptions: ['-u'], // get print results in real-time
        };

        let onlineConfiguration = this.interfacesConfig[this.getOnlineInterface()];

        let preprocessorOpt = {...defaultOptions, args: onlineConfiguration.preprocessor}
        let fineTunerOpt = {...defaultOptions, args: onlineConfiguration.fine_tuner}
        let classifierOpt = {...defaultOptions, args: onlineConfiguration.classifier}

        //IDLE
        newPipeline.scripts.preprocessor = PythonInterpreter.spawn("00_preprocess.py", (message) => {
            this.postPreprocessing(message)
        }, preprocessorOpt)
        this.serverLogs("Starting preprocessor ....", "info", true)

        //LEARN
        if(this.state.mode === "learn")
        {
            newPipeline.scripts.fine_tuner = PythonInterpreter.spawn("01_fine_tune.py", (message) => {
                this.postFineTune(message)
            }, fineTunerOpt)
            this.serverLogs("Starting fine_tuner ....", "info", true)
        }

        //PREDICT
        else if(this.state.mode === "predict"){
            newPipeline.scripts.classifier = PythonInterpreter.spawn("02_classify.py", (message) => {
                this.postClassifier(message)
            }, classifierOpt)
            this.serverLogs("Starting classifier ....", "info", true)
        }

        this.pipeline = newPipeline
        this.state.pipelineCreated = true;
        //TODO jeśli któryś ze skryptów sie wywyalił to nie twórz pipelinu
    }

    startPipeline(){
        if(this.state.pipelineCreated){
            if(!this.state.run){
                this.state.run = true;
                this.serverLogs("Pipeline has been started", "info", true)
            }
            else
                this.serverLogs("Pipeline is already running", "warning", true)
        }
        else
            this.serverLogs("There is no pipeline", "warning", true)
    }

    stopPipeline(){
        if(this.state.pipelineCreated){
            if(this.state.run){
                this.state.run = false;
                this.serverLogs("Pipeline has been stopped", "info", true)
            }
            else
                this.serverLogs("Pipeline hasn't been started yet", "warning", true)
        }
        else
            this.serverLogs("There is no pipeline", "warning", true)
    }

    startDestroyingPipeline(){
        if(this.state.pipelineCreated){
            if(!this.state.run){
                this.destroyPipeline();
            }
            else{
                this.serverLogs("First you must stop current pipeline", "warning")
            }
        }
        else{
            this.serverLogs("There is no pipeline created", "warning", false);

        }
    }

    destroyPipeline(){
        for(const [key, value] of Object.entries(this.pipeline.scripts)){
            value.end();
        }
        this.state.pipelineCreated = false;
    }

    clearCache(){
        this.pipeline.utilities.mem1 = 0
        this.pipeline.utilities.mem2 = 0
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

        let colors = {
            NEUTRAL: "\x1b[37m%s\x1b[0m",
            SUCCESS: "\x1b[32m%s\x1b[0m",
            INFO: "\x1b[34m%s\x1b[0m",
            WARNING: "\x1b[33m%s\x1b[0m",
            ERROR: "\x1b[31m%s\x1b[0m"
        }

        console.log(colors[upperCaseType], upperCaseType + ": " + payload + " from " + source);
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
            this.pipeline.utilities.mem2 +=1;

        if(this.isInterfaceOnline(_interface))
            this.pipeline.scripts.preprocessor.send(message);
        else
            this.serverLogs("Interface '" + _interface + "' is not used at the moment. First you must turn it on.", "warning", true);
    }

    postPreprocessing(message){

        let messageObject = {}
        try{
            messageObject = JSON.parse(message)
        }
        catch{
            this.serverLogs("Preprocessor returned invalid JSON.", "warning", true)
            return;
        }

        if(messageObject["log"]){
            this.handleScriptLog(messageObject["log"]);
        }

        if(this.state.mode === "idle"){
            console.log(messageObject)
        }

        else if(this.state.mode === "predict" && !messageObject.log){
            this.pipeline.scripts.classifier.send(JSON.stringify(messageObject));
        }

        else if(this.state.mode === "learn" && this.state.recording && !messageObject.log){

            // console.log("\n\nData from preprocessor: " + JSON.stringify(messageObject));

            try{
                // messageObject = JSON.parse(message);
                messageObject["label"] = this.state.gesture;
                messageObject["command"] = "gather";

                // console.log("Do fine tune probuje wyslac: " )
                // console.log( JSON.stringify(messageObject))
                this.pipeline.utilities.mem1 +=1;

                this.pipeline.scripts.fine_tuner.send(JSON.stringify(messageObject));
            }
            catch{
                this.serverLogs("Something went wrong")
            }
        }

    }

    postClassifier(message){
        let messageObject = {}
        try{
            messageObject = JSON.parse(message)
        }
        catch{
            this.serverLogs("Classifier returned invalid JSON.", "warning", true)
            return;
        }

        if (messageObject["log"]){
            let logVar = messageObject.log;
            this.handleScriptLog(logVar);
        }

        if(!messageObject.log){
            this.send("ClassificationResults", JSON.stringify(messageObject));
            console.log("-----\n")
            console.log(messageObject);
            console.log("\n")
        }

    }

    postFineTune(message){
        let messageObject = {}
        try {
            messageObject = JSON.parse(message)
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

                this.send("finetuneResults", JSON.stringify(messageObject.data))

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


        setTimeout(() => {this.state.recording = true},500)

        this.serverLogs("Recording Started");
        this.sendToSensor(this.state.onlineInterface, "start");

        setTimeout(()=>{this.finishRecording()}, 4000)
    }

    finishRecording(){
        this.state.recording = false;
        this.serverLogs("Recording finished");
        this.sendToSensor(this.state.onlineInterface, "stop");

        this.serverLogs("Received " + this.pipeline.utilities.mem2 + " packets of data.")
        this.serverLogs("Processed " + this.pipeline.utilities.mem1 + " packets of data.")
        this.clearCache();
    }

    // CONNECTION ---------------------

    listen(ip){

        let options = {
            clientId: "LimboServer",
            reconnectPeriod: 5
        }

        if(this.MQTTState.connected)
            return

        const client = mqtt.connect(ip, options);

        client.on("disconnect", () => {
            this.setServerState(
                {
                    connected: false,
                    mqttBrokerIP: "",
                    protocol: ""
                }
            );
        })
        client.on("connect", () => {

            this.setServerState(
                {
                    connected: true,
                    mqttBrokerIP: ip,
                    protocol: "WS"
                }
            );

            console.log("\x1b[32m", "✔ Connected to MQTT Broker at URL: " + this.MQTTState.mqttBrokerIP + " (2/2)\x1b[0m");

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

exports.limbo_server = LimboServer