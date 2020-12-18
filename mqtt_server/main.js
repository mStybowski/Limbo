const mqtt = require("mqtt")
const handleGUIRequests = require("./handleGUIRequests")
const testFolder = '../pythonScripts';
const fs = require('fs');
const path = require("path")

//Main class
//Tu też handluje stan aplikacji
//zmienna


class MQTTClient{ //main class, root aplikacji

    client;
    data;
    stan; // learn OR predict
    state={
        isConnected: true
    }
    connected = false;

    updatePythonScripts(){
        let that = this;
        fs.readdir(path.join(__dirname, '../pythonScripts'), (err, files) => {
            that.pythonFiles = files.slice();
        });
    }


    listen(ip){
        const client = mqtt.connect(ip);
        client.on("disconnect", () => {
            this.connected = false;//reset client -> null na disconnect
        })
        client.on("connect", () => {
            this.connected = true;
            this.state.mqttBrokerID = ip;
            console.log("Connected to the MQTT broker at: " + this.state.mqttBrokerID);
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
        })
        this.client = client;
    }

    send(topic, message){
        this.client.publish(topic, message);
    }




}

module.exports = MQTTClient