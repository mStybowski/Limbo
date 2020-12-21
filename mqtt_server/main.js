const mqtt = require("mqtt")
const handleGUIRequests = require("./handleGUIRequests")
const handleDataFlow = require("./handleDataFlow")
const handleInterfaces = require("./handleInterfacesSettings")
const testFolder = '../pythonScripts';
const fs = require('fs');
const path = require("path")
const PythonInterpreter = require("../python_shell/main")

class MQTTClient{

    client;
    state={
        connected: false,
        mqttBrokerIP: "",
        mode: "idle" // idle || learn || predict
    }
    onlineInterfaces={};

    loadInterfaces(){
        let rawData = fs.readFileSync('./conf/interfaces.json');
        this.interfacesConfig = JSON.parse(rawData.toString());
        console.log(this.interfacesConfig);
        this.saveInterfaces();
    }

    saveInterfaces(){
        fs.writeFileSync('./conf/interfaces.json', JSON.stringify(this.interfacesConfig));
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


    postPreprocessing(_interface, message){
        if(this.onlineInterfaces[_interface]){
            let currentInterface = this.onlineInterfaces[_interface];
            let _dataPackets = JSON.parse(message);
            let dataPackets = _dataPackets["time series"];
            // console.log("Received from preprocessing: " + _dataPackets);

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
        else{
            console.log("Info: Topic '" + _interface + "' is not used at the moment. First you must turn it on.");
        }
    }

    createInterfaceHandler(_interface){
        if(this.interfacesConfig[_interface]){
            let interfaceConf = this.interfacesConfig[_interface];
            this.onlineInterfaces[_interface] = {
                preprocessor: PythonInterpreter.spawn(interfaceConf.preprocessor, (features) => {this.postPreprocessing(_interface, features)}),
                trainer: PythonInterpreter.spawn(interfaceConf.train, this.consoleLogData),
                classifier: PythonInterpreter.spawn(interfaceConf.classify, this.consoleLogData),
                rawData: []
            }
            console.log("Success: Created " + _interface + " interface.");

        }
        else
            console.log("Warning: There is no " + _interface +" interface configuration available. Skipped this one.")
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

    listen(ip){
        const client = mqtt.connect(ip);
        client.on("disconnect", () => {
            this.state.connected = false;//reset client -> null na disconnect
        })
        client.on("connect", () => {
            this.state.connected = true;
            this.state.mqttBrokerIP = ip;
            console.log("Success: Connected to the MQTT broker at: " + this.state.mqttBrokerIP);
            client.subscribe(['sensors/#', 'wills', 'guiRequests/#', "interfaces/#"], function (err) {
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
            if(parsedTopic[0] === "guiRequests")
                handleGUIRequests(this, parsedTopic, mess);

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




}

module.exports = MQTTClient