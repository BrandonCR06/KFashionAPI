const express = require("express");
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();
var crypto = require("crypto");

// This will help us connect to the database
const dbo = require("./database");

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;

// This section will help you cryptoget a list of all the records.
recordRoutes.get("/", (req, res) => {
  res.send("Hello");
});
function validPassword(pss, salt, hash) {
  var hashed = crypto.pbkdf2Sync(pss, salt, 1000, 64, `sha512`).toString(`hex`);
  return hash === hashed;
}
recordRoutes.post("/validUser", (req, res) => {
  console.log(req.body);
  dbo.connection
    .useDb("KFashionDB")
    .collection("Users")
    .find({ correo: req.body.email })
    .toArray(function (err, user1) {
      let user = user1[0];
      console.log(user);
      if (user === null) {
        return res.status(400).send({
          message: "Usuario no encontrado.",
          user: "",
        });
      } else {
        if (validPassword(req.body.password, user.salt, user.hash)) {
          return res.status(200).send({
            message: "Usuario ha iniciado sesión",
            user: user,
          });
        } else {
          return res.status(400).send({
            message: "Contraseña incorrecta",
            user: "",
          });
        }
      }
    });
});

recordRoutes.get("/get/users", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Users")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

// This section will help you get a list of all the products.
recordRoutes.get("/products", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.get("/preguntas", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Preguntas")
    .aggregate([
      {
        $lookup: {
          from: "Users",
          localField: "usuario",
          foreignField: "_id",
          as: "usuario",
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.post("/update/user", (req, res) => {
  var userid = req.body._id;
  var o_id = new ObjectId(userid);
  let myobj = {
    nombre: req.body.name,
    apellido: req.body.apellido,
    fecha_nacimiento: req.body.fechaNacimiento,
    correo: req.body.email,
    cedula: req.body.cedula,
    sexo: req.body.sexo,
  };
  console.log(o_id, myobj);

  dbo.connection
    .useDb("KFashionDB")
    .collection("Users")
    .updateOne(
      { _id: o_id },
      {
        $set: {
          nombre: req.body.name,
          apellido: req.body.apellido,
          fecha_nacimiento: req.body.fechaNacimiento,
          correo: req.body.email,
          cedula: req.body.cedula,
          sexo: req.body.sexo,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.delete("/deleteQuestion", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Preguntas")
    .deleteOne({ _id: ObjectId(req.body.preguntaId) }, function (err, result) {
      if (err) console.log(err);

      res.json(result);
    });
});
recordRoutes.post("/register/question", (req, res) => {
  var userid = req.body.usuario;
  var o_id = new ObjectId(userid);
  let myobj = {
    contenido: req.body.contenido,
    usuario: o_id,
    respuesta: req.body.respuesta,
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Preguntas")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.post("/register/order2", (req, res) => {
  let prods = [];

  for (let i = 0; i < req.body.listaItems.length; i++) {
    prods.push([
      ObjectId(req.body.listaItems[i][0]), // CODIGO INT
      req.body.listaItems[i][1], // DESCRIPCION STRING NOMBRE
      parseFloat(req.body.listaItems[i][3]), // UNITARIO FLOAT
      req.body.listaItems[i][4], // CATEGORIA INT
      req.body.listaItems[i][2],
    ]); // CANTIDAD INT
  }

  let myobj = {
    user: ObjectId(req.body.user),
    numFactura: req.body.numFactura,
    fecha: new Date(),
    hora: new Date().getTime(),
    subtotal: parseFloat(req.body.subtotal),
    total: parseFloat(req.body.total),
    products: prods,
    estado: "Facturado",
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.post("/register/order", (req, res) => {
  let prods = [];
  for (let i = 0; i < req.body.products.length; i++) {
    prods.push([ObjectId(req.body.products[i][0]), req.body.products[i][1]]);
  }
  let myobj = {
    user: ObjectId(req.body.user),
    //Esto aqui tiene que enviarse como lista
    products: prods,
    total: req.body.total,
    timestamp: new Date(),
  };
  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.get("/orders", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .aggregate([
      {
        $addFields: {
          adjustedProds: {
            $map: {
              input: "$products",
              as: "prods",
              in: { $first: "$$prods" },
            },
          },
        },
      },
      {
        $lookup: {
          from: "Products",
          localField: "adjustedProds",
          foreignField: "_id",
          as: "ObjectProds",
        },
      },
      {
        $addFields: {
          cant: {
            $map: { input: "$products", as: "prods", in: { $last: "$$prods" } },
          },
        },
      },
      {
        $lookup: {
          from: "Users",
          localField: "user",
          foreignField: "_id",
          as: "objUser",
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.get("/orders2", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .aggregate([
      {
        $addFields: {
          adjustedProds: {
            $map: {
              input: "$listaItems",
              as: "prods",
              in: { $first: "$$prods" },
            },
          },
        },
      },
      {
        $lookup: {
          from: "Products",
          localField: "adjustedProds",
          foreignField: "_id",
          as: "ObjectProds",
        },
      },
      {
        $addFields: {
          cant: {
            $map: {
              input: "$listaItems",
              as: "prods",
              in: { $last: "$$prods" },
            },
          },
        },
      },
      {
        $lookup: {
          from: "Users",
          localField: "user",
          foreignField: "_id",
          as: "objUser",
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.post("/register/product", (req, res) => {
  let myobj = {
    imgSrc: req.body.imgSrc,
    cantidad: req.body.cantidad,
    description: req.body.descripcion,
    estado: req.body.estado,
    nombre: req.body.nombre,
    price: req.body.precio,
    categoria: req.body.categoria,
    descuento: 0,
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.get("/promociones", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Promocion")
    .aggregate([
      {
        $lookup: {
          from: "Products",
          localField: "producto",
          foreignField: "_id",
          as: "producto",
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.get("/numFactura", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .find()
    .sort({ numFactura: -1 })
    .limit(1)
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
  //db.teams.find().sort({"field":-1}).limit(1).toArray().map(function(u){return u.field})
});

recordRoutes.post("/question", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Preguntas")
    .updateOne(
      { _id: ObjectId(req.body.preguntaId) },
      { $set: { respuesta: req.body.respuesta } },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.post("/updateProduct", (req, res) => {
  console.log(req.body.id);

  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .updateOne(
      { _id: ObjectId(req.body.id) },
      {
        $set: {
          imgSrc: req.body.imgSrc,
          nombre: req.body.name,
          description: req.body.description,
          estado: req.body.activo,
          nombre: req.body.name,
          price: req.body.price,
          categoria: req.body.category,
          cantidad: req.body.cantidad,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.delete("/remove/product", (req, res) => {
  console.log(req.body._id);
  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .deleteOne({ _id: ObjectId(req.body._id) }, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.post("/update/order", (req, res) => {
  console.log(req.body.numFactura, req.body.estado);
  dbo.connection
    .useDb("KFashionDB")
    .collection("Orders")
    .updateOne(
      { numFactura: req.body.numFactura },
      {
        $set: {
          estado: req.body.estado,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.post("/add/user", (req, res) => {
  let salt = crypto.randomBytes(16).toString("hex");

  // Hashing user's salt and password with 1000 iterations,

  let hash = crypto
    .pbkdf2Sync(req.body.contrasenha, salt, 1000, 64, `sha512`)
    .toString(`hex`);

  let myobj = {
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    fecha_nacimiento: req.body.fecha_nacimiento,
    correo: req.body.correo,
    cedula: req.body.cedula,
    sexo: req.body.sexo,
    hash: hash,
    salt: salt,
    rol: req.body.rol,
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Users")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.get("/promociones", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Promocion")
    .aggregate([
      {
        $lookup: {
          from: "Products",
          localField: "producto",
          foreignField: "_id",
          as: "producto",
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.post("/register/promotion", (req, res) => {
  let myobj = {
    descripcion: req.body.descripcion,
    fechaInicio: req.body.fechaInicio,
    fechaFinal: req.body.fechaFinal,
    producto: ObjectId(req.body.producto),
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Promocion")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });

  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .updateOne(
      { _id: ObjectId(req.body.producto) },
      {
        $set: {
          descuento: req.body.porcentaje,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.delete("/remove/promotion", (req, res) => {
  console.log(req.body._id);
  dbo.connection
    .useDb("KFashionDB")
    .collection("Promocion")
    .deleteOne({ _id: ObjectId(req.body._id) }, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });

    dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .updateOne(
      { _id: ObjectId(req.body._id) },
      {
        $set: {
          descuento: 0
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.post("/updatePromo", (req, res) => {
  console.log(req.body.id);

  dbo.connection
    .useDb("KFashionDB")
    .collection("Promocion")
    .updateOne(
      { _id: ObjectId(req.body.id) },
      {
        $set: {
          fechaInicio: req.body.fechaInicio,
          fechaFinal: req.body.fechaFinal,
          porcentaje: req.body.porcentaje,
          descripcion: req.body.descripcion,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );

  dbo.connection
    .useDb("KFashionDB")
    .collection("Products")
    .updateOne(
      { _id: ObjectId(req.body.producto) },
      {
        $set: {
          descuento: req.body.porcentaje,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.get("/get/categorias", (req, res) => {
  dbo.connection
    .useDb("KFashionDB")
    .collection("Categorias")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

recordRoutes.post("/updateCategoria", (req, res) => {
  console.log(req.body.id);

  dbo.connection
    .useDb("KFashionDB")
    .collection("Categorias")
    .updateOne(
      { _id: ObjectId(req.body.id) },
      {
        $set: {
          Categoria: req.body.Categoria,
        },
      },
      function (err, result) {
        if (err) console.log(err);
        res.json(result);
      }
    );
});

recordRoutes.delete("/remove/categoria", (req, res) => {
  console.log(req.body._id);
  dbo.connection
    .useDb("KFashionDB")
    .collection("Categorias")
    .deleteOne({ _id: ObjectId(req.body._id) }, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

recordRoutes.post("/register/categoria", (req, res) => {
  let myobj = {
    Categoria: req.body.nombre,
  };

  dbo.connection
    .useDb("KFashionDB")
    .collection("Categorias")
    .insertOne(myobj, function (err, result) {
      if (err) console.log(err);
      res.json(result);
    });
});

module.exports = recordRoutes;
