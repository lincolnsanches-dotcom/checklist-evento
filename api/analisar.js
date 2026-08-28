export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagem não fornecida' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Você é um assistente de hotelaria. Identifique qual prato ou alimento está neste rechaud/buffet. Responda APENAS com o nome do prato em português (ex: "Arroz Carreteiro", "Strogonoff de Frango"). Se não souber, responda "Alimento não identificado".'
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const nomeAlimento = data.candidates[0].content.parts[0].text.trim();
      return res.status(200).json({ alimento: nomeAlimento });
    }

    return res.status(500).json({ error: 'Não foi possível ler a resposta da IA' });

  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar imagem' });
  }
}