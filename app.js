// app.js
const express = require('express');
const http = require('http');
const mqtt = require('mqtt');
const { Server } = require("socket.io");
const tf = require('@tensorflow/tfjs'); // Usando '@tensorflow/tfjs'

// Configuración MQTT
const MQTT_SERVER = "mqtts://a632c67843b6481cb94e93b8053f29dd.s1.eu.hivemq.cloud";
const MQTT_PORT = 8883;
const MQTT_USER = "miye";
const MQTT_PASSWORD = "Miye1234";
const MQTT_TOPIC = "sensores/temperatura_humedad";

// Configurar Express y Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos de la carpeta "public"
app.use(express.static('public'));

// Variables para almacenar datos
let gateStatus = 'CERRADA'; // Estado inicial de la compuerta

// Función de normalización y escalado
/**
 * Escala y normaliza un valor en un rango específico a un valor entre 0 y 1.
 * @param {number} value - El valor a escalar y normalizar.
 * @param {number} scale - El factor de escala (peso) para la característica.
 * @param {number} min - El valor mínimo del rango original.
 * @param {number} max - El valor máximo del rango original.
 * @returns {number} El valor escalado y normalizado entre 0 y 1.
 */
function scaleAndNormalize(value, scale, min, max) {
  const scaled = value * scale; // Escalar el valor
  return (scaled - min) / (max - min); // Normalizar el valor
}

// Datos de entrenamiento (temperatura y humedad escaladas y normalizadas)
// Priorizando la temperatura con un peso de 70% y humedad 30%
const trainingData = [
  // { input: [temperatura_escalada_normalizada, humedad_escalada_normalizada], output: [0 ó 1] }
  { input: [scaleAndNormalize(5, 0.7, 0, 21.7), scaleAndNormalize(40, 0.3, 0, 30)], output: [0] },    // Muy baja temp, baja humedad -> CERRADA
  { input: [scaleAndNormalize(6, 0.7, 0, 21.7), scaleAndNormalize(42, 0.3, 0, 30)], output: [0] },    // Muy baja temp, humedad media -> CERRADA
  { input: [scaleAndNormalize(7, 0.7, 0, 21.7), scaleAndNormalize(45, 0.3, 0, 30)], output: [0] },    // Baja temp, humedad media -> CERRADA
  { input: [scaleAndNormalize(8, 0.7, 0, 21.7), scaleAndNormalize(48, 0.3, 0, 30)], output: [0] },    // Baja temp, humedad alta -> CERRADA
  { input: [scaleAndNormalize(9, 0.7, 0, 21.7), scaleAndNormalize(50, 0.3, 0, 30)], output: [0] },    // Baja temp, humedad alta -> CERRADA
  { input: [scaleAndNormalize(10, 0.7, 0, 21.7), scaleAndNormalize(52, 0.3, 0, 30)], output: [0] },   // Baja temp, humedad alta -> CERRADA
  { input: [scaleAndNormalize(11, 0.7, 0, 21.7), scaleAndNormalize(55, 0.3, 0, 30)], output: [0] },   // Temp media-baja, humedad alta -> CERRADA
  { input: [scaleAndNormalize(12, 0.7, 0, 21.7), scaleAndNormalize(58, 0.3, 0, 30)], output: [0] },   // Temp media-baja, humedad alta -> CERRADA
  { input: [scaleAndNormalize(13, 0.7, 0, 21.7), scaleAndNormalize(60, 0.3, 0, 30)], output: [1] },   // Temp media, humedad alta -> ABIERTA
  { input: [scaleAndNormalize(14, 0.7, 0, 21.7), scaleAndNormalize(62, 0.3, 0, 30)], output: [1] },   // Temp media, humedad alta -> ABIERTA
  { input: [scaleAndNormalize(15, 0.7, 0, 21.7), scaleAndNormalize(65, 0.3, 0, 30)], output: [1] },   // Temp media, humedad alta -> ABIERTA
  { input: [scaleAndNormalize(16, 0.7, 0, 21.7), scaleAndNormalize(68, 0.3, 0, 30)], output: [1] },   // Temp media-alta, humedad alta -> ABIERTA
  { input: [scaleAndNormalize(17, 0.7, 0, 21.7), scaleAndNormalize(70, 0.3, 0, 30)], output: [1] },   // Alta temp, humedad alta -> ABIERTA
  { input: [scaleAndNormalize(18, 0.7, 0, 21.7), scaleAndNormalize(73, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(19, 0.7, 0, 21.7), scaleAndNormalize(75, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(20, 0.7, 0, 21.7), scaleAndNormalize(78, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(21, 0.7, 0, 21.7), scaleAndNormalize(80, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(22, 0.7, 0, 21.7), scaleAndNormalize(82, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(23, 0.7, 0, 21.7), scaleAndNormalize(85, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(24, 0.7, 0, 21.7), scaleAndNormalize(88, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(25, 0.7, 0, 21.7), scaleAndNormalize(90, 0.3, 0, 30)], output: [1] },   // Alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(26, 0.7, 0, 21.7), scaleAndNormalize(92, 0.3, 0, 30)], output: [1] },   // Muy alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(27, 0.7, 0, 21.7), scaleAndNormalize(95, 0.3, 0, 30)], output: [1] },   // Muy alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(28, 0.7, 0, 21.7), scaleAndNormalize(98, 0.3, 0, 30)], output: [1] },   // Muy alta temp, muy alta humedad -> ABIERTA
  { input: [scaleAndNormalize(29, 0.7, 0, 21.7), scaleAndNormalize(100, 0.3, 0, 30)], output: [1] },  // Muy alta temp, humedad máxima -> ABIERTA
  { input: [scaleAndNormalize(30, 0.7, 0, 21.7), scaleAndNormalize(100, 0.3, 0, 30)], output: [1] },  // Muy alta temp, humedad máxima -> ABIERTA
  { input: [scaleAndNormalize(31, 0.7, 0, 21.7), scaleAndNormalize(100, 0.3, 0, 30)], output: [1] },  // Temperatura máxima, humedad máxima -> ABIERTA
  { input: [scaleAndNormalize(1, 0.7, 0, 21.7), scaleAndNormalize(20, 0.3, 0, 30)], output: [0] },    // Muy baja temp, baja humedad -> CERRADA
  { input: [scaleAndNormalize(2, 0.7, 0, 21.7), scaleAndNormalize(25, 0.3, 0, 30)], output: [0] },    // Muy baja temp, baja humedad -> CERRADA
  { input: [scaleAndNormalize(3, 0.7, 0, 21.7), scaleAndNormalize(28, 0.3, 0, 30)], output: [0] },    // Muy baja temp, baja humedad -> CERRADA
  { input: [scaleAndNormalize(4, 0.7, 0, 21.7), scaleAndNormalize(30, 0.3, 0, 30)], output: [0] },    // Muy baja temp, baja humedad -> CERRADA
  { input: [scaleAndNormalize(5, 0.7, 0, 21.7), scaleAndNormalize(32, 0.3, 0, 30)], output: [0] },    // Muy baja temp, humedad media -> CERRADA
  { input: [scaleAndNormalize(10, 0.7, 0, 21.7), scaleAndNormalize(87, 0.3, 0, 30)], output: [0] },   // Baja temp, alta humedad -> CERRADA
];

// Preparar los datos para TensorFlow.js
const xs = tf.tensor2d(trainingData.map(d => d.input)); // Entradas escaladas y normalizadas
const ys = tf.tensor2d(trainingData.map(d => d.output)); // Salidas binarias

// Crear el modelo
const model = tf.sequential();
model.add(tf.layers.dense({ units: 10, inputShape: [2], activation: 'relu' })); // Capa oculta con 10 unidades
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // Capa de salida

// Compilar el modelo
model.compile({
  optimizer: 'adam',
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
});

// Entrenar el modelo
(async () => {
  await model.fit(xs, ys, {
    epochs: 200, // Incrementar las épocas para mejor aprendizaje
    verbose: 1, // Mostrar progreso del entrenamiento
    validationSplit: 0.2, // Usar el 20% de los datos para validación
    shuffle: true, // Mezclar los datos antes de cada época
  });
  console.log('Modelo entrenado');
})();

// Conectar al broker MQTT
const mqttOptions = {
  port: MQTT_PORT,
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  rejectUnauthorized: false, // No verificar certificado (Inseguro)
};
const mqttClient = mqtt.connect(MQTT_SERVER, mqttOptions);

// Manejar mensajes MQTT
mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`Suscrito al tópico ${MQTT_TOPIC}`);
    } else {
      console.error(`Error al suscribirse al tópico ${MQTT_TOPIC}:`, err);
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  if (topic === MQTT_TOPIC) {
    const payload = JSON.parse(message.toString());
    const temperatura = parseFloat(payload.temperatura);
    const humedad = parseFloat(payload.humedad);

    // Normalizar y escalar los datos usando la función de normalización
    const temperaturaNorm = scaleAndNormalize(temperatura, 0.7, 0, 21.7); // 0°C a 31°C escalado por 0.7
    const humedadNorm = scaleAndNormalize(humedad, 0.3, 0, 30); // 0% a 100% escalado por 0.3

    // Obtener respuesta del modelo
    const inputTensor = tf.tensor2d([[temperaturaNorm, humedadNorm]]);
    const outputTensor = model.predict(inputTensor);
    const output = await outputTensor.data();
    const respuesta = Math.round(output[0]); // Redondear a 0 o 1

    // Actualizar estado de la compuerta basado en temperatura
    if (temperatura > 25) { // Umbral de temperatura para abrir la compuerta
      gateStatus = 'ABIERTA';
    } else {
      gateStatus = 'CERRADA';
    }

    // Emitir datos a los clientes conectados
    io.emit('datos', {
      temperatura,
      humedad,
      fecha: new Date().toLocaleString(),
      respuesta,
      gateStatus,
    });
  }
});

mqttClient.on('error', (error) => {
  console.error("Error de conexión MQTT:", error);
});

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Enviar estado inicial de la compuerta
  socket.emit('gateStatus', gateStatus);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor en el puerto 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
