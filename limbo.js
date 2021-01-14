const express = require("express")
const app = express();
const MQTTClient = require("./mqtt_server/main")
const path = require("path")
const open = require("open")

const client = new MQTTClient();

const PORT = 3005;

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(express.static(path.join(__dirname, 'public')));

client.loadInterfaces();

function decideWhatToDo(res){
    if(client.state.connected)
        res.redirect("/panel")
    else
        res.redirect("/failureSite")
}

app.get("/failureSite", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "server", "failureSite.html"));
})

app.post("/attemptconnection", (req, res) => {
    client.listen(req.body.ip);
    setTimeout(()=>{decideWhatToDo(res)}, 700);
})

app.get("/panel", (req, res) => {
    if(client.state.connected)
        res.sendFile(path.join(__dirname, "public", "spa", "panel.html"));
    else
        res.redirect("/login")
})

app.get("/", (req, res) => {
    if(client.state.connected)
        res.sendFile(path.join(__dirname, "public", "spa", "panel.html"));
    else
        res.sendFile(path.join(__dirname, "public", "server", "login.html"));
})

app.get("/login", (req, res) => {
    if(client.state.connected)
        res.sendFile(path.join(__dirname, "public", "server", "logout.html"));
    else
        res.sendFile(path.join(__dirname, "public", "server", "login.html"));
})

app.get("/panelforce", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "spa", "panel.html"));
})

app.listen(PORT, () => {
    console.log("\x1b[32m", "✔ Server running (1/2)", "\x1b[0m")
    open("http://localhost:" + PORT);
});
