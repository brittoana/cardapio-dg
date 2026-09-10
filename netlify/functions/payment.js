const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const preference = new Preference(client);

    // Exemplo simples de criação de preferência
    const result = await preference.create({
      body: {
        items: [
          {
            title: 'Pedido Doce Graça',
            quantity: 1,
            unit_price: 10.00 // Calcule o valor total aqui com base nos itens
          }
        ]
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: result.init_point })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};