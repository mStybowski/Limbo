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
        console.log("Info: Changed mode to: " + mode);
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
            cache: []
        }

    }

    createPipeline(_interface){
        if(this.interfacesConfig[_interface]){

            let newPipeline = this.configurePipelineFor(_interface);
            this.savePipeline(_interface, newPipeline);

            console.log("Success: Created " + this.onlineInterface + " interface.");
        }

        else
            console.log("Warning: There is no " + _interface +" interface configuration available. Skipped this one.")
    
    }

    savePipeline(_interface, _pipeline){
        this.onlineInterface = _interface;
        this.pipeline = _pipeline;
    }

    clearCache(){
        this.pipeline.cache = [];
    }

    // MQTT LOGS PUBLISHER --------------------

    serverLogs(_payload, type="info", verbose=false){
        let messageObject = {
            payload: _payload,
            type: type,
            verbose
        }
        this.client.publish("serverLogs", JSON.stringify(messageObject));
    }

    // Data handlers --------------------------

    handleRawData(_interface, message){
        if(this.isInterfaceOnline(_interface))
            this.pipeline.preprocessor.send(message);
        else
            console.log("Info: Interface '" + _interface + "' is not used at the moment. First you must turn it on.");
    }

    postPreprocessing(message){

        if(this.state.mode === "idle"){
            console.log(message)
        }

        else if(this.state.mode === "predict"){
            this.pipeline.classifier.send(message);
        }

        else if(this.state.mode === "learn" && this.recording){

            let featuresArray = [];
            let messageObject = {};

            try{
                messageObject = JSON.parse(message);
                featuresArray = messageObject["features"];

                featuresArray.forEach((el)=>{
                    this.pipeline.cache.push(el);
                });
            }
            catch{
                console.log("Odebrano niepoprawne dane")
            }
        }

    }

    postClassifier(message){
        console.log("From classifier: " + message);
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
        console.log("Info: Recording Started");
        this.serverLogs("Recording Started");

        setTimeout(()=>{this.recording = false; this.sendLearningBuffer()}, 3500)
    }

    sendLearningBuffer(){

        let objToSend = {
            features:this.pipeline.cache,
            label: this.currentGesture,
            command: "gather"
        }
        console.log("Info: Recording finished");

        this.pipeline.fine_tuner.send(JSON.stringify(objToSend));

        this.serverLogs("Recording finished");

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
                    client.publish('presence', 'Hello mqtt from server')
                }
            })
        })
        client.on("error", (err)=>{
            console.log("Error: Could not connect to MQTT Broker.\nPlease check your MQTT Broker settings.")
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
                console.log("\x1b[33m%s\x1b[0m", "\n⚠️ Warning: Invalid topic: " + topic + "\n")
                console.log("Available options are: ")

                acceptableTopics[parsedTopic[0]].forEach((el)=>{
                    console.log("\x1b[34m%s\x1b[0m", "🔹" + el);
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
                console.log("Warning: Server received message at invalid topic: " + parsedTopic[0])
        })
        this.client = client;
    }
}

function validateTopic(baseTopic, topic){

    return acceptableTopics[baseTopic].includes(topic)
}

module.exports = MQTTClient