const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors'); // Importar cors

const app = express();

// Middleware para permitir el parseo de solicitudes JSON
app.use(cors());
app.use(express.json()); // Este middleware es crucial para procesar req.body como JSON
app.use(express.urlencoded({ extended: true })); // Para procesar datos de formularios si es necesario

// Usar CORS en el servidor
app.use(cors()); // Esto habilita CORS para todas las solicitudes

// Configuración de la base de datos MariaDB
const pool = mariadb.createPool({
  host: '192.168.210.176',
  user: 'root',
  password: '',
  database: 'casetas',
  port: 3306,
  connectionLimit: 5,
  acquireTimeout: 5000
});

// Ruta para obtener los socios con el número de tarjeta
// app.get('/api/socios', (req, res) => {
//   pool.getConnection()
//     .then(conn => {
//       console.log('Conectado a la base de datos');
//       const query = `
//         SELECT
//           socios.id_socio,
//           socios.nombre,
//           socios.apellido,
//           socios.telefono,
//           socios.domicilio,
//           socios.invitaciones,
//           tarjetas.numero_tarjeta
//         FROM
//           socios
//         JOIN
//           tarjetas
//         ON
//           socios.id_socio = tarjetas.id_socio;
//       `;
//       conn.query(query)
//         .then(rows => {
//           res.json(rows); // Enviar los datos como JSON
//         })
//         .catch(err => {
//           console.error('Error en la consulta:', err);
//           res.status(500).json({ error: 'Error al obtener los socios' });
//         })
//         .finally(() => {
//           conn.end(); // Liberar la conexión
//         });
//     })
//     .catch(err => {
//       console.error('Error de conexión:', err);
//       res.status(500).json({ error: 'Error de conexión a la base de datos' });
//     });
// });

// ACCEDER A TARJETA SOCIO DESDE LA TABLA SOCIO
app.get('/api/socios', (req, res) => {
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          socios.id_socio,
          socios.nombre,
          socios.apellido,
          socios.telefono,
          socios.domicilio,
          socios.invitaciones,
          socios.NumTar
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


// api para entrada socio pasandole el parametro numTar

app.get('/api/entrada/:numTar', (req, res) => {
  const socioNumTar = req.params.numTar; // Cambiar de req.params.id a req.params.numTar
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          socios.id_socio,
          socios.nombre,
          socios.apellido,
          socios.telefono,
          socios.domicilio,
          socios.invitaciones
        FROM
          socios
        WHERE
          socios.NumTar = ?;
      `;
      conn.query(query, [socioNumTar])
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

// Ruta para obtener un socio por su ID
app.get('/api/socios/:id', (req, res) => {
  const socioId = req.params.id;
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          socios.id_socio,
          socios.nombre,
          socios.apellido,
          socios.telefono,
          socios.domicilio,
          socios.invitaciones,
          socios.NumTar
        FROM
          socios
        WHERE
          socios.id_socio = ?;
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

// Ruta para obtener los familiares de un socio
app.get('/api/familiares/:id', (req, res) => {
  const socioId = req.params.id;
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
        familiares.id_familiar,
          familiares.nombre,
          familiares.apellido
        FROM
          familiares
        WHERE
          familiares.id_socio = ?;
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

app.delete('/api/familiares/:id', (req, res) => {
  const idFamiliar = req.params.id;
  const query = 'DELETE FROM familiares WHERE id_familiar = ?';

  db.query(query, [idFamiliar], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al eliminar el familiar.');
    } else {
      res.send('Familiar eliminado correctamente.');
    }
  });
});

// Ruta para agregar un socio
app.post('/api/socios', (req, res) => {
  console.log('Body recibido:', req.body); // Agrega esta línea
  const { nombre, apellido, telefono, domicilio, invitaciones, NumTar } = req.body;

  pool.getConnection()
    .then(conn => {
      const query = `
        INSERT INTO socios (nombre, apellido, telefono, domicilio, invitaciones, NumTar)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      conn.query(query, [nombre, apellido, telefono, domicilio, invitaciones, NumTar])
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
app.post('/api/familiares', (req, res) => {
  const { idSocio, nombre, apellido } = req.body;

  pool.getConnection()
    .then(conn => {
      // Obtener el número de tarjeta del socio
      const getNumTarQuery = `SELECT NumTar FROM socios WHERE id_socio = ?`;

      conn.query(getNumTarQuery, [idSocio])
        .then(rows => {
          if (rows.length === 0) {
            res.status(404).json({ error: 'Socio no encontrado' });
            return Promise.reject('Socio no encontrado');
          }

          const numTarBase = rows[0].NumTar;

          // Obtener el número de familiares existentes para generar el sufijo
          const countFamiliaresQuery = `SELECT COUNT(*) AS total FROM familiares WHERE id_socio = ?`;

          return conn.query(countFamiliaresQuery, [idSocio])
            .then(countRows => {
              const totalFamiliares = countRows[0].total;
              const numTarFamiliar = `${numTarBase}${String(totalFamiliares + 1).padStart(2, '0')}`;

              // Insertar el nuevo familiar
              const insertFamiliarQuery = `
                INSERT INTO familiares (id_familiar, id_socio, nombre, apellido, NumTar)
                VALUES (?, ?, ?, ?, ?)
              `;
              return conn.query(insertFamiliarQuery, [idSocio, nombre, apellido, numTarFamiliar]);
            });
        })
        .then(result => {
          res.status(201).json({ message: 'Familiar agregado correctamente', id: result.insertId });
        })
        .catch(err => {
          if (err !== 'Socio no encontrado') {
            console.error('Error al agregar el familiar:', err);
            res.status(500).json({ error: 'Error al agregar el familiar' });
          }
        })
        .finally(() => conn.end());
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
