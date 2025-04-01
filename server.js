const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');
const config = require('./config'); // Importar la configuración

const app = express();

// Middleware para permitir el parseo de solicitudes JSON
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la base de datos MariaDB usando `config.js`
const pool = mariadb.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  connectionLimit: 20, // Aumentar de 5 a 10 (o más según tus necesidades)
  acquireTimeout: 10000 // Aumentar el tiempo de espera a 10 segundos
});


// ACCEDER A TARJETA SOCIO DESDE LA TABLA SOCIO
app.get('/api/socios', (req, res) => {
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          socios.idsocio,
          socios.nombre,
          socios.apellido,
          socios.telefono,
          socios.direccion,
          socios.email,
          socios.invitaciones,
          socios.poblacion,
          socios.dni
        FROM
          socios
      `;
      conn.query(query)
        .then(rows => {
          res.json(rows); // Enviar los datos como JSON
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los socios' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});




app.get('/api/entrada/:idsocio', (req, res) => {
  const idsocio = req.params.idsocio;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      const querySocio = `
        SELECT
          socios.idsocio,
          socios.nombre,
          socios.apellido,
          socios.telefono,
          socios.direccion,
          socios.invitaciones,
          socios.poblacion,
           socios.dni
        FROM
          socios
        WHERE
          socios.idsocio = substr(?,1,4);
      `;

      conn.query(querySocio, [idsocio])
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows[0]); // Devolvemos el primer socio encontrado
          } else {
            res.status(404).json({ error: 'Socio no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error al consultar socio:', err);
          res.status(500).json({ error: 'Error al obtener socio' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

app.get('/api/entradaFam/:idsocio', (req, res) => {
  const idsocio = req.params.idsocio;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      const queryFamiliar = `
        SELECT
          familiares.idsocio,
          familiares.nombre,
          familiares.apellido,
          familiares.invitaciones
        FROM
          familiares
        WHERE
          familiares.idsocio = ?;
      `;

      conn.query(queryFamiliar, [idsocio])
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows[0]); // Devolvemos el primer familiar encontrado
          } else {
            res.status(404).json({ error: 'Familiar no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error al consultar familiar:', err);
          res.status(500).json({ error: 'Error al obtener familiar' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Ruta para registrar POST un movimiento (entrada o salida)
app.post('/api/movimientos', (req, res) => {
  const { idsocio, tipomov,  invitados} = req.body;
  console.log('Body recibido movimiento:', req.body); // Agrega esta línea

  // Validar que al menos id_socio o id_familiar estén presentes
  if (!idsocio) {
    return res.status(400).json({ error: 'Se requiere id_socio o id_familiar' });
  }

  // Validar el tipo de movimiento
  if (!['entrada', 'salida'].includes(tipomov)) {
    return res.status(400).json({ error: 'tipo_movimiento debe ser "entrada" o "salida"' });
  }

  pool.getConnection()
    .then(conn => {
      // Insertar el movimiento en la tabla movimientoSocios
      const query = `
      INSERT INTO movimientos (idsocio, fecha, hora, tipomov, invitados)
      VALUES (?, CURRENT_DATE, CURRENT_TIME, ?, ?);
      `;
    return conn.query(query, [idsocio, tipomov, invitados])
        .then(result => {
          const insertId = result.insertId.toString(); // Obtener el ID del movimiento registrado

        })
        .catch(err => {
          console.error('Error al registrar el movimiento:', err);
          res.status(500).json({ error: 'Error al registrar el movimiento' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Ruta para obtener GET los movimientos de un socio o familiar
app.get('/api/movimientos', (req, res) => {
  const { idsocio } = req.query;

  // Validar que al menos id_socio o id_familiar estén presentes
  if (!idsocio) {
    return res.status(400).json({ error: 'Se requiere id_socio' });
  }

  pool.getConnection()
    .then(conn => {
      let cSentencia;
      let idsocioLocal = idsocio.slice(0, 4);

      // if(idsocio <= 4){
      cSentencia = " Select * from movimientos where substr(idsocio,1,4) = '" + idsocioLocal + "' ";
      cSentencia += " ORDER BY id_registro ASC "
      // }else{
      //   cSentencia = " Select * from movimientos where idsocio = "+ idsocio;
      // }

      let query = cSentencia;
      const params = [];
      if (idsocio) params.push(idsocio);


      conn.query(query, params)
        .then(rows => {
          res.json(rows);  // Enviar los movimientos encontrados
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los movimientos' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// ANTIGUO SIN HORA 19:00 FUNCIONA FINAL!!

app.get('/api/movimientosFechaHora', (req, res) => {
  const { idsocio } = req.query;
  // Validar que al menos id_socio esté presente
  if (!idsocio) {
    return res.status(400).json({ error: 'Se requiere id_socio' });
  }

  pool.getConnection()
    .then(conn => {
      let cSentencia;
      let idsocioLocal = idsocio.slice(0, 4);
      let cfechainicio;
      let cfechafinal;
      let horaLimpieza = null;

      let dfechainicio = new Date();
      let dfechafinal = new Date();
      let dfechahoy = new Date();
      let nhoras = dfechahoy.getHours();
      let cmes;
      let nmes;
      let canio;
      let cdia;

      if (nhoras > 0 && nhoras < 10) {
        dfechainicio.setDate(dfechahoy.getDate() -1);
        dfechafinal.setDate(dfechafinal.getDate());
      } else {
        dfechainicio.setDate(dfechahoy.getDate());
        dfechafinal.setDate(dfechafinal.getDate() + 1);
      }

      nmes = dfechainicio.getMonth() + 1;
      cmes = '0' + nmes.toString();
      canio = dfechainicio.getFullYear().toString();
      ndia = dfechainicio.getDate();
      cdia = '0' + ndia.toString();
      cfechainicio = canio + '-' + cmes + '-' + cdia;

      nmes = dfechafinal.getMonth() + 1;
      cmes = '0' + nmes.toString();
      canio = dfechafinal.getFullYear().toString();
      ndia = dfechafinal.getDate();
      cdia = '0' + ndia.toString();
      cfechafinal = canio + '-' + cmes + '-' + cdia;

      // Consulta a la tabla limpieza
      const limpiezaQuery = "SELECT hora FROM limpieza WHERE fecha = ? ORDER BY hora DESC LIMIT 1";

      conn.query(limpiezaQuery, [cfechainicio])
        .then(rows => {
          if (rows.length > 0) {
            horaLimpieza = rows[0].hora; // Obtenemos la hora de limpieza si existe
          }

          let cFecha;
          if (horaLimpieza) {
            // Si hay limpieza, creamos dos rangos
            cFecha = " AND ((fecha = '" + cfechainicio + "' AND hora >= '" + horaLimpieza + "') " +
                    "OR (fecha = '" + cfechainicio + "' AND hora > '" + horaLimpieza + "') " +
                    "OR (fecha = '" + cfechafinal + "' AND hora < '10:00:00'))";
          } else {
            // Si no hay limpieza, rango normal de 10:00 a 10:00 del día siguiente
            cFecha = " AND ((fecha = '" + cfechainicio + "' AND hora > '10:00:00') " +
                    "OR (fecha = '" + cfechafinal + "' AND hora < '10:00:00'))";
          }

          cSentencia = "SELECT * FROM movimientos WHERE substr(idsocio,1,4) = '" + idsocioLocal + "' " + cFecha;
          cSentencia += " ORDER BY id_registro ASC";

          console.log('sentencia: ' + cSentencia);

          return conn.query(cSentencia);
        })
        .then(rows => {
          res.json(rows);
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los movimientos' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});


// ----------------------------------------------------------//

// ESTE CON HORA 19:00 FUNCIONANDO
// app.get('/api/movimientosFechaHora', (req, res) => {
//   const { idsocio } = req.query;

//   if (!idsocio) {
//     return res.status(400).json({ error: 'Se requiere id_socio' });
//   }

//   pool.getConnection()
//     .then(conn => {
//       let cSentencia;
//       let idsocioLocal = idsocio.slice(0, 4);
//       let cfechainicio;
//       let cfechafinal;
//       let cFecha;

//       let dfechahoy = new Date();
//       let nhoras = dfechahoy.getHours(); // Hora actual (0-23)
//       let dfechainicio = new Date();
//       let dfechafinal = new Date();

//       //reinicio a las 19:00
//       if (nhoras < 10) {
//         // Antes de las 10:00: rango desde ayer 10:00 hasta hoy 10:00
//         dfechainicio.setDate(dfechahoy.getDate() - 1);
//         dfechafinal.setDate(dfechahoy.getDate());
//       } else if (nhoras >= 19) {
//         // Después de las 19:00: reinicio, solo movimientos desde hoy 19:00 hasta mañana 10:00
//         dfechainicio.setHours(19, 0, 0, 0); // Hoy a las 19:00
//         dfechafinal.setDate(dfechahoy.getDate() + 1); // Mañana
//       } else {
//         // Entre 10:00 y 19:00: rango desde hoy 10:00 hasta mañana 10:00
//         dfechainicio.setDate(dfechahoy.getDate());
//         dfechafinal.setDate(dfechahoy.getDate() + 1);
//       }

//       // Formateo de fechas
//       let nmes = dfechainicio.getMonth() + 1;
//       let cmes = nmes < 10 ? '0' + nmes : nmes.toString();
//       let canio = dfechainicio.getFullYear().toString();
//       let ndia = dfechainicio.getDate();
//       let cdia = ndia < 10 ? '0' + ndia : ndia.toString();
//       cfechainicio = `${canio}-${cmes}-${cdia}`;

//       nmes = dfechafinal.getMonth() + 1;
//       cmes = nmes < 10 ? '0' + nmes : nmes.toString();
//       canio = dfechafinal.getFullYear().toString();
//       ndia = dfechafinal.getDate();
//       cdia = ndia < 10 ? '0' + ndia : ndia.toString();
//       cfechafinal = `${canio}-${cmes}-${cdia}`;

//       // Filtro de fecha y hora
//       if (nhoras >= 19) {
//         // Después de las 19:00: solo movimientos desde 19:00 en adelante
//         cFecha = ` AND fecha = '${cfechainicio}' AND hora >= '19:00:00'`;
//       } else {
//         // Antes de las 19:00: rango 10:00 del día anterior o actual hasta 10:00 del siguiente
//         cFecha = ` AND ((fecha = '${cfechainicio}' AND hora > '10:00:00') OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
//       }

//       // Construcción de la consulta
//       cSentencia = `SELECT * FROM movimientos WHERE SUBSTR(idsocio, 1, 4) = '${idsocioLocal}' ${cFecha}`;
//       cSentencia += " ORDER BY id_registro ASC";

//       console.log('Sentencia: ' + cSentencia);

//       conn.query(cSentencia)
//         .then(rows => {
//           res.json(rows);
//         })
//         .catch(err => {
//           console.error('Error en la consulta:', err);
//           res.status(500).json({ error: 'Error al obtener los movimientos' });
//         })
//         .finally(() => {
//           conn.release();
//         });
//     })
//     .catch(err => {
//       console.error('Error de conexión:', err);
//       res.status(500).json({ error: 'Error de conexión a la base de datos' });
//     });
// });


// ANTIGUO PRIMERO
// app.get('/api/aforo', (req, res) => {

//   pool.getConnection()
//     .then(conn => {
//       let cSentencia;

//       let cfechainicio;
//       let cfechafinal;

//       let dfechainicio = new Date();
//       let dfechafinal = new Date();
//       let dfechahoy = new Date();
//       let nhoras = dfechahoy.getHours();    // Hora (0-23)
//       let cmes;
//       let nmes;
//       let canio;
//       let cdia;

//       // Corrección en la condición (debe ser `||` en lugar de `&&` y corregir los valores)
//       if (nhoras > 0 && nhoras < 10) {
//         dfechainicio.setDate(dfechahoy.getDate() -1 );
//         dfechafinal.setDate(dfechafinal.getDate());

//       } else {
//         dfechainicio.setDate(dfechahoy.getDate());
//         dfechafinal.setDate(dfechafinal.getDate() + 1);
//        }

//       //  cfechainicio = dfechainicio.format('YYYY-MMM-DD');
//       //  cfechafinal = dfechafinal.format('YYYY-MMM-DD');



//       nmes = dfechainicio.getMonth() + 1;  // Obtiene el mes (0-11)
//       cmes = '0' + nmes.toString();
//       canio = dfechainicio.getFullYear().toString();  // Obtiene el año
//       ndia = dfechainicio.getDate();
//       cdia = '0' + ndia.toString();
//       cfechainicio = canio + '-' + cmes + '-' + cdia;
//         // -------------------------------------------------//
//       nmes = dfechafinal.getMonth() + 1;  // Obtiene el mes (0-11)
//       cmes =  '0' + nmes.toString();
//       canio = dfechafinal.getFullYear().toString();  // Obtiene el año
//       ndia = dfechafinal.getDate();
//       cdia = '0' + ndia.toString();
//       cfechafinal = canio + '-' + cmes + '-' + cdia;
//       cFecha = " ((fecha = '" + cfechainicio + "' and hora > '10:00:00') OR (fecha = '" + cfechafinal + "' and hora < '10:00:00')) "


//       // if(idsocio <= 4){
//       cSentencia = " Select * from movimientos where " + cFecha;
//       cSentencia += " ORDER BY id_registro ASC "

//       console.log('sentencia' + cSentencia);
//       // }else{
//       //   cSentencia = " Select * from movimientos where idsocio = "+ idsocio;
//       // }

//       let query = cSentencia;
//       const params = [];



//       conn.query(query, params)
//         .then(rows => {
//           res.json(rows);  // Enviar los movimientos encontrados
//         })
//         .catch(err => {
//           console.error('Error en la consulta:', err);
//           res.status(500).json({ error: 'Error al obtener los movimientos' });
//         })
//         .finally(() => {
//           conn.release();// Liberar la conexión
//         });
//     })
//     .catch(err => {
//       console.error('Error de conexión:', err);
//       res.status(500).json({ error: 'Error de conexión a la base de datos' });
//     });
// });

// 4 aforo  FUNCIONA!!!
app.get('/api/aforo', (req, res) => {
  pool.getConnection()
    .then(conn => {
      let cSentencia;
      let cfechainicio, cfechafinal;
      let dfechainicio = new Date();
      let dfechafinal = new Date();
      let dfechahoy = new Date();
      let nhoras = dfechahoy.getHours();
      let cmes, nmes, canio, cdia;

      if (nhoras > 0 && nhoras < 10) {
        dfechainicio.setDate(dfechahoy.getDate() - 1);
        dfechafinal.setDate(dfechafinal.getDate());
      } else {
        dfechainicio.setDate(dfechahoy.getDate());
        dfechafinal.setDate(dfechafinal.getDate() + 1);
      }

      nmes = dfechainicio.getMonth() + 1;
      cmes = ('0' + nmes).slice(-2);
      canio = dfechainicio.getFullYear().toString();
      cdia = ('0' + dfechainicio.getDate()).slice(-2);
      cfechainicio = `${canio}-${cmes}-${cdia}`;

      nmes = dfechafinal.getMonth() + 1;
      cmes = ('0' + nmes).slice(-2);
      canio = dfechafinal.getFullYear().toString();
      cdia = ('0' + dfechafinal.getDate()).slice(-2);
      cfechafinal = `${canio}-${cmes}-${cdia}`;

      let limpiezaQuery = "SELECT hora FROM limpieza WHERE fecha = ? ORDER BY hora DESC LIMIT 1";

      conn.query(limpiezaQuery, [cfechainicio])
        .then(limpiezaRows => {
          let horaLimpieza = limpiezaRows.length > 0 ? limpiezaRows[0].hora : null;
          let cFecha;

          // if (horaLimpieza) {
          //   cFecha = `((fecha = '${cfechainicio}' AND hora BETWEEN '10:00:00' AND '${horaLimpieza}')
          //               OR (fecha = '${cfechainicio}' AND hora > '${horaLimpieza}')
          //               OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          // } else {
          //   cFecha = `((fecha = '${cfechainicio}' AND hora >= '10:00:00')
          //               OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          // }

          // esta condicion funciona
          if (horaLimpieza) {
            cFecha = `((fecha = '${cfechainicio}' AND hora >= '${horaLimpieza}')
                        OR (fecha = '${cfechainicio}' AND hora > '${horaLimpieza}')
                        OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          } else {
            cFecha = `((fecha = '${cfechainicio}' AND hora >= '10:00:00')
                        OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          }

          cSentencia = `SELECT * FROM movimientos WHERE ${cFecha} ORDER BY fecha ASC, hora ASC`;
          console.log('sentencia: ' + cSentencia);
          return conn.query(cSentencia);
        })
        .then(rows => {
          res.json(rows);
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los movimientos' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});


// API para obtener todos los movimientos de los familiares
app.get('/api/movimientosFam/:idsocio', (req, res) => {
  const idsocio = req.params.idsocio;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      let cSentencia;
      let cfechainicio;
      let cfechafinal;
      let horaLimpieza = null;
      let dfechainicio = new Date();
      let dfechafinal = new Date();
      let dfechahoy = new Date();
      let nhoras = dfechahoy.getHours();
      let cmes, nmes, canio, cdia;

      if (nhoras > 0 && nhoras < 10) {
        dfechainicio.setDate(dfechahoy.getDate() - 1);
        dfechafinal.setDate(dfechafinal.getDate());
      } else {
        dfechainicio.setDate(dfechahoy.getDate());
        dfechafinal.setDate(dfechafinal.getDate() + 1);
      }

      nmes = dfechainicio.getMonth() + 1;
      cmes = ('0' + nmes).slice(-2);
      canio = dfechainicio.getFullYear().toString();
      ndia = dfechainicio.getDate();
      cdia = ('0' + ndia).slice(-2);
      cfechainicio = `${canio}-${cmes}-${cdia}`;

      nmes = dfechafinal.getMonth() + 1;
      cmes = ('0' + nmes).slice(-2);
      canio = dfechafinal.getFullYear().toString();
      ndia = dfechafinal.getDate();
      cdia = ('0' + ndia).slice(-2);
      cfechafinal = `${canio}-${cmes}-${cdia}`;

      // Consulta a la tabla limpieza
      const limpiezaQuery = "SELECT hora FROM limpieza WHERE fecha = ? ORDER BY hora DESC LIMIT 1";

      conn.query(limpiezaQuery, [cfechainicio])
        .then(rows => {
          if (rows.length > 0) {
            horaLimpieza = rows[0].hora; // Obtenemos la hora de limpieza si existe
          }

          let cFecha;
          if (horaLimpieza) {
            // Si hay limpieza, creamos dos rangos
            cFecha = ` ((fecha = '${cfechainicio}' AND hora >= '${horaLimpieza}') ` +
                    `OR (fecha = '${cfechainicio}' AND hora > '${horaLimpieza}') ` +
                    `OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          } else {
            // Si no hay limpieza, rango normal de 10:00 a 10:00 del día siguiente
            cFecha = ` ((fecha = '${cfechainicio}' AND hora > '10:00:00') ` +
                    `OR (fecha = '${cfechafinal}' AND hora < '10:00:00'))`;
          }

          cSentencia = `SELECT *,
            (COALESCE(SUM(CASE WHEN tipomov = 'e' THEN invitados ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN tipomov = 's' THEN invitados ELSE 0 END), 0))
            AS invitadosDentro
            FROM movimientos WHERE idsocio = '${idsocio}' AND ${cFecha}`;

          console.log('Consulta:', cSentencia);
          console.log("fecha es: " + cfechainicio);
          console.log("fecha es: " + cfechafinal);

          return conn.query(cSentencia);
        })
        .then(rows => {
          if (rows.length > 0) {
            res.json({ invitadosDentro: rows[0].invitadosDentro || 0 });
          } else {
            res.json({ invitadosDentro: 0 });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los movimientos' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// API para obtener todos los movimientos de los familiares
// app.get('/api/movimientosFam/:idsocio', (req, res) => {
//   const idsocio = req.params.idsocio;

//   pool.getConnection()
//     .then(conn => {
//       console.log('Conectado a la base de datos');

//       let cSentencia;
//       let cfechainicio;
//       let cfechafinal;
//       let cFecha;

//       let dfechahoy = new Date();
//       let nhoras = dfechahoy.getHours(); // Hora actual (0-23)
//       let dfechainicio = new Date();
//       let dfechafinal = new Date();

//       // Reinicio a las 19:00
//       if (nhoras < 10) {
//         // Antes de las 10:00: rango desde ayer 10:00 hasta hoy 10:00
//         dfechainicio.setDate(dfechahoy.getDate() - 1);
//         dfechafinal.setDate(dfechahoy.getDate());
//       } else if (nhoras >= 19) {
//         // Después de las 19:00: reinicio, solo movimientos desde hoy 19:00 hasta mañana 10:00
//         dfechainicio.setHours(19, 0, 0, 0); // Hoy a las 19:00
//         dfechafinal.setDate(dfechahoy.getDate() + 1); // Mañana
//       } else {
//         // Entre 10:00 y 19:00: rango desde hoy 10:00 hasta mañana 10:00
//         dfechainicio.setDate(dfechahoy.getDate());
//         dfechafinal.setDate(dfechahoy.getDate() + 1);
//       }

//       // Formateo de fechas
//       let nmes = dfechainicio.getMonth() + 1;
//       let cmes = nmes < 10 ? '0' + nmes : nmes.toString();
//       let canio = dfechainicio.getFullYear().toString();
//       let ndia = dfechainicio.getDate();
//       let cdia = ndia < 10 ? '0' + ndia : ndia.toString();
//       cfechainicio = `${canio}-${cmes}-${cdia}`;

//       nmes = dfechafinal.getMonth() + 1;
//       cmes = nmes < 10 ? '0' + nmes : nmes.toString();
//       canio = dfechafinal.getFullYear().toString();
//       ndia = dfechafinal.getDate();
//       cdia = ndia < 10 ? '0' + ndia : ndia.toString();
//       cfechafinal = `${canio}-${cmes}-${cdia}`;

//       // Filtro de fecha y hora
//       if (nhoras >= 19) {
//         // Después de las 19:00: solo movimientos desde 19:00 en adelante
//         cFecha = ` AND fecha = ? AND hora >= '19:00:00'`;
//       } else {
//         // Antes de las 19:00: rango 10:00 del día anterior o actual hasta 10:00 del siguiente
//         cFecha = ` AND ((fecha = ? AND hora > '10:00:00') OR (fecha = ? AND hora < '10:00:00'))`;
//       }

//       // Construcción de la consulta
//       cSentencia = `SELECT *,
//         (COALESCE(SUM(CASE WHEN tipomov = 'e' THEN invitados ELSE 0 END), 0) -
//         COALESCE(SUM(CASE WHEN tipomov = 's' THEN invitados ELSE 0 END), 0))
//         AS invitadosDentro
//         FROM movimientos WHERE idsocio = ? ${cFecha}`;

//       console.log('Consulta:', cSentencia);
//       console.log("fecha inicio es: " + cfechainicio);
//       console.log("fecha final es: " + cfechafinal);

//       // Parámetros para la consulta
//       const params = nhoras >= 19
//         ? [idsocio, cfechainicio]
//         : [idsocio, cfechainicio, cfechafinal];

//       conn.query(cSentencia, params)
//         .then(rows => {
//           if (rows.length > 0) {
//             res.json({ invitadosDentro: rows[0].invitadosDentro || 0 });
//           } else {
//             res.json({ invitadosDentro: 0 });
//           }
//         })
//         .catch(err => {
//           console.error('Error en la consulta:', err);
//           res.status(500).json({ error: 'Error al obtener los movimientos' });
//         })
//         .finally(() => {
//           conn.release();
//         });
//     })
//     .catch(err => {
//       console.error('Error de conexión:', err);
//       res.status(500).json({ error: 'Error de conexión a la base de datos' });
//     });
// });

// para los movimientos totales de los socios y familiares.

app.get('/api/movimientostotales', (req, res) => {
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT *  FROM movimientos;

      `;
      conn.query(query)
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows); // Enviar los familiares encontrados
          } else {
            res.status(404).json({ error: 'No se encontraron familiares' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los familiares' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// movimientos filtrados por FECHA

app.get('/api/movimientostotalesFecha', (req, res) => {
  const fechaSeleccionada = req.query.fecha; // Obtener la fecha del parámetro de consulta

  if (!fechaSeleccionada) {
    return res.status(400).json({ error: 'Fecha es requerida' });
  }

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT * FROM movimientos WHERE fecha = ?
      `;
      conn.query(query, [fechaSeleccionada])  // Usar la fecha seleccionada en la consulta
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows); // Enviar los movimientos encontrados
          } else {
            res.status(404).json({ error: 'No se encontraron movimientos para esa fecha' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los movimientos' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Ruta para obtener un socio por su ID
app.get('/api/socios/:id', (req, res) => {
  const socioId = req.params.id;
  const startTime = Date.now();
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          socios.idsocio, socios.nombre, socios.apellido, socios.telefono,
          socios.direccion, socios.email, socios.invitaciones, socios.poblacion, socios.dni
        FROM socios
        WHERE socios.idsocio = ?;
      `;
      conn.query(query, [socioId])
        .then(rows => {
          console.log(`Tiempo de consulta: ${Date.now() - startTime}ms`);
          if (rows.length > 0) {
            res.json(rows[0]);
          } else {
            res.status(404).json({ error: 'Socio no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener el socio' });
        })
        .finally(() => conn.release());
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});
// para ver los familiares de cada socio y el numero total de
app.get('/api/familiares/:id', (req, res) => {
  const socioId = req.params.id;
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT f.*,
               (SELECT COUNT(*) FROM familiares WHERE SUBSTR(idsocio, 1, 4) = ?) AS cantidad_familiares
        FROM familiares f
        WHERE SUBSTR(f.idsocio, 1, 4) = ?;
      `;
      conn.query(query, [socioId, socioId])
        .then(rows => {
          if (rows.length > 0) {
            // Convertir cualquier BigInt a String antes de enviar la respuesta
            const sanitizedRows = rows.map(row => {
              const sanitizedRow = {};
              for (const key in row) {
                if (typeof row[key] === 'bigint') {
                  sanitizedRow[key] = row[key].toString(); // Convertir BigInt a String
                } else {
                  sanitizedRow[key] = row[key];
                }
              }
              return sanitizedRow;
            });
            res.json(sanitizedRows); // Enviar los familiares encontrados con la cantidad
          } else {
            res.status(404).json({ error: 'No se encontraron familiares' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los familiares' });
        })
        .finally(() => {
          conn.release() // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// para ver familiares
app.get('/api/familiares', (req, res) => {
  const socioId = req.params.id;
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          familiares.idsocio,
          familiares.nombre,
          familiares.apellido,
          familiares.invitaciones
        FROM
          familiares
      `;
      conn.query(query, [socioId])
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows); // Enviar los familiares encontrados
          } else {
            res.status(404).json({ error: 'No se encontraron familiares' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los familiares' });
        })
        .finally(() => {
          conn.release()// Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});



// Ruta para agregar un socio
app.post('/api/socios', (req, res) => {
  console.log('Body recibido:', req.body); // Agrega esta línea
  const { idsocio, nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni } = req.body;

  pool.getConnection()
    .then(conn => {
      const query = `
        INSERT INTO socios (idsocio, nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return conn.query(query, [idsocio, nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni])
        .then(result => {
          const insertId = result.insertId.toString();
          res.status(201).json({ message: 'Socio agregado correctamente', id: insertId });
        })
        .catch(err => {
          console.error('Error al insertar socio:', err);
          res.status(500).json({ error: 'Error al agregar el socio' });
        })
        .finally(() => {
          conn.release() // Asegura que la conexión se libere siempre
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});


// Ruta para agregar un familiar
app.post('/api/familiares/:socioId', (req, res) => {
  const socioId = req.params.socioId; // ID del socio base
  const { nombre, apellido, invitaciones } = req.body; // Datos del familiar con sus campos de la base de datos.

  pool.getConnection()
    .then(conn => {
      // Verificar si el socio existe
      const getSocioQuery = `SELECT idsocio FROM socios WHERE idsocio = ?`;

      conn.query(getSocioQuery, [socioId])
        .then(rows => {
          if (rows.length === 0) {
            res.status(404).json({ error: 'Socio no encontrado' });
            throw new Error('Socio no encontrado');
          }

          const idSocioBase = String(rows[0].idsocio); // Obtener el idsocio del socio base como cadena

          // Obtener el máximo sufijo de familiares existentes
          const maxSufijoQuery = `
            SELECT CAST(SUBSTRING(idsocio, LENGTH(?) + 1) AS UNSIGNED) AS sufijo
            FROM familiares
            WHERE idsocio LIKE CONCAT(?, '%')
            ORDER BY sufijo DESC
            LIMIT 1
          `;

          return conn.query(maxSufijoQuery, [idSocioBase, idSocioBase])
            .then(maxRows => {
              let nextSufijo = 1; // Si no hay familiares, el primer sufijo será 1
              if (maxRows.length > 0 && maxRows[0].sufijo !== null) {
                nextSufijo = Number(maxRows[0].sufijo) + 1; // Incrementar el sufijo existente
              }

              const sufijo = String(nextSufijo).padStart(2, '0'); // Formatear sufijo con dos dígitos
              const idFamiliar = `${idSocioBase}${sufijo}`; // Generar el idsocio del familiar

              // Insertar el nuevo familiar con el idsocio calculado
              const insertFamiliarQuery = `
                INSERT INTO familiares (idsocio, nombre, apellido, invitaciones)
                VALUES (?, ?, ?, ?)
              `;

              return conn.query(insertFamiliarQuery, [idFamiliar, nombre, apellido, invitaciones]);
            });
        })
        .then(result => {
          // El ID del nuevo registro se genera automáticamente en la base de datos
          const insertId = result.insertId.toString();
          res.status(201).json({
            message: 'Familiar agregado correctamente',
            id_familiar: insertId
          });
        })
        .catch(err => {
          console.error('Error al agregar el familiar:', err);
          res.status(500).json({ error: 'Error al agregar el familiar' });
        })
        .finally(() => conn.release()); // Liberar la conexión
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Editar un socio existente
app.put('/api/socios/:id', async (req, res) => {
  const { id } = req.params;
  const startTime = Date.now();
  console.log("id de socio recibido", id);
  console.log('Body recibido update:', req.body);
  const { nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni } = req.body;

  let conn;
  try {
    const connStart = Date.now();
    conn = await pool.getConnection();
    console.log(`Tiempo para obtener conexión: ${Date.now() - connStart}ms`);

    const query = `
      UPDATE socios
      SET nombre = ?, apellido = ?, telefono = ?, direccion = ?, email = ?, invitaciones = ?, poblacion = ?, dni = ?
      WHERE idsocio = ?`;
    const updateStart = Date.now();
    const result = await conn.query(query, [nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni, id]);
    console.log(`Tiempo de actualización: ${Date.now() - updateStart}ms`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    const selectStart = Date.now();
    const selectQuery = `SELECT * FROM socios WHERE idsocio = ?`;
    const updatedSocio = await conn.query(selectQuery, [id]);
    console.log(`Tiempo de selección: ${Date.now() - selectStart}ms`);
    console.log(`Tiempo total: ${Date.now() - startTime}ms`);

    res.json(updatedSocio[0]);
  } catch (err) {
    console.error('Error al actualizar el socio:', err);
    res.status(500).json({ error: 'Error al actualizar el socio' });
  } finally {
    if (conn) conn.release();
  }
});


// eliminar un socio / invitado
app.delete('/api/socios/:id', (req, res) => {
  const socioId = req.params.id;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      // Query para eliminar el socio
      const deleteQuery = `DELETE FROM socios WHERE idsocio = ?`;

      conn.query(deleteQuery, [socioId])
        .then(result => {
          if (result.affectedRows > 0) {
            res.json({ message: 'Socio eliminado correctamente' });
          } else {
            res.status(404).json({ error: 'Socio no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error al eliminar el socio:', err);
          res.status(500).json({ error: 'Error al eliminar el socio' });
        })
        .finally(() => {
          conn.release(); // Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});


// eliminar familiares
app.delete('/api/familiares/:idsocio', (req, res) => {

  const idSocio = req.params.idsocio;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      // Query para eliminar el familiar
      const deleteQuery = `DELETE FROM familiares WHERE idsocio = ?`;

      conn.query(deleteQuery, [idSocio])
        .then(result => {
          if (result.affectedRows > 0) {
            res.json({ message: 'Familiar eliminado correctamente' });
          } else {
            res.status(404).json({ error: 'Familiar no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error al eliminar el familiar:', err);
          res.status(500).json({ error: 'Error al eliminar el familiar' });
        })
        .finally(() => {
          conn.release();// Liberar la conexión
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

app.post('/api/limpieza', (req, res) => {
  console.log('Body recibido:', req.body);
  const { fecha, hora } = req.body;

  if (!fecha || !hora) {
    return res.status(400).json({ error: 'Se requieren fecha y hora' });
  }

  pool.getConnection()
    .then(conn => {
      // Verificar si ya existe un registro para la fecha
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM limpieza
        WHERE fecha = ?
      `;

      conn.query(checkQuery, [fecha])
        .then(result => {
          if (result[0].count > 0) {
            // Si ya existe un registro, devolver un 409 Conflict
            conn.release();
            return res.status(409).json({ error: 'Ya existe un registro de limpieza para este día' });
          }

          // Si no existe, insertar el nuevo registro
          const insertQuery = `
            INSERT INTO limpieza (fecha, hora)
            VALUES (?, ?)
          `;
          return conn.query(insertQuery, [fecha, hora])
            .then(result => {
              const insertId = result.insertId.toString();
              res.status(201).json({ message: 'Registro de limpieza agregado correctamente', id: insertId });
            });
        })
        .catch(err => {
          console.error('Error al procesar el registro de limpieza:', err);
          if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Ya existe un registro de limpieza para este día' });
          } else {
            res.status(500).json({ error: 'Error al agregar el registro de limpieza' });
          }
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

app.get('/api/limpieza', (req, res) => {
  pool.getConnection()
    .then(conn => {
      const query = `
        SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, hora
        FROM limpieza
        ORDER BY fecha DESC, hora DESC
      `;

      conn.query(query)
        .then(rows => {
          res.json(rows); // Devuelve fechas en formato YYYY-MM-DD
        })
        .catch(err => {
          console.error('Error al obtener registros de limpieza:', err);
          res.status(500).json({ error: 'Error al obtener los registros de limpieza' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

app.put('/api/limpieza', (req, res) => {
  console.log('Body recibido:', req.body);
  const { fecha, hora } = req.body;

  if (!fecha || !hora) {
    return res.status(400).json({ error: 'Se requieren fecha y hora' });
  }

  pool.getConnection()
    .then(conn => {
      const query = `
        UPDATE limpieza
        SET hora = ?
        WHERE fecha = ?
      `;

      conn.query(query, [hora, fecha])
        .then(result => {
          if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Hora de limpieza actualizada correctamente' });
          } else {
            res.status(404).json({ error: 'No se encontró un registro para esa fecha' });
          }
        })
        .catch(err => {
          console.error('Error al actualizar la hora de limpieza:', err);
          res.status(500).json({ error: 'Error al actualizar la hora de limpieza' });
        })
        .finally(() => {
          conn.release();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://192.168.210.176:3000');
});
