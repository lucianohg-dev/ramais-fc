/* ==========================================================================
   1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
   ========================================================================== */
const SUPABASE_URL = 'https://qezbrxgmwjhsezaqowcj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xjcAgPhqKHoVvOZaXn_mEA_2bLG3Kl4';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SENHA_ADM_APP = 'APPADM'; 
const SENHA_ACESSO_SITE = 'FC2026';
let dadosRamais = [];
let timeoutBusca = null;

const playlistData = [
{ nome: "Louis armstrong", musica: "What a Wonderful World", estilo: "relax", url: "https://archive.org/download/louis-armstrong-what-a-wonderful-world-vinyl-single-1967/A-What%20A%20Wonderful%20World.mp3" },
    { nome: "The Cranberries", musica: "Linger", estilo: "balada pop", url: "https://ia800900.us.archive.org/32/items/the-cranberries-linger/The%20Cranberries%20-%20Linger.mp4" },
    { nome: "Tears For Fears", musica: "Woman In Chains", estilo: "balada pop", url: "https://dn711302.ca.archive.org/0/items/Tears_For_Fears_And_Oleta_Adams_Woman_In_Chains/Tears_For_Fears_And_Oleta_Adams_Woman_In_Chains.mp4" }, 
    { nome: "Legião Urbana", musica: "Quase sem querer", estilo: "rock nacional", url: "https://archive.org/download/1986-legiao-urbana-dois/02%20-%20Quase%20sem%20querer.mp3" }, 
    { nome: "Christopher Cross", musica: "Sailing", estilo: "relax", url: "https://archive.org/download/youtube-JNAgBRB7ouY/Christopher_Cross_-_Sailing_NAVEGANDO_SIN_RUMBO_.-JNAgBRB7ouY.mp4" },
    { nome: "Djavan", musica: "Oceano", estilo: "MPB", url: "https://archive.org/download/05.-oceano/05.%20Oceano.mp3" },
    { nome: "Djavan", musica: "Outono", estilo: "MPB", url: "https://archive.org/download/05.-oceano/06.%20Outono.mp3" },
    { nome: "Djavan", musica: "Meu Bem Querer", estilo: "MPB", url: "https://archive.org/download/14.-milagreiro-feat.-cassia-eller/08.%20Meu%20Bem%20Querer.mp3" },
    { nome: "Os Paralamas do Sucesso", musica: "Romance Ideal", estilo: "rock nacional", url: "https://archive.org/download/6-mensagem-de-amor/4%20-%20Romance%20Ideal.mp3" },
    { nome: "Marina Lima", musica: "Virgem", estilo: "MPB", url: "https://archive.org/download/04.-hearts_202504/06.%20Virgem.mp3" },
    { nome: "Marina Lima", musica: "Fullgás", estilo: "MPB", url: "https://archive.org/download/09.-veneno-veleno_202404/01.%20Fullg%C3%A1s.mp3" }
];
const gradeHorariosOnibus = [
    { h: "07:20", orig: "ESTAC." }, { h: "07:35", orig: "ESTAC." }, { h: "07:50", orig: "ESTAC." },
    { h: "08:05", orig: "ESTAC." }, { h: "08:20", orig: "ESTAC." }, { h: "08:35", orig: "ESTAC." },
    { h: "08:50", orig: "ESTAC." }, { h: "09:05", orig: "ESTAC." }, { h: "09:20", orig: "ESTAC." },
    { h: "09:35", orig: "ESTAC." }, { h: "09:50", orig: "ESTAC." }, { h: "10:05", orig: "ESTAC." },
    { h: "10:20", orig: "ESTAC." }, { h: "10:35", orig: "ESTAC." }, { h: "10:50", orig: "ESTAC." },
    { h: "11:05", orig: "ESTAC." }, { h: "11:20", orig: "ESTAC." }, { h: "11:35", orig: "ESTAC." },
    { h: "14:10", orig: "LOJA" }, { h: "14:30", orig: "LOJA" }, { h: "14:50", orig: "LOJA" },
    { h: "15:10", orig: "LOJA" }, { h: "15:30", orig: "LOJA" }, { h: "15:50", orig: "LOJA" },
    { h: "16:10", orig: "LOJA" }, { h: "16:30", orig: "LOJA" }, { h: "16:50", orig: "LOJA" },
    { h: "17:10", orig: "LOJA" }, { h: "17:30", orig: "LOJA" }, { h: "17:50", orig: "LOJA" },
    { h: "18:10", orig: "LOJA" }, { h: "18:30", orig: "LOJA" }, { h: "18:50", orig: "LOJA" },
    { h: "19:10", orig: "LOJA" }, { h: "19:30", orig: "LOJA" }, { h: "19:50", orig: "LOJA" }
];

/* ==========================================================================
   2. SEGURANÇA (BLOQUEIO DE ACESSO)
   ========================================================================== */
(function() {
    if (localStorage.getItem("fc_autorizado") !== "true") {
        const senha = prompt("Acesso Restrito Mascarenhas. Digite a senha:");
        if (senha === SENHA_ACESSO_SITE) {
            localStorage.setItem("fc_autorizado", "true");
        } else {
            document.body.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;">
                    <h1 style="color:#FF0000;">🚫 Acesso Negado</h1>
                    <button onclick="location.reload()">Tentar Novamente</button>
                </div>`;
            throw "Acesso negado";
        }
    }
})();

/* ==========================================================================
   3. INICIALIZAÇÃO DO SISTEMA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    mpRender();
    buscarClimaAPI(); // Busca inicial do clima
    verificarProximoOnibus();

    // Loop de 1 segundo para Relógio e Ônibus
    setInterval(() => {
        atualizarRelogioTela();
        verificarProximoOnibus();
    }, 1000);

    // Loop de 15 minutos para atualizar o clima (evita excesso de requests)
    setInterval(buscarClimaAPI, 900000);
});

/* ==========================================================================
   4. MÓDULO: ÔNIBUS TRANSLADO
   ========================================================================== */
function verificarProximoOnibus() {
    const agora = new Date();
    const hora = agora.getHours();
    const tempoAtualEmMinutos = (hora * 60) + agora.getMinutes();
    
    const divAlerta = document.getElementById('alerta-onibus');
    const textoAlerta = document.getElementById('texto-alerta');
    
    if (!divAlerta || !textoAlerta) return;

    // Implementação do Intervalo na Marquee
    const noIntervalo1 = (hora === 13); // 13:00 às 13:59
    const noIntervalo2 = (hora === 20); // 20:00 às 20:59

    if (noIntervalo1 || noIntervalo2) {
        const periodo = noIntervalo1 ? "13:00 às 14:00" : "20:00 às 21:00";
        textoAlerta.innerText = `⚠️ INTERVALO DOS MOTORISTAS: RETORNO DAS ATIVIDADES APÓS ÀS ${periodo.split(' às ')[1]} ⚠️`;
        divAlerta.style.display = 'flex';
        return; // Interrompe para não mostrar alerta de ônibus saindo
    }

    // Lógica Original de Próximo Ônibus
    let mostrarAlerta = false;
    let infoImediato = null;
    let infoFuturo = null;

    for (let i = 0; i < gradeHorariosOnibus.length; i++) {
        const [h, m] = gradeHorariosOnibus[i].h.split(':');
        const tempoHorarioEmMinutos = (parseInt(h) * 60) + parseInt(m);
        const diferenca = tempoHorarioEmMinutos - tempoAtualEmMinutos;

        if (diferenca > 0 && diferenca <= 5) {
            mostrarAlerta = true;
            infoImediato = gradeHorariosOnibus[i];
            infoFuturo = gradeHorariosOnibus[i + 1] || gradeHorariosOnibus[0];
            break; 
        }
    }

    if (mostrarAlerta) {
        const destino = infoImediato.orig === "ESTAC." ? "LOJA" : "ESTAC.";
        const novaMsg = `🚨 AGORA: ÔNIBUS SAINDO ÀS ${infoImediato.h} (SAÍDA ${infoImediato.orig} ➔ ${destino}) 🚨 FAVOR SE DIRIGIR AO PONTO DE EMBARQUE 🚨 PRÓXIMA SAÍDA ÀS ${infoFuturo.h} (${infoFuturo.orig}) 🚨`;
        
        if (textoAlerta.innerText !== novaMsg) {
            textoAlerta.innerText = novaMsg;
            divAlerta.style.display = 'flex';
        }
    } else {
        divAlerta.style.display = 'none';
    }
}

/* ==========================================================================
   5. MÓDULO: RAMAIS (API, TABELA E SENHA)
   ========================================================================== */
async function fetchData() {
    const cache = localStorage.getItem('cache_fc_ramais');
    if (cache) { dadosRamais = JSON.parse(cache); renderTable(); }

    try {
        const { data, error } = await _supabase.from('ramais').select('*').order('setor', { ascending: true });
        if (!error && data) {
            dadosRamais = data;
            localStorage.setItem('cache_fc_ramais', JSON.stringify(data));
            renderTable(document.getElementById('search')?.value || "");
        }
    } catch (e) { console.error("Erro Supabase:", e); }
}

function renderTable(filtro = "") {
    const corpo = document.getElementById('corpoTabela');
    if (!corpo) return;

    const termo = filtro.toLowerCase().trim();
    
    // 1. Filtragem eficiente
    const filtrados = dadosRamais.filter(i => {
        const nome = (i.nome || "").toLowerCase();
        const setor = (i.setor || "").toLowerCase();
        const ramal = (i.ramal || "").toString();
        return nome.includes(termo) || setor.includes(termo) || ramal.includes(termo);
    });

    // 2. Agrupamento por setor
    const grupos = filtrados.reduce((acc, item) => {
        const s = item.setor || "OUTROS";
        if (!acc[s]) acc[s] = [];
        acc[s].push(item);
        return acc;
    }, {});

    const setoresOrdenados = Object.keys(grupos).sort();

    // 3. Verificação de dados vazios
    if (setoresOrdenados.length === 0) {
        corpo.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 30px; color: #64748b;">Nenhum ramal encontrado.</td></tr>`;
        return;
    }

    // 4. Construção do HTML com o Badge Amarelo
    const htmlFinal = setoresOrdenados.map(setor => {
        const headerSetor = `
            <tr class="row-setor" style="background-color: #f8fafc;">
                <td colspan="2" style="color: #334155; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding: 12px 15px;">
                    📂 ${setor}
                </td>
            </tr>`;

        const itens = grupos[setor].map(p => `
            <tr class="item-row" style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 15px;">
                    <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${p.nome || 'Sem Nome'}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        ${p.contato ? '📱 ' + p.contato : '📍 ' + (p.setor || 'Geral')}
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 15px;">
                        <span onclick="editItem('${p.id}')" style="color: #2563eb; font-size: 11px; cursor: pointer; font-weight: 700; text-transform: uppercase;">Editar</span>
                        <span onclick="deleteItem('${p.id}')" style="color: #dc2626; font-size: 11px; cursor: pointer; font-weight: 700; text-transform: uppercase;">Excluir</span>
                    </div>
                </td>
                <td style="text-align: right; padding: 12px 15px; vertical-align: middle;">
                    <span style="background-color: #FFD400; color: #000; padding: 6px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; border: 1px solid #eab308; display: inline-block;">
                        📞 ${p.ramal}
                    </span>
                </td>
            </tr>
        `).join('');

        return headerSetor + itens;
    }).join('');

    corpo.innerHTML = htmlFinal;
}
async function saveData() {
    const id = document.getElementById('form-id').value;
    const payload = {
        nome: document.getElementById('form-nome').value,
        setor: document.getElementById('form-setor').value,
        ramal: document.getElementById('form-ramal').value,
       
    };
    if (!payload.nome || !payload.setor || !payload.ramal) return alert("Preencha os campos obrigatórios.");
    try {
        const { error } = id ? await _supabase.from('ramais').update(payload).eq('id', id) : await _supabase.from('ramais').insert([payload]);
        if (error) throw error;
        alert("Sucesso!");
        fetchData();
        switchView('consulta', true);
    } catch (err) { alert("Erro ao salvar."); }
}

function editItem(id) {
    const confirmacao = prompt("Digite a senha ADM para editar:");
    if (confirmacao !== SENHA_ADM_APP) return alert("Senha incorreta!");

    const item = dadosRamais.find(r => r.id == id);
    if (!item) return;
    document.getElementById('form-id').value = item.id;
    document.getElementById('form-nome').value = item.nome;
    document.getElementById('form-setor').value = item.setor;
    document.getElementById('form-ramal').value = item.ramal;
    document.getElementById('titulo-form').innerText = "📝 Editar Ramal";
    switchView('form', true);
}

function prepareAdd() {
    const confirmacao = prompt("🔒 Digite a senha administrativa para cadastrar:");
    if (confirmacao === null) return;

    if (confirmacao === SENHA_ADM_APP) {
        document.getElementById('form-id').value = '';
        document.querySelectorAll('.form-input').forEach(i => i.value = '');
        document.getElementById('titulo-form').innerText = "➕ Novo Ramal";
        switchView('form'); 
    } else {
        alert("🚫 Senha incorreta! Acesso negado.");
    }
}

async function deleteItem(id) {
    const confirmacao = prompt("Digite a senha ADM para excluir:");
    if (confirmacao !== SENHA_ADM_APP) return alert("Senha incorreta.");
    
    if (!confirm("Tem certeza que deseja excluir este ramal?")) return;
    try {
        const { error } = await _supabase.from('ramais').delete().eq('id', id);
        if (error) throw error;
        fetchData();
    } catch (err) { alert("Erro ao excluir."); }
}

function filtrar() {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => renderTable(document.getElementById('search').value), 150);
}

/* ==========================================================================
/* ========================================================================== 
   6. MÓDULO: MEDIA PLAYER
   ========================================================================== */
const audio = document.getElementById('mainAudioPlayer');
const btnPlay = document.getElementById('mp-play-pause');
const displayNome = document.getElementById('mp-now-playing');
const volSlider = document.getElementById('mp-volume'); // ID correto conforme seu CSS

// AJUSTE INICIAL: Volume em 40% (0.4 para o áudio, 40 para o slider)
if (audio) { 
    audio.volume = 0.4; 
}
if (volSlider) { 
    volSlider.value = 40; 
}

function mpRender(filtro = 'todos') {
    const lista = document.getElementById('mp-list');
    if(!lista) return;
    lista.innerHTML = "";
    
    // Filtro da Playlist
    const filtradas = filtro === 'todos' ? playlistData : playlistData.filter(m => m.estilo === filtro);
    
    filtradas.forEach(musica => {
        const div = document.createElement('div');
        div.className = "mp-song-item";
        div.innerHTML = `<span>🎵 ${musica.nome}</span> <small>${musica.estilo}</small>`;
        div.onclick = () => mpPlay(musica);
        lista.appendChild(div);
    });
}

function mpPlay(musica) {
    audio.src = musica.url;
    displayNome.innerText = "Tocando: " + musica.nome;
    audio.play();
    btnPlay.innerText = "⏸️";
}

function mpToggle() {
    if (audio.paused) { 
        audio.play(); 
        btnPlay.innerText = "⏸️"; 
    } else { 
        audio.pause(); 
        btnPlay.innerText = "▶️"; 
    }
}

function mpStop() {
    audio.pause(); 
    audio.currentTime = 0;
    btnPlay.innerText = "▶️";
    displayNome.innerText = "Parado";
}

// Função de Controle de volume (ligada ao evento oninput do seu HTML)
function mpVolume(val) {
    if (audio) {
        audio.volume = val / 100;
    }
}

function mpFilter(estilo) {
    // Remove classe active de todos os botões de aba
    document.querySelectorAll('.mp-tab-btn').forEach(b => b.classList.remove('active'));
    
    // Adiciona active ao botão clicado (quem chamou a função)
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    mpRender(estilo);
}
/* ==========================================================================
   7. INTERFACE, CLIMA (OPEN-METEO) E NAVEGAÇÃO
   ========================================================================== */

// Busca dados reais da API (Recife)
async function buscarClimaAPI() {
    try {
        // Coordenadas de Recife: lat -8.05, lon -34.88
        const url = `https://api.open-meteo.com/v1/forecast?latitude=-8.05&longitude=-34.88&current=temperature_2m,weather_code&timezone=America%2FRecife`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            
            // Definição das categorias baseada nos códigos WMO
            const codigosChuva = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
            const codigosNublado = [1, 2, 3];
            
            let statusTexto = "Céu Limpo";
            let temChuva = false;

            if (codigosChuva.includes(code)) {
                statusTexto = "Alerta de Chuva";
                temChuva = true;
            } else if (codigosNublado.includes(code)) {
                statusTexto = "Tempo Nublado";
                temChuva = false;
            }

            const climaInfo = {
                temp: temp,
                chuva: temChuva,
                msg: statusTexto,
                lastUpdate: new Date().toLocaleTimeString() // Para você conferir se atualizou
            };

            localStorage.setItem('weather_data_v2', JSON.stringify(climaInfo));
            
            if (typeof atualizarRelogioTela === 'function') {
                atualizarRelogioTela();
            }
        }
    } catch (e) {
        console.error("Erro ao buscar clima:", e);
    }
}

// Apenas atualiza o texto na tela (Relógio + Dados Salvos)
function atualizarRelogioTela() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const bar = document.getElementById('clima-container');
    if (!bar) return;

    const cache = localStorage.getItem('weather_data_v2');
    let dadosClima = { temp: "--", chuva: false, msg: "Carregando..." };

    if (cache) {
        dadosClima = JSON.parse(cache);
    }

    bar.innerHTML = `<span>${dadosClima.chuva ? "⚠️" : "☀️"} Recife: ${dadosClima.temp}°C | ${dadosClima.msg} | 🕒 ${horaFormatada}</span>`;
    bar.style.color = dadosClima.chuva ? "#ff4444" : "var(--fc-primary)";
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function switchView(view, skipMenu = false) {
    const targetView = document.getElementById('view-' + view);
    if (targetView) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        targetView.classList.add('active');
        if (!skipMenu) {
            const sidebar = document.getElementById('sidebar');
            if(sidebar.classList.contains('active')) toggleMenu();
        }
        const container = document.querySelector('.container');
        if (container) container.scrollTop = 0;
    }
}

function logout() {
    if(confirm("Sair do sistema?")) { localStorage.removeItem("fc_autorizado"); location.reload(); }
}

document.getElementById('form-contato')?.addEventListener('input', (e) => {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

/* ==========================================================================
   8. MÓDULO: MODAL DE ACIDENTE
   ========================================================================== */
function toggleModal(show) {
    const modal = document.getElementById('modalAcidente');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}