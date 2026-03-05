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
    { nome: "Som de Chuva", estilo: "relax", url: "URL_DO_SUPABASE_1" },
    { nome: "Ambiente Loja", estilo: "foco", url: "URL_DO_SUPABASE_2" },
    { nome: "Alerta Geral", estilo: "todos", url: "URL_DO_SUPABASE_3" }
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
    const tempoAtualEmMinutos = (agora.getHours() * 60) + agora.getMinutes();
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

    const divAlerta = document.getElementById('alerta-onibus');
    const textoAlerta = document.getElementById('texto-alerta');

    if (divAlerta && textoAlerta) {
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
    const grupos = {};

    const filtrados = dadosRamais.filter(i => 
        (i.nome || "").toLowerCase().includes(termo) || 
        (i.setor || "").toLowerCase().includes(termo) || 
        (i.ramal || "").toString().includes(termo)
    );

    filtrados.forEach(item => {
        const s = item.setor || "OUTROS";
        if (!grupos[s]) grupos[s] = [];
        grupos[s].push(item);
    });

    let htmlFinal = "";
    for (let setor in grupos) {
        htmlFinal += `<tr class="row-setor"><td colspan="2">${setor}</td></tr>`;
        grupos[setor].forEach(p => {
            htmlFinal += `
            <tr class="item-row">
                <td>
                    <div style="font-weight:700; color:#1e293b;">${p.nome}</div>
                    <div style="font-size:11px; color:#64748b;">📍 ${p.setor} ${p.contato ? '| 📱 '+p.contato : ''}</div>
                    <div style="margin-top:8px">
                        <span onclick="editItem('${p.id}')" style="color:var(--fc-primary); font-size:10px; cursor:pointer; font-weight:bold; text-decoration:underline;">EDITAR</span>
                        <span onclick="deleteItem('${p.id}')" style="color:var(--fc-accent); font-size:10px; cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">EXCLUIR</span>
                    </div>
                </td>
                <td style="text-align:right"><span class="ramal-badge">📞 ${p.ramal}</span></td>
            </tr>`;
        });
    }
    corpo.innerHTML = htmlFinal || "<tr><td colspan='2' style='text-align:center;'>Nenhum resultado.</td></tr>";
}

async function saveData() {
    const id = document.getElementById('form-id').value;
    const payload = {
        nome: document.getElementById('form-nome').value,
        setor: document.getElementById('form-setor').value,
        ramal: document.getElementById('form-ramal').value,
        contato: document.getElementById('form-contato').value
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
    document.getElementById('form-contato').value = item.contato || '';
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
   6. MÓDULO: MEDIA PLAYER
   ========================================================================== */
const audio = document.getElementById('mainAudioPlayer');
const btnPlay = document.getElementById('mp-play-pause');
const displayNome = document.getElementById('mp-now-playing');

function mpRender(filtro = 'todos') {
    const lista = document.getElementById('mp-list');
    if(!lista) return;
    lista.innerHTML = "";
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
    if (audio.paused) { audio.play(); btnPlay.innerText = "⏸️"; } 
    else { audio.pause(); btnPlay.innerText = "▶️"; }
}

function mpStop() {
    audio.pause(); audio.currentTime = 0;
    btnPlay.innerText = "▶️";
    displayNome.innerText = "Parado";
}

function mpFilter(estilo) {
    document.querySelectorAll('.mp-tab-btn').forEach(b => b.classList.remove('active'));
    mpRender(estilo);
}

/* ==========================================================================
   7. INTERFACE, CLIMA (OPEN-METEO) E NAVEGAÇÃO
   ========================================================================== */

// Busca dados reais da API (Recife)
async function buscarClimaAPI() {
    try {
        // Coordenadas de Recife: lat -8.05, lon -34.88
        const url = `https://api.open-meteo.com/v1/forecast?latitude=-8.05&longitude=-34.88&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code&timezone=America%2FRecife`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            
            // Códigos Open-Meteo: 51, 53, 55, 61, 63, 65, 80, 81, 82 são chuva
            const isChuva = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
            
            const climaInfo = {
                temp: temp,
                chuva: isChuva,
                msg: isChuva ? "Alerta de Chuva" : "Céu Limpo"
            };

            localStorage.setItem('weather_data_v2', JSON.stringify(climaInfo));
            atualizarRelogioTela(); // Atualiza a barra imediatamente
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