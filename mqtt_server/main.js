const mqtt = require("mqtt")
const handleGUIRequests = require("./handleGUIRequests")
const handleDataFlow = require("./handleDataFlow")
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
    EMGPreprocessor = PythonInterpreter.spawn("00_preprocess.py", this.processDataFromPreprocessor);
    state={
        connected: false,
        mqttBrokerIP: "",
        mode: "idle" // idle || learn || predict
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
            client.subscribe(['sensors/mmg', 'sensors/emg', 'wills', 'guiRequests/#'], function (err) {
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
            if(parsedTopic[0] === "guiRequests")
                handleGUIRequests(this, parsedTopic, mess);
            else if(parsedTopic[0] === "sensors")
                handleDataFlow(this, parsedTopic, mess);
        })
        this.client = client;
    }

    send(topic, message){
        this.client.publish(topic, message);
    }




}

module.exports = MQTTClient