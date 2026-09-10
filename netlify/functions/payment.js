const { MercadoPagoConfig, Preference } = require('mercadopago');

const PRODUCTS_DB = {
  tradicional: { name: "Brigadeiro Tradicional", price: 3.50 },
  nozes: { name: "Brigadeiro de Nozes", price: 3.50 },
  oreo: { name: "Brigadeiro de Oreo", price: 3.50 },
  churros: { name: "Brigadeiro de Churros", price: 3.50 },
  caixa4: { name: "Caixa com Quatro Brigadeiros", price: 12.00 }
};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Variável MERCADOPAGO_ACCESS_TOKEN não configurada no Netlify.' })
      };
    }

    const client = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(client);

    const data = JSON.parse(event.body || '{}');
    const { items, customer } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Carrinho vazio ou formato inválido.' })
      };
    }

    const mpItems = items.map((item) => {
      const product = PRODUCTS_DB[item.productId];
      if (!product) {
        throw new Error(`Produto não cadastrado: ${item.productId}`);
      }
      return {
        id: item.productId,
        title: product.name,
        quantity: Number(item.quantity),
        unit_price: product.price,
        currency_id: 'BRL'
      };
    });

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: customer?.name || '',
          phone: { number: customer?.phone || '' }
        },
        metadata: {
          delivery_type: customer?.deliveryType,
          address: customer?.address,
          reference: customer?.reference,
          desired_date: customer?.desiredDate,
          notes: customer?.notes
        }
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: result.init_point })
    };

  } catch (error) {
    console.error('Erro na Netlify Function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Erro interno no servidor de pagamento.' })
    };
  }
};