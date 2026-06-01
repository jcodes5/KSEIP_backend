/**
 * Swagger configuration options for KSEIP API documentation
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KSEIP API',
      version: '1.0.0',
      description: 'API documentation for the Kogi state Environmental Intelligence Platform (KSEIP)',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: 'Development server',
      },

      {
        url: 'https://api.kseip.gov.ng',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API key authentication for protected endpoints',
        },
      },
    },
  },
  apis: [
    './src/routes/*.js', // Path to the API routes files
  ],
};

const specs = swaggerJsdoc(options);

export { specs };