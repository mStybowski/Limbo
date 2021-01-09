const mqtt = require("mqtt")

const handleRequests = require("./handleRequests")
const handleDataFlow = require("./handleDataFlow")
const handleInterfaces = require("./handleInterfacesSettings")
const handleCommands = require("./handleCommands")

const testFolder = '../pythonScripts';
const fs = require('fs');
const path = require("path")
const PythonInterpreter = require("../python_shell/main")


// enum Mode = {
//     Idle = "idle",
//     Learn = "learn",
//     Predict = "predict"
// }

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
        this.state.mode = mode;
        console.log("Changed mode to: " + this.state.mode);
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
        console.log("Server state changed to: " + this.state);
    }

    // UTILITIES ------------------------------

    send(topic, message){
        this.client.publish(topic, message);
    }

    runOnce(script){
        PythonInterpreter.run(script, (err, res) => {console.log(res)})
    }

    isInterfaceOnline(_interface){
        return this.onlineInterface === _interface;
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

        let temporaryInterface = {
            preprocessor: PythonInterpreter.spawn("00_preprocess.py", (message) => {this.postPreprocessing(message)} , preprocessorOpt),
            fine_tuner: PythonInterpreter.spawn("01_fine_tune.py", this.postFineTune, fineTunerOpt),
            classifier: PythonInterpreter.spawn("02_classify.py", this.postClassifier, classifierOpt),
            cache: []
        };

        return temporaryInterface

    }

    createPipeline(_interface){
        if(this.interfacesConfig[_interface]){

            let newPipeline = this.configurePipelineFor(_interface);
            this.savePipeline(_interface, newPipeline);

            console.log("Success: Created " + this.onlineInterface + " interface.");
            console.log(this.state);
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
        this.pipeline.learnCache = [];
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
            console.log("Info: Topic '" + _interface + "' is not used at the moment. First you must turn it on.");
    }

    postPreprocessing(message){

        if(this.state.mode === "idle"){
            console.log("IDLE: " + message)
            return;
        }

        try{
            JSON.parse(message);
        }
        catch{
            console.log("Odebrano niepoprawne dane")
            return;
        }

        let _dataPackets = JSON.parse(message);
        let dataPackets = _dataPackets["time series"]; // TODO: Tutaj nazwa właściwosci z obiektu otrzymanego z preprocesora

            if(this.state.mode === "predict"){

                dataPackets.forEach((el) => {
                    pipeline.cache.push(el);
                });

                if( pipeline.cache >= this.pipeline.buffer_size){
                    let toSend = JSON.stringify(_obj);
                    
                    pipeline.classifier.send(toSend); // To jest przekazanie dalej
                    pipeline.cache = pipeline.cache.slice(this.interfacesConfig[this.onlineInterface].buffer_size, 200);

                }

            }

            else if(this.state.mode === "learn"){
                if(this.recording){

                    dataPackets.forEach((el) => {
                        this.learningBuffer.push(el);
                    });
                }
            }
            else{
                console.log("Server is in idle mode. Consider turning on different mode.")
            }

    }

    postClassifier(message){
        console.log(message);
    }

    postFineTune(message){
        console.log(message);
    }

    // INTERFACES --------------------------

    loadInterfaces(){
        let rawData = fs.readFileSync('./conf/interfaces.json');
        this.interfacesConfig = JSON.parse(rawData.toString());
        console.log(this.interfacesConfig);
        this.saveInterfaces();
    }

    saveInterfaces(){
        fs.writeFileSync('./conf/interfaces.json', JSON.stringify(this.interfacesConfig));
    }

    startRecording(){
        this.learningBuffer = [];
        console.log(this.recording)
        this.recording = true;
        console.log(this.recording)
        console.log("Recording Started");
        this.send("broadcast", "Recording Started");

        setTimeout(()=>{this.recording = false;console.log(this.recording); this.sendLearningBuffer()}, 3500)
    }

    sendLearningBuffer(){

        let objToSend = {
            command: "gather",
            data: this.learningBuffer,
            gesture: this.currentGesture
        }
        console.log("Recording finished");

        this.pipeline.fine_tuner.send(JSON.stringify(objToSend));

        this.send("broadcast", "Recording Finished");

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

            console.log("Connected to MQTT Broker at URL: " + this.state.mqttBrokerIP);

            client.subscribe(['sensors/#', 'wills', 'request/#', "interfaces/#", "command/#"], function (err) {
                if (!err) {
                    client.publish('presence', 'Hello mqtt from server')
                }
            })
        })
        client.on("error", (err)=>{
            console.log("Error: Could not connect to MQTT Broker.\nPlease check your MQTT Broker settings.")
        })

        client.on("message", (topic, mess)=>{
            let parsedTopic = topic.split('/');

            // GUI REQUESTS
            if(parsedTopic[0] === "request")
                handleRequests(this, parsedTopic, mess);

            // SENSOR DATA
            else if(parsedTopic[0] === "sensors"){
                handleDataFlow(this, parsedTopic, mess);
            }

            // INTERFACES
            else if(parsedTopic[0] === "interfaces"){
                handleInterfaces(this, parsedTopic, mess);
            }

            else if(parsedTopic[0] === "command"){
                handleCommands(this, parsedTopic, mess)
            }
        })
        this.client = client;
    }
}

module.exports = MQTTClient