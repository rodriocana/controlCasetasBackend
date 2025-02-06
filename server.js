const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors'); // Importar cors

const app = express();

// Middleware para permitir el parseo de solicitudes JSON
app.use(cors());
app.use(express.json()); // Este middleware es crucial para procesar req.body como JSON
app.use(express.urlencoded({ extended: true })); // Para procesar datos de formularios si es necesario



// Configuración de la base de datos MariaDB
const pool = mariadb.createPool({
  host: process.env.DB_HOST || '192.168.210.176',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'casetas',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5,
  acquireTimeout: 5000
});

// const pool = mariadb.createPool({
//   host: process.env.MARIADB_HOST,
//   user: process.env.MARIADB_USER,
//   password: process.env.MARIADB_PASSWORD,
//   database: process.env.MARIADB_DATABASE,
//   port: process.env.MARIADB_PORT || 3306,
//   connectionLimit: 5
// });



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
          conn.end(); // Liberar la conexión
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
          conn.end();
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
          conn.end();
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

         // Actualizar el total de invitaciones del socio según el tipo de movimiento
          // if (idsocio) {
          //   const updateQuery = `
          //     UPDATE movimientos
          //     SET invitados = invitados ${tipomov === 'entrada' ? '-' : '+'} ?
          //     WHERE idsocio = ?
          //   `;
          //   return conn.query(updateQuery, [invitados, idsocio])
          //     .then(() => {
          //       res.status(201).json({ message: 'Movimiento registrado correctamente', id_registro: insertId });
          //     });
          // } else {
          //   res.status(201).json({ message: 'Movimiento registrado correctamente', id_registro: insertId });
          // }
        })
        .catch(err => {
          console.error('Error al registrar el movimiento:', err);
          res.status(500).json({ error: 'Error al registrar el movimiento' });
        })
        .finally(() => {
          conn.end(); // Liberar la conexión
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
          conn.end();  // Liberar la conexión
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

      const queryFamiliar = `
        SELECT
          COALESCE(SUM(CASE WHEN tipomov = 'e' THEN invitados ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN tipomov = 's' THEN invitados ELSE 0 END), 0)
          AS invitadosDentro
        FROM movimientos
        WHERE idsocio = ?;
      `;

      conn.query(queryFamiliar, [idsocio])
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows[0]); // Devolvemos el resultado
          } else {
            res.status(404).json({ error: 'Familiar no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error al consultar familiar:', err);
          res.status(500).json({ error: 'Error al obtener familiar' });
        })
        .finally(() => {
          conn.end();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});
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
          conn.end(); // Liberar la conexión
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
        WHERE
          socios.idsocio = ?;
      `;
      conn.query(query, [socioId])
        .then(rows => {
          if (rows.length > 0) {
            res.json(rows[0]); // Enviar el primer socio encontrado
          } else {
            res.status(404).json({ error: 'Socio no encontrado' });
          }
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener el socio' });
        })
        .finally(() => {
          conn.end(); // Liberar la conexión
        });
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
          conn.end(); // Liberar la conexión
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
          conn.end(); // Liberar la conexión
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
  const {idsocio, nombre, apellido, telefono, direccion,  email, invitaciones, poblacion, dni } = req.body;

  pool.getConnection()
    .then(conn => {
      const query = `
        INSERT INTO socios (idsocio, nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      conn.query(query, [idsocio, nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni])
  .then(result => {
    // Convertir insertId a String para evitar el error de BigInt
    const insertId = result.insertId.toString(); // o puedes usar .valueOf() para convertirlo a Number

    res.status(201).json({ message: 'Socio agregado correctamente', id: insertId });
        })
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
app.put('/api/socios/:id', (req, res) => {
  const { id } = req.params;
  console.log ("id de socio recibido", id);
  console.log('Body recibido update:', req.body); // Agrega esta línea
  const { nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni } = req.body;

  pool.getConnection()
    .then(conn => {
      const query = `
          UPDATE socios
          SET nombre = ?, apellido = ?, telefono = ?, direccion = ?, email = ?, invitaciones = ? , poblacion = ?, dni = ?
          WHERE idsocio = ?`;

      conn.query(query, [nombre, apellido, telefono, direccion, email, invitaciones, poblacion, dni, id], (err, result) => {
        if (err) {
          console.error('Error al actualizar el socio:', err);
          return res.status(500).json({ error: 'Error al actualizar el socio' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Socio no encontrado' });
        }
        res.json({ idsocio: id, nombre, apellido, telefono, direccion, email, invitaciones });
      });
    });
});


// eliminar un socio / invitado
app.delete('/api/socios/:id', (req, res) => {
  const socioId = req.params.id;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');

      // Query para eliminar el socio
      const deleteQuery = `DELETE FROM socios WHERE id_socio = ?`;

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
          conn.end(); // Liberar la conexión
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
          conn.end(); // Liberar la conexión
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
