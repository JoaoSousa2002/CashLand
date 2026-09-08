// src/swagger/swaggerConfig.js
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CashLand API',
      version: '1.0.0',
      description: 'Documentação da API de autenticação e serviços do CashLand',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Caminho dos arquivos onde estão os comentários JSDoc das rotas
  apis: ['./src/rf-001-Login/Servidor.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;