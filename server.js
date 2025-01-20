const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors'); // Importar cors

const app = express();

// Usar CORS en el servidor
app.use(cors()); // Esto habilita CORS para todas las solicitudes

// Configuración de la base de datos MariaDB
const pool = mariadb.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'casetas',
  port: 3306,
  connectionLimit: 5,
  acquireTimeout: 5000
});

// Ruta para obtener los socios con el número de tarjeta
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
          socios.numero_familiares,
          tarjetas.numero_tarjeta
        FROM
          socios
        JOIN
          tarjetas
        ON
          socios.id_socio = tarjetas.id_socio;
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
          socios.numero_familiares,
          tarjetas.numero_tarjeta
        FROM
          socios
        JOIN
          tarjetas
        ON
          socios.id_socio = tarjetas.id_socio
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

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
