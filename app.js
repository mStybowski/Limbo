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
client.listen("ws://localhost:8083/mqtt");

app.post("/attemptconnection", (req, res) => {

    // client.listen(req.body.ip);
    setTimeout(() => {res.redirect("/panel")}, 700);
})

app.get("/panel", (req, res) => {
    if(client.connected){
        res.sendFile(path.join(__dirname, "static_pages", "panel.html"));
    }
    else{
        res.redirect("/login")
    }

})

app.get("/login", (req, res) => {
    if(client.connected){
        res.sendFile(path.join(__dirname, "static_pages", "logout.html"));
    }
    else{
        res.sendFile(path.join(__dirname, "static_pages", "login.html"));
    }

})

app.get("/panelforce", (req, res) => {
    res.sendFile(path.join(__dirname, "static_pages", "panel.html"));
})

app.listen(80, () => {
    console.log("Server running")
});
