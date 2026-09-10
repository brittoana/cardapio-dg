const { MercadoPagoConfig, Preference } = require("mercadopago");

const PRODUCTS = {
  tradicional: {
    title: "Brigadeiro Tradicional",
    price: 3.5,
  },

  nozes: {
    title: "Brigadeiro de Nozes",
    price: 3.5,
  },

  oreo: {
    title: "Brigadeiro de Oreo",
    price: 3.5,
  },

  churros: {
    title: "Brigadeiro de Churros",
    price: 3.5,
  },

  caixa4: {
    title: "Caixa com Quatro Brigadeiros",
    price: 12.0,
  },
};

function json(statusCode, body) {
  return {
    statusCode,

    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },

    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return json(405, {
      error: "Método não permitido.",
    });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error(
      "MP_ACCESS_TOKEN não configurado no Netlify."
    );

    return json(500, {
      error:
        "Pagamento ainda não foi configurado no servidor.",
    });
  }

  let payload;

  try {
    payload = JSON.parse(
      event.body || "{}"
    );
  } catch {
    return json(400, {
      error: "Dados do pedido inválidos.",
    });
  }

  const inputItems =
    Array.isArray(payload.items)
      ? payload.items
      : [];

  if (inputItems.length === 0) {
    return json(400, {
      error: "O carrinho está vazio.",
    });
  }

  const items = [];

  for (const item of inputItems) {

    const product =
      PRODUCTS[item.productId];

    const quantity =
      Number(item.quantity);

    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return json(400, {
        error:
          "Há um item inválido no carrinho.",
      });
    }

    items.push({
      id: item.productId,
      title: product.title,
      quantity: quantity,
      currency_id: "BRL",
      unit_price: product.price,
    });
  }

  const customer =
    payload.customer || {};

  const client =
    new MercadoPagoConfig({
      accessToken: accessToken,
    });

  const preference =
    new Preference(client);

  const host =
    event.headers["x-forwarded-host"] ||
    event.headers.host;

  const proto =
    event.headers["x-forwarded-proto"] ||
    "https";

  const siteUrl =
    host
      ? `${proto}://${host}`
      : null;

  const body = {

    items: items,

    payer: customer.name
      ? {
          name: String(
            customer.name
          ).slice(0, 70),
        }
      : undefined,

    metadata: {
      customer_name:
        customer.name || "",

      customer_phone:
        customer.phone || "",

      delivery_type:
        customer.deliveryType || "",

      address:
        customer.address || "",

      reference:
        customer.reference || "",

      desired_date:
        customer.desiredDate || "",

      notes:
        customer.notes || "",
    },
  };

  if (
    siteUrl &&
    siteUrl.startsWith("https://")
  ) {

    body.back_urls = {

      success:
        `${siteUrl}/?payment=success`,

      pending:
        `${siteUrl}/?payment=pending`,

      failure:
        `${siteUrl}/?payment=failure`,
    };

    body.auto_return =
      "approved";
  }

  try {

    const result =
      await preference.create({
        body: body,
      });

    if (
      !result ||
      !result.init_point
    ) {

      console.error(
        "Mercado Pago não retornou init_point:",
        result
      );

      return json(502, {
        error:
          "O Mercado Pago não retornou o link de pagamento.",
      });
    }

    return json(200, {

      id: result.id,

      init_point:
        result.init_point,
    });

  } catch (error) {

    console.error(
      "Erro Mercado Pago:",
      error
    );

    const details =
      error &&
      error.message
        ? String(
            error.message
          ).slice(0, 300)
        : "Erro desconhecido";

    return json(500, {

      error:
        "Não foi possível criar o pagamento no Mercado Pago.",

      details: details,
    });
  }
};