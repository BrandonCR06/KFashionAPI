const mongoose = require("mongoose");

//Base de datos hosteada
const URI =
  "mongodb+srv://Kfashion:Kfashion@cluster.otyckp9.mongodb.net/?retryWrites=true&w=majority";
//Pueden usar una local para probar conexiones
//const URI = "mongodb://localhost/motica"
mongoose
  .connect(URI)
  .then((db) => console.log("DB is connected"))
  .catch((err) => console.log("Err"));

module.exports = mongoose;
