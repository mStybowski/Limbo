const mqtt = require("mqtt")
const handleRequests = require("./handleRequests")
const handleDataFlow = require("./handleDataFlow")
const handleInterfaces = require("./handleInterfacesSettings")
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
    onlineInterfaces={};

    serverLogs(_payload, type="info", verbose=false){
        let messageObject = {
            payload: type + ": " + _payload,
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

    handleRawData(_interface, message){
        if(this.onlineInterfaces[_interface]){
            let currentInterface = this.onlineInterfaces[_interface];
            console.log(message);

            currentInterface.preprocessor.send(JSON.stringify(message));
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

    postPreprocessing(_interface, message){
        if(this.onlineInterfaces[_interface]){
            let currentInterface = this.onlineInterfaces[_interface];
            let _dataPackets = JSON.parse(message);
            let dataPackets = _dataPackets["time series"];
            // console.log("Received from preprocessing: " + _dataPackets);

            if(this.state.mode === "predict"){
                dataPackets.forEach((el) => {
                    currentInterface.rawData.push(el);
                });

                console.log(currentInterface.rawData);
                console.log("LENGTH: " + currentInterface.rawData.length);
                if(currentInterface.rawData.length >= this.interfacesConfig[_interface].rawBufferSize){
                    let _obj = {};
                    _obj["features"] = currentInterface.rawData.slice(0,this.interfacesConfig[_interface].rawBufferSize);

                    let toSend = JSON.stringify(_obj);
                    console.log(toSend);

                    currentInterface.classifier.send(toSend); // To jest przekazanie dalej
                    currentInterface.rawData = currentInterface.rawData.slice(this.interfacesConfig[_interface].rawBufferSize,200);
                }
            }
            else if(this.state.mode === "learn"){

            }
        }
        else{
            console.log("Info: Topic '" + _interface + "' is not used at the moment. First you must turn it on.");
        }
    }

    sensorInterface(){

    }

    pipeline(interfaceName) {
        this.make = make;
        this.model = model;
        this.year = year;
      }

    createPipeline(_interface){
        if(this.interfacesConfig[_interface]){
            let interfaceConf = this.interfacesConfig[_interface];
            //Use method instead of modyfing data directly
            this.onlineInterfaces[_interface] = new this.sensorInterface(_interface);
                preprocessor: PythonInterpreter.spawn(interfaceConf.preprocessor, (features) => {this.postPreprocessing(_interface, features)}, {
                    mode: 'text',
                    scriptPath: './python_scripts/',
                    pythonOptions: ['-u'], // get print results in real-time
                    // args: ["-t", "emg", "-w", "200", "-s", "300", "-b", "300"]
                    args: ["-h"]
                }),
                // trainer: PythonInterpreter.spawn(interfaceConf.train, this.consoleLogData),
                // classifier: PythonInterpreter.spawn(interfaceConf.classify, this.processClassifierResult),
                rawData: []
            }

            console.log("Success: Created " + _interface + " interface.");

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

            client.subscribe(['sensors/#', 'wills', 'request/#', "interfaces/#"], function (err) {
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
            //console.log(mess.toString() + " na topicu: " + topic + " parsedTopic[0]: " + parsedTopic[0])

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