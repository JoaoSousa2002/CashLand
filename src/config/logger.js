import winston from "winston";

const { combine, timestamp, errors, json, colorize, printf } =
    winston.format;

// Formatação dos logs exibidos no terminal
const formatoConsole = printf(
    ({ timestamp, level, message, ...metadata }) => {

        const dadosAdicionais = Object.keys(metadata).length
            ? JSON.stringify(metadata)
            : "";

        return `${timestamp} [${level}]: ${message} ${dadosAdicionais}`;
    }
);

// Configuração principal
const logger = winston.createLogger({

    level: process.env.LOG_LEVEL || "http",

    format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
    ),

    transports: [

        // Exibe logs no terminal
        new winston.transports.Console({
            silent: true,
            format: combine(
                colorize(),
                timestamp(),
                formatoConsole
            )

        }),

        // Registra todos os eventos
        new winston.transports.File({
            filename: "logs/cashland.log",
            level: "http"
        }),

        // Registra apenas erros
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        })

    ]

});

// Erros assíncronos dos transportes não devem derrubar uma operação da API.
logger.on("error", () => { process.stderr.write("Falha no transporte de logs.\n"); });

export default logger;