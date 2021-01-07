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
        mode: "idle" // idle || learn || predict
    }
    onlineInterface;
    pipeline = {};
    recording = false;

    getInterfacesConfiguration(){
        return this.interfacesConfig;
    }

    clearCache(){
        this.pipeline.cache = [];
        this.pipeline.learnCache = [];
    }

    setGesture(gesture){
        this.currentGesture = gesture;
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

    setMode(mode){
        this.clearCache();
        this.state.mode = mode;
        console.log("Changed mode to " + this.state.mode);
    }

    serverLogs(_payload, type="info", verbose=false){
        let messageObject = {
            payload: _payload,
            type: type,
            verbose
        }
        this.client.publish("serverLogs", JSON.stringify(messageObject));
    }

    loadInterfaces(){
        let rawData = fs.readFileSync('./conf/interfaces.json');
        this.interfacesConfig = JSON.parse(rawData.toString());
        console.log(this.interfacesConfig);
        this.saveInterfaces();
    }

    saveInterfaces(){
        fs.writeFileSync('./conf/interfaces.json', JSON.stringify(this.interfacesConfig));
    }

    runOnce(script){
        PythonInterpreter.run(script, (err, res) => {console.log(res)})
    }

    //TODO Rozważ zmianę nazwy poniższej funkcji
    handleRawData(_interface, message){
        if(this.isInterfaceOnline(_interface)){
            let currentInterface = this.onlineInterface;
            console.log(message);

            pipeline.preprocessor.send(JSON.stringify(message));
        }
        else{
            console.log("Info: Topic '" + _interface + "' is not used at the moment. First you must turn it on.");
        }
    }

    serverLog(payload, type){
        let message = {type, payload}
        this.client.publish("serverLogs", JSON.stringify(message));
    }

    processClassifierResult(message){
        console.log(message);
        this.send("Classification", message);
    }

    postPreprocessing(message){
        if(this.state.mode === "idle"){
            console.log(message);
        }
        let currentInterface = this.onlineInterface;
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
            preprocessor: PythonInterpreter.spawn("00_preprocess.py", this.postPreprocessing, preprocessorOpt),
            fine_tuner: PythonInterpreter.spawn("01_fine_tune.py", this.postFineTune, fineTunerOpt),
            classifier: PythonInterpreter.spawn("02_classify.py", this.postClassifier, classifierOpt),
            cache:[]
        }

    }

    postClassifier(message){
        console.log(message);
    }

    postFineTune(message){
        console.log(message);
    }

    savePipeline(_interface, pipeline){
        this.onlineInterface = _interface;
        this.pipeline = pipeline;
    }

    isInterfaceOnline(_interface){
        return this.onlineInterface === _interface;
    }

    getOnlineInterface(){
        return this.onlineInterface;
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


    setOnlineInterfaces(newInterface){
        // TODO
    }

    consoleLogData(data){
        
        console.log(data);
    }


    
    processDataFromPreprocessor(message){
        console.log(message)
    }

    updatePythonScripts(){
        let that = this;
        fs.readdir(path.join(__dirname, '../pythonScripts'), (err, files) => {
            that.pythonFiles = files.slice();
        });
    }

    setServerState(newState){
        this.state = {...this.state, ...newState};
        this.send("server/state", JSON.stringify(this.state));
    }

    listen(ip){
        if(this.state.connected)
            return

        const client = mqtt.connect(ip);
        

        client.on("disconnect", () => {
            this.setServerState({
                connected: false,
                mqttBrokerIP: "",
                mode: "idle"
            });
        })
        client.on("connect", () => {

            this.setServerState({
                connected: true,
                mqttBrokerIP: ip,
                mode: "idle"
            });

            console.log("Connected to MQTT Broker at URL: " + this.state.mqttBrokerIP);

            client.subscribe(['sensors/#', 'wills', 'request/#', "interfaces/#", "command/#"], function (err) {
                if (!err) {
                    client.publish('presence', 'Hello mqtt from server')
                }
            })
        })
        client.on("error", (err)=>{
            console.log("Error: " + err)
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

    send(topic, message){
        this.client.publish(topic, message);
    }

    getInterfaces() {
        if(this.interfacesConfig)
            return this.interfacesConfig;
        else
            return "There is none";
    }




}

module.exports = MQTTClient