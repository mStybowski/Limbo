const express = require("express")
const app = express();
const MQTTClient = require("./mqtt_server/main")
const path = require("path")

const client = new MQTTClient();

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(express.static(path.join(__dirname, 'static_pages')));

//TODO usun tą linie, jest robocza. łączenie z serwerem dopiero w callbacku.
// client.listen("ws://localhost:8083/mqtt");

client.loadInterfaces();

function decideWhatToDo(res){
    if(client.state.connected)
        res.redirect("/panel")
    else
        res.redirect("/failureSite")

}

app.get("/failureSite", (req, res) => {
    res.sendFile(path.join(__dirname, "static_pages", "failureSite.html"));
})

app.post("/attemptconnection", (req, res) => {

    client.listen(req.body.ip);
    setTimeout(()=>{decideWhatToDo(res)}, 700);
})

app.get("/panel", (req, res) => {
    if(client.state.connected){
        res.sendFile(path.join(__dirname, "static_pages", "panel.html"));
    }
    else{
        res.redirect("/login")
    }

})

app.get("/", (req, res) => {
    if(client.state.connected){
        res.sendFile(path.join(__dirname, "static_pages", "panel.html"));
    }
    else{
        res.sendFile(path.join(__dirname, "static_pages", "login.html"));
    }

})

app.get("/login", (req, res) => {
    if(client.state.connected){
        res.sendFile(path.join(__dirname, "static_pages", "logout.html"));
    }
    else{
        res.sendFile(path.join(__dirname, "static_pages", "login.html"));
    }

})

app.get("/panelforce", (req, res) => {
    res.sendFile(path.join(__dirname, "static_pages", "panel.html"));
})

app.listen(8080, () => {
    console.log("Server running")
});
