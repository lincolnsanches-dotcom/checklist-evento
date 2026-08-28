let imagensBase64 = []; // Guarda objetos: { data: 'base64...', analisada: false }

document.addEventListener("DOMContentLoaded", () => {
  carregarHistorico();
});

// Troca de Abas
function trocarAba(nomeAba) {
  document.getElementById('btn-tab-novo').classList.remove('active');
  document.getElementById('btn-tab-historico').classList.remove('active');
  document.getElementById('aba-novo').classList.remove('active');
  document.getElementById('aba-historico').classList.remove('active');

  if (nomeAba === 'novo') {
    document.getElementById('btn-tab-novo').classList.add('active');
    document.getElementById('aba-novo').classList.add('active');
  } else {
    document.getElementById('btn-tab-historico').classList.add('active');
    document.getElementById('aba-historico').classList.add('active');
    carregarHistorico();
  }
}

// 1. CARREGAMENTO RÁPIDO DAS FOTOS COM COMPRESSÃO OTIMIZADA
function mostrarPrevia(event) {
  const container = document.getElementById('preview-container');
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (const file of Array.from(files)) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.src = e.target.result;
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Reduzido para 400px max (perfeito para IA e extremamente leve de subir)
        const maxWidth = 400;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedData = canvas.toDataURL('image/jpeg', 0.5);

        imagensBase64.push({
          data: compressedData,
          analisada: false
        });

        const previewImg = document.createElement('img');
        previewImg.src = compressedData;
        previewImg.classList.add('img-preview');
        container.appendChild(previewImg);
      };
    };
    reader.readAsDataURL(file);
  }
  event.target.value = '';
}

// 2. ANÁLISE ULTRA-RÁPIDA EM PARALELO (PROMISE.ALL)
async function analisarFotosComIA() {
  if (imagensBase64.length === 0) {
    alert("Selecione pelo menos uma foto antes de analisar!");
    return;
  }

  // Mapeia os índices de fotos que ainda NÃO foram analisadas
  const indicesPendentes = imagensBase64
    .map((item, idx) => (!item.analisada ? idx : null))
    .filter(idx => idx !== null);

  if (indicesPendentes.length === 0) {
    alert("Todas as fotos selecionadas já foram analisadas!");
    return;
  }

  const btnIA = document.getElementById('btn-ia');
  const obsField = document.getElementById('observacoes');

  btnIA.disabled = true;
  btnIA.innerText = "⚡ Analisando fotos em paralelo...";

  const parte1 = "AQ.Ab8RN6JTITegcGq4pbDx";
  const parte2 = "Yll0te0-txji8zOUFfE82PTX_86SMw";
  const apiKey = parte1 + parte2;

  // Mostra avisos temporários de carregamento no campo
  indicesPendentes.forEach(index => {
    obsField.value += (obsField.value.trim() ? "\n" : "") + `🔍 Analisando foto ${index + 1}...`;
  });

  // Função interna para requisição individual
  const analisarUnicaFoto = async (index) => {
    const itemFoto = imagensBase64[index];
    const base64Clean = itemFoto.data.replace(/^data:image\/\w+;base64,/, '');
    const numeroFoto = index + 1;
    const avisoTemp = `🔍 Analisando foto ${numeroFoto}...`;

    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Identifique o prato ou alimento na imagem. Responda APENAS o nome do alimento em portugues sem usar emojis (ex: "Strogonoff de Frango", "Batata Saute"). Se nao for alimento, responda "Item nao identificado".' },
              { inline_data: { mime_type: 'image/jpeg', data: base64Clean } }
            ]
          }]
        })
      });

      const data = await res.json();

      let alimento = "Item não identificado";
      if (res.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        alimento = data.candidates[0].content.parts[0].text.trim();
      }

      obsField.value = obsField.value.replace(avisoTemp, `- Foto ${numeroFoto}: ${alimento}`);
      itemFoto.analisada = true;

    } catch (err) {
      console.error(`Erro na foto ${numeroFoto}:`, err);
      obsField.value = obsField.value.replace(avisoTemp, `- Foto ${numeroFoto}: Falha no envio`);
    }
  };

  // Dispara todas as requisições simultaneamente!
  await Promise.all(indicesPendentes.map(index => analisarUnicaFoto(index)));

  btnIA.disabled = false;
  btnIA.innerText = "✅ Análise Concluída!";
}

// Converter Logo local para Base64
function carregarLogoBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = url;
  });
}

// Processar formulário
async function processarEGerar() {
  const btn = document.getElementById('btn-salvar');
  btn.innerText = "⏳ Gerando PDF, aguarde...";
  btn.disabled = true;

  try {
    const evento = document.getElementById('evento').value;
    const local = document.getElementById('local').value;
    const responsavel = document.getElementById('responsavel').value;
    const observacoes = document.getElementById('observacoes').value;
    const dataHora = new Date().toLocaleString('pt-BR');

    const itens = [];
    if(document.getElementById('item-rechauds').checked) itens.push("Rechauds montados e acesos");
    if(document.getElementById('item-buffet').checked) itens.push("Comidas dispostas e reposicionadas");
    if(document.getElementById('item-bebidas').checked) itens.push("Estação de bebidas e gelo ok");
    if(document.getElementById('item-placas').checked) itens.push("Placas de identificação nos pratos");

    const fotosArray = imagensBase64.map(imgObj => imgObj.data);

    const novoRegistro = {
      id: Date.now(),
      evento: evento,
      local: local,
      responsavel: responsavel,
      dataHora: dataHora,
      itens: itens,
      observacoes: observacoes,
      fotos: fotosArray
    };

    let historico = JSON.parse(localStorage.getItem('bourbon_checklists') || '[]');
    historico.unshift(novoRegistro);
    
    try {
      localStorage.setItem('bourbon_checklists', JSON.stringify(historico));
    } catch (e) {
      historico = historico.slice(0, 10);
      localStorage.setItem('bourbon_checklists', JSON.stringify(historico));
    }

    await gerarPDF(evento, local, responsavel, dataHora, itens, observacoes, fotosArray);

    alert("✅ Checklist registrado e PDF baixado!");

    document.getElementById('checklist-form').reset();
    document.getElementById('preview-container').innerHTML = '';
    imagensBase64 = [];

  } catch (error) {
    alert("Erro ao processar: " + error.message);
  } finally {
    btn.innerText = "✅ Finalizar, Salvar e Baixar PDF";
    btn.disabled = false;
  }
}

// Re-gerar PDF
async function rebaixarPDF(id) {
  const historico = JSON.parse(localStorage.getItem('bourbon_checklists') || '[]');
  const reg = historico.find(item => item.id === id);

  if (!reg) {
    alert("Registro não encontrado!");
    return;
  }

  await gerarPDF(reg.evento, reg.local, reg.responsavel, reg.dataHora, reg.itens || [], reg.observacoes || '', reg.fotos || []);
}

// Excluir registro
function excluirRegistro(id, event) {
  event.stopPropagation();
  if (confirm("Deseja excluir este registro do histórico?")) {
    let historico = JSON.parse(localStorage.getItem('bourbon_checklists') || '[]');
    historico = historico.filter(item => item.id !== id);
    localStorage.setItem('bourbon_checklists', JSON.stringify(historico));
    carregarHistorico();
  }
}

// Gerador de PDF
async function gerarPDF(evento, local, responsavel, dataHora, itens, observacoes, fotos) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(0, 70, 63);
  doc.rect(0, 0, 210, 28, 'F');

  const logoBase64 = await carregarLogoBase64('logo.png');
  let startXText = 14;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 12, 4, 20, 20);
      startXText = 36;
    } catch (e) {
      console.warn("Logo não renderizada:", e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text("BOURBON RESORT ATIBAIA", startXText, 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Comprovante de Vistoria e Montagem de Eventos", startXText, 19);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  let y = 38;
  doc.setFont('helvetica', 'bold');
  doc.text("Informacoes da Entrega:", 14, y);
  
  doc.setFont('helvetica', 'normal');
  y += 7; doc.text(`• Evento: ${evento}`, 14, y);
  y += 6; doc.text(`• Local no Resort: ${local}`, 14, y);
  y += 6; doc.text(`• Responsavel: ${responsavel}`, 14, y);
  y += 6; doc.text(`• Data/Hora: ${dataHora}`, 14, y);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text("Itens Conferidos:", 14, y);
  
  doc.setFont('helvetica', 'normal');
  if (itens.length === 0) {
    y += 6; doc.text("Nenhum item marcado.", 18, y);
  } else {
    itens.forEach(item => {
      y += 6; doc.text(` [X] ${item}`, 18, y);
    });
  }

  if (observacoes) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text("Observacoes Gerais:", 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    
    const obsTratado = observacoes.replace(/[^\x00-\x7F\xA0-\xFF]/g, '');
    const lines = doc.splitTextToSize(obsTratado, 180);
    doc.text(lines, 14, y);
    y += (lines.length * 5);
  }

  if (fotos && fotos.length > 0) {
    y += 10;
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.text("Registro Fotografico:", 14, y);
    y += 8;

    let x = 14;
    let imgWidth = 55;
    let imgHeight = 40;

    fotos.forEach((fotoBase64) => {
      if (x + imgWidth > 195) {
        x = 14;
        y += imgHeight + 8;
      }
      if (y + imgHeight > 260) {
        doc.addPage();
        y = 20;
        x = 14;
      }
      try {
        doc.addImage(fotoBase64, 'JPEG', x, y, imgWidth, imgHeight);
        x += imgWidth + 8;
      } catch (e) {
        console.error(e);
      }
    });
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Desenvolvido por Lincoln Sanches", 105, 290, { align: "center" });
  }

  doc.save(`Checklist_${evento.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// Carregar Histórico
function carregarHistorico() {
  const container = document.getElementById('lista-historico');
  const historico = JSON.parse(localStorage.getItem('bourbon_checklists') || '[]');

  if (historico.length === 0) {
    container.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">Nenhum checklist salvo localmente.</p>';
    return;
  }

  container.innerHTML = historico.map(reg => `
    <div class="hist-item" onclick="rebaixarPDF(${reg.id})">
      <div class="hist-content">
        <h3>${reg.evento}</h3>
        <p>📍 <strong>Local:</strong> ${reg.local}</p>
        <p>👤 <strong>Resp:</strong> ${reg.responsavel} | 🕒 ${reg.dataHora}</p>
        <p style="color: #059669; font-weight: 600; margin-top: 4px;">✔ ${reg.itens ? reg.itens.length : 0} itens | 📷 ${reg.fotos ? reg.fotos.length : 0} foto(s)</p>
      </div>
      <div class="hist-actions">
        <button class="btn-pdf-hist" title="Baixar PDF">📄 Baixar PDF</button>
        <button class="btn-del-hist" onclick="excluirRegistro(${reg.id}, event)" title="Excluir">🗑️</button>
      </div>
    </div>
  `).join('');
}