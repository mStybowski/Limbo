const mqtt = require("mqtt")
const handleGUIRequests = require("./handleGUIRequests")
const handleDataFlow = require("./handleDataFlow")
const handleInterfaces = require("./handleInterfacesSettings")
const testFolder = '../pythonScripts';
const fs = require('fs');
const path = require("path")
const PythonInterpreter = require("../python_shell/main")

//Main class
//Tu też handluje stan aplikacji
//zmienna



class MQTTClient{ //main class, root aplikacji

    client;
    data;
    // EMGPreprocessor = PythonInterpreter.spawn("00_preprocess.py", this.processDataFromPreprocessor);
    preprocessors = {}

    onlineInterfaces = {
    }
    interfacesConfig = {
        emg:{
            preprocessor: "00_preprocess.py",
            train: "01_fine_tune.py",
            classify: "02_classify.py",
            rawBufferSize: 10
            //TODO Maybe add more properties
        },
        mmg:{
            preprocessor: "preprocessor.py",
            train: "01_fine_tune.py",
            classify: "02_classify.py",
            rawBufferSize: 30
            //TODO Maybe add more properties

        },
        test:{
            preprocessor: "test_preprocessor.py",
            train: "test_01_fine_tune.py",
            classify: "test_02_classify.py",
            rawBufferSize: 3
            //TODO Maybe add more properties
        }
    };


    state={
        connected: false,
        mqttBrokerIP: "",
        mode: "idle" // idle || learn || predict
    }

    handleRawData(_interface, message){
        if(this.onlineInterfaces[_interface]){
            let currentInterface = this.onlineInterfaces[_interface];
            let dataPackets = message["data"];
            console.log("DataPackets: " + dataPackets);
            dataPackets.forEach((el) => {
                currentInterface.rawData.push(el);
            });
            console.log(currentInterface.rawData);
            if(currentInterface.rawData.length >= this.interfacesConfig[_interface].rawBufferSize){
                console.log("MAMY KOMPLET!!!!: " + this.onlineInterfaces[_interface].rawData.slice(0,this.interfacesConfig[_interface].rawBufferSize)); // To jest przekazanie dalej
                currentInterface.rawData = currentInterface.rawData.slice(this.interfacesConfig[_interface].rawBufferSize,200);
            }
            // else if(dataPackets.length + this.onlineInterfaces[_interface].rawData.length === this.interfacesConfig[_interface].rawBufferSize){
            //     this.onlineInterfaces[_interface].rawData.push(dataPackets)
            //     console.log(this.onlineInterfaces[_interface].rawData);// To jest przekazanie dalej
            //     this.onlineInterfaces[_interface].rawData = [];
            // }
            // else if(dataPackets.length + this.onlineInterfaces[_interface].rawData.length < this.interfacesConfig[_interface].rawBufferSize){
            //     this.onlineInterfaces[_interface].rawData.push(dataPackets)
            // }

        }
        else{
            console.log(_interface + " is not used at the moment. First you must turn it on.");
        }
    }

    createInterfaceHandler(_interface){
        if(this.interfacesConfig[_interface]){
            let interfaceConf = this.interfacesConfig[_interface];
            this.onlineInterfaces[_interface] = {
                preprocessor: PythonInterpreter.spawn(interfaceConf.preprocessor, this.consoleLogData),
                trainer: PythonInterpreter.spawn(interfaceConf.train, this.consoleLogData),
                classifier: PythonInterpreter.spawn(interfaceConf.classify, this.consoleLogData),
                rawData: []
            }
            console.log("Created interface handler for " + _interface);
            console.log("Succesfully created " + _interface + " interface.");

        }
        else{
            console.log("Erorr: There is no " + _interface +" interface configured.")
        }
    }

    // saveInterfacesConf(){
    //     var data = JSON.stringify(this.interfaces);
    //
    //     fs.writeFile('./config.json', data, function (err) {
    //         if (err) {
    //             console.log('There has been an error saving your configuration data.');
    //             console.log(err.message);
    //             return;
    //         }
    //         console.log('Configuration saved successfully.')
    //     });
    // }

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

    startRecognizing(url, ){
        // this.pythonInterpreters.push(PythonInterpreter.spawn(url, ))
    }

    listen(ip){
        const client = mqtt.connect(ip);
        client.on("disconnect", () => {
            this.state.connected = false;//reset client -> null na disconnect
        })
        client.on("connect", () => {
            this.state.connected = true;
            this.state.mqttBrokerIP = ip;
            console.log("Connected to the MQTT broker at: " + this.state.mqttBrokerIP);
            client.subscribe(['sensors/#', 'wills', 'guiRequests/#', "interfaces/#"], function (err) {
                if (!err) {
                    client.publish('presence', 'Hello mqtt from server')
                }
            })
        })
        client.on("error", (err)=>{
            console.log("There was an error: " + err)
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