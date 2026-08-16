// 1. REGRAS — cálculos de modificadores, vida e energia
const RANKS = ["E", "D", "C", "B", "A"];

const MODIFICADOR = { E: -2, D: -1, C: 0, B: 1, A: 2 };

// Cada parcela negativa da vida para de piorar aqui. 
const PISO_PARCELA = -5;

// A ordem define a posição de cada atributo na roda, a partir do topo.
const ATRIBUTOS = [
    { chave: "forca",        nome: "Força" },
    { chave: "destreza",     nome: "Destreza" },
    { chave: "constituicao", nome: "Constituição" },
    { chave: "inteligencia", nome: "Inteligência" },
    { chave: "instinto",     nome: "Instinto" },
    { chave: "habilidade",   nome: "Habilidade" }
];

const Regras = {
    modificador(rank) {
        return MODIFICADOR[rank];
    },

    travar(parcela) {
        return Math.max(parcela, PISO_PARCELA);
    },

    total(ranks) {
        return ATRIBUTOS.reduce((soma, a) => soma + this.modificador(ranks[a.chave]), 0);
    },

    // Parcelas da vida já travadas, separadas para a interface poder exibir a conta.
    parcelasDeVida(ranks) {
        return {
        base: 20,
        constituicao: this.travar(this.modificador(ranks.constituicao) * 5),
        forca:        this.travar(this.modificador(ranks.forca) * 3),
        destreza:     this.travar(this.modificador(ranks.destreza) * 1)
        };
    },

    vida(ranks) {
        const p = this.parcelasDeVida(ranks);
        return p.base + p.constituicao + p.forca + p.destreza;
    },

    energia(ranks) {
        return 25 - this.total(ranks) * 5;
    },

    // Menor e maior total possíveis, para a legenda.
    faixaDeTotal() {
        return { minimo: MODIFICADOR.E * ATRIBUTOS.length, maximo: MODIFICADOR.A * ATRIBUTOS.length };
    }
};


// 2. FICHA — os ranks de cada atributo, que mudam com o slider
const Ficha = {
    ranks: Object.fromEntries(ATRIBUTOS.map(a => [a.chave, "C"])),

    definir(chave, rank) {
        this.ranks[chave] = rank;
    },

    equilibrar() {
        ATRIBUTOS.forEach(a => this.definir(a.chave, "C"));
    },

    sortear() {
        ATRIBUTOS.forEach(a => this.definir(a.chave, RANKS[Math.floor(Math.random() * RANKS.length)]));
    }
};

// 3. PALETA — cores do SVG, lidas do CSS

const Paleta = (() => {
    const css = getComputedStyle(document.documentElement);
    const ler = (nome, alternativa) => css.getPropertyValue(nome).trim() || alternativa;

    return {
        fundo:      ler("--bg",        "#222222"),
        aro:        ler("--ring",      "#17181A"),
        placa:      ler("--plate",     "#6E7074"),
        mostrador:  ler("--face",      "#101112"),
        casco:      ler("--shell",     "#D9DCD9"),
        verde:      ler("--specimen",  "#64CC4F"),
        verdeClaro: ler("--specimen2", "#B2E05B"),
        verdeEsc:   ler("--specimen3", "#328336"),
        osso:       ler("--bone",      "#EDE6DA"),
        grade:      ler("--line",      "#3B3B3B")
    };
})();


// 4. RODA — o SVG da roda de atributos
const Roda = {
    // medidas, todas em raio a partir do centro
    medidas: {
        centro: 240,
        hexBase: 26,   // raio do rank E
        hexPasso: 24,  // quanto cada rank acrescenta
        mostrador: 142,
        placa: 168,
        letra: 154,
        aroInterno: 172,
        aroExterno: 214,
        nome: 193
    },

    svg: null,
    defs: null,
    poligono: null,
    letras: {},

    // helpers de geometria
    anguloDe(indice) {
        return (-90 + 60 * indice) * Math.PI / 180;
    },

    ponto(indice, raio) {
        const a = this.anguloDe(indice);
        const c = this.medidas.centro;
        return [c + Math.cos(a) * raio, c + Math.sin(a) * raio];
    },

    raioDoRank(rank) {
        return this.medidas.hexBase + RANKS.indexOf(rank) * this.medidas.hexPasso;
    },

    hexagono(raio) {
        return ATRIBUTOS
        .map((_, i) => this.ponto(i, raio).map(n => n.toFixed(1)).join(","))
        .join(" ");
    },

    // helpers de SVG
    criarNo(tag, atributos = {}) {
        const no = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const chave in atributos) no.setAttribute(chave, atributos[chave]);
        return no;
    },

    adicionar(tag, atributos) {
        return this.svg.appendChild(this.criarNo(tag, atributos));
    },

    // montagem
    criar(svg) {
        this.svg = svg;
        this.defs = this.adicionar("defs");

        this.desenharCasco();
        this.desenharMoldura();
        this.desenharAmpulheta();
        this.desenharNomes();
        this.desenharGrade();
        this.desenharEscala();
        this.desenharPoligono();
        this.desenharLetrasDeRank();
    },

    desenharCasco() {
        const c = this.medidas.centro;
        [45, 135, 225, 315].forEach(grau => {
        this.adicionar("rect", {
            x: -26, y: -236, width: 52, height: 44, rx: 16,
            fill: Paleta.casco, stroke: Paleta.aro, "stroke-width": 6,
            transform: `translate(${c},${c}) rotate(${grau})`
        });
        });
    },

    desenharMoldura() {
        const c = this.medidas.centro;
        const { aroInterno, aroExterno, placa, mostrador } = this.medidas;

        this.adicionar("circle", { cx: c, cy: c, r: aroExterno, fill: Paleta.aro });
        this.adicionar("circle", { cx: c, cy: c, r: aroExterno - 3, fill: "none",
        stroke: Paleta.verdeEsc, "stroke-width": 1.5, "stroke-opacity": .55 });
        this.adicionar("circle", { cx: c, cy: c, r: placa, fill: Paleta.placa });
        this.adicionar("circle", { cx: c, cy: c, r: placa, fill: "none",
        stroke: Paleta.aro, "stroke-width": 5 });
        this.adicionar("circle", { cx: c, cy: c, r: mostrador, fill: Paleta.mostrador,
        stroke: Paleta.aro, "stroke-width": 6 });

        // 48 traços no aro; os que caem sobre um eixo ficam mais vivos
        for (let i = 0; i < 48; i++) {
        const a = (i * 7.5 - 90) * Math.PI / 180;
        const noEixo = i % 8 === 0;
        const inicio = noEixo ? aroInterno : aroExterno - 12;
        const fim = aroExterno - 4;
        //   this.adicionar("line", {
        //     x1: c + Math.cos(a) * inicio, y1: c + Math.sin(a) * inicio,
        //     x2: c + Math.cos(a) * fim,    y2: c + Math.sin(a) * fim,
        //     stroke: noEixo ? Paleta.verde : Paleta.verdeEsc,
        //     "stroke-width": noEixo ? 2 : 5,
        //     "stroke-opacity": noEixo ? .9 : .4
        //   });
        }

        // botões verdes, encaixados entre um eixo e o seguinte
        for (let i = 0; i < ATRIBUTOS.length; i++) {
        const a = (-60 + 60 * i) * Math.PI / 180;
        const x = c + Math.cos(a) * this.medidas.letra;
        const y = c + Math.sin(a) * this.medidas.letra;
        this.adicionar("circle", { cx: x, cy: y, r: 9, fill: Paleta.verde,
            stroke: Paleta.aro, "stroke-width": 3 });
        this.adicionar("circle", { cx: x, cy: y, r: 3.5, fill: Paleta.verdeClaro,
            "fill-opacity": .85 });
        }
    },

    desenharAmpulheta() {
        const c = this.medidas.centro;
        this.adicionar("path", {
        d: "M -76 -98 L 76 -98 Q 14 0 76 98 L -76 98 Q -14 0 -76 -98 Z",
        transform: `translate(${c},${c})`,
        fill: Paleta.verde, "fill-opacity": .10
        });
    },

    desenharNomes() {
        const c = this.medidas.centro;

        ATRIBUTOS.forEach((atributo, i) => {
        const grau = -90 + 60 * i;
        const metadeDeBaixo = Math.sin(grau * Math.PI / 180) > 0.1;
        const raio = metadeDeBaixo ? this.medidas.nome - 8 : this.medidas.nome;

        const a1 = (grau - 30) * Math.PI / 180;
        const a2 = (grau + 30) * Math.PI / 180;
        const p1 = [c + Math.cos(a1) * raio, c + Math.sin(a1) * raio];
        const p2 = [c + Math.cos(a2) * raio, c + Math.sin(a2) * raio];

        // na metade de baixo o arco corre ao contrário, senão o texto sai de cabeça pra baixo
        const traco = metadeDeBaixo
            ? `M ${p2[0]} ${p2[1]} A ${raio} ${raio} 0 0 0 ${p1[0]} ${p1[1]}`
            : `M ${p1[0]} ${p1[1]} A ${raio} ${raio} 0 0 1 ${p2[0]} ${p2[1]}`;

        const id = `arco-${atributo.chave}`;
        this.defs.appendChild(this.criarNo("path", { id, d: traco, fill: "none" }));

        const texto = this.criarNo("text", {
            "font-family": "'Big Shoulders Display', 'Arial Narrow', sans-serif",
            "font-size": 18, "font-weight": 700, "letter-spacing": 2.5,
            fill: Paleta.osso, "text-anchor": "middle", "dominant-baseline": "middle"
        });
        const naCurva = this.criarNo("textPath", { href: `#${id}`, startOffset: "50%" });
        naCurva.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${id}`);
        naCurva.textContent = atributo.nome.toUpperCase();
        texto.appendChild(naCurva);
        this.svg.appendChild(texto);
        });
    },

    desenharGrade() {
        const c = this.medidas.centro;

        RANKS.forEach((rank, i) => {
        const externo = i === RANKS.length - 1;
        this.adicionar("polygon", {
            points: this.hexagono(this.raioDoRank(rank)),
            fill: "none",
            stroke: externo ? Paleta.verdeEsc : Paleta.grade,
            "stroke-width": externo ? 1.4 : .8,
            "stroke-opacity": externo ? .9 : .5
        });
        });

        ATRIBUTOS.forEach((_, i) => {
        const [x, y] = this.ponto(i, this.raioDoRank("A"));
        this.adicionar("line", { x1: c, y1: c, x2: x, y2: y,
            stroke: Paleta.grade, "stroke-width": .8, "stroke-opacity": .5 });
        });
    },

    desenharEscala(){
        const c = this.medidas.centro;
        RANKS.forEach(rank => {
        this.adicionar("text", {
            x: c - 9, y: c - this.raioDoRank(rank) + 4,
            "font-family": "'IBM Plex Mono', monospace", "font-size": 10,
            fill: Paleta.osso, "fill-opacity": .45, "text-anchor": "end"
        }).textContent = rank;
        });
    },

  desenharPoligono(){
    this.poligono = this.adicionar("polygon", {
      points: this.hexagono(this.raioDoRank("C")),
      fill: Paleta.verde, "fill-opacity": .72,
      stroke: Paleta.verdeClaro, "stroke-width": 2.5, "stroke-linejoin": "round"
    });

    const c = this.medidas.centro;
    this.adicionar("circle", { cx: c, cy: c, r: 8, fill: Paleta.mostrador,
      stroke: Paleta.verdeClaro, "stroke-width": 2 });
  },

    desenharLetrasDeRank(){
        ATRIBUTOS.forEach((atributo, i) => {
        const [x, y] = this.ponto(i, this.medidas.letra);
        this.adicionar("circle", { cx: x, cy: y, r: 15, fill: Paleta.aro });

        const letra = this.adicionar("text", {
            x, y: y + 9,
            "font-family": "'Big Shoulders Display', 'Arial Narrow', sans-serif",
            "font-size": 26, "font-weight": 900,
            fill: Paleta.verdeClaro, "text-anchor": "middle"
        });
        this.letras[atributo.chave] = letra;
        });
    },

    // o que muda a cada mexida no slider
    atualizar(ranks){
        this.poligono.setAttribute("points", ATRIBUTOS
        .map((a, i) => this.ponto(i, this.raioDoRank(ranks[a.chave])).map(n => n.toFixed(1)).join(","))
        .join(" "));

        ATRIBUTOS.forEach(a => {
        this.letras[a.chave].textContent = ranks[a.chave];
        });
    },

    pintar(cor){
        this.poligono.setAttribute("fill", cor);
    },

  // clone para virar imagem.
    clonarPara({ titulo, comFundo }) {
        const clone = this.svg.cloneNode(true);
        clone.setAttribute("width", 960);
        clone.setAttribute("height", 960);
        // if(titulo){
        //   const texto = this.criarNo("text", {
        //     x: this.medidas.centro, y: 466, "text-anchor": "middle",
        //     "font-family": "'Big Shoulders Display', 'Arial Narrow', sans-serif",
        //     "font-size": 24, "font-weight": 900,
        //     fill: Paleta.verdeClaro, "letter-spacing": 3
        //   });
        //   texto.textContent = titulo.toUpperCase();
        //   clone.appendChild(texto);
        // }
        return clone;
    }
};


// 5. PAINEL — interface de sliders e resumo
const Painel = {
    sliders: {},
    letras: {},
    chips: {},

    criar(container, aoMudar) {
        ATRIBUTOS.forEach(atributo => {
        const linha = document.createElement("div");
        linha.className = "attr";
        linha.innerHTML = `
            <label for="slider-${atributo.chave}">${atributo.nome}</label>
            <div class="slot">
            <div class="notches"><i></i><i></i><i></i><i></i><i></i></div>
            <input type="range" id="slider-${atributo.chave}"
                    min="0" max="${RANKS.length - 1}" step="1" value="${RANKS.indexOf("C")}">
            </div>
            <div class="rank"></div>
            <div class="mod"></div>`;

        const slider = linha.querySelector("input");
        slider.addEventListener("input", () => aoMudar(atributo.chave, RANKS[+slider.value]));

        this.sliders[atributo.chave] = slider;
        this.letras[atributo.chave] = linha.querySelector(".rank");
        this.chips[atributo.chave] = linha.querySelector(".mod");

        container.appendChild(linha);
        });
    },

    atualizar(ranks) {
        this.atualizarAtributos(ranks);
        this.atualizarResumo(ranks);
    },

    atualizarAtributos(ranks) {
        ATRIBUTOS.forEach(a => {
        const rank = ranks[a.chave];
        const mod = Regras.modificador(rank);

        this.sliders[a.chave].value = RANKS.indexOf(rank);
        this.letras[a.chave].textContent = rank;
        this.chips[a.chave].textContent = this.comSinal(mod);
        this.chips[a.chave].className = "mod" + (mod > 0 ? " pos" : mod < 0 ? " neg" : "");
        });
    },

    atualizarResumo(ranks) {
        const total = Regras.total(ranks);
        const parcelas = Regras.parcelasDeVida(ranks);
        const faixa = Regras.faixaDeTotal();
        const travou = parcelas.constituicao === PISO_PARCELA || parcelas.forca === PISO_PARCELA;

        this.escrever("v-total", this.comSinal(total));
        this.escrever("v-hp", Regras.vida(ranks));
        this.escrever("v-en", Regras.energia(ranks));

        this.escreverHTML("c-total",
        `soma dos seis modificadores<br>faixa possível: <b>${this.comSinal(faixa.minimo)}</b> a <b>${this.comSinal(faixa.maximo)}</b>`);

        this.escreverHTML("c-hp",
        `${parcelas.base} ${this.operacao(parcelas.constituicao)} <b>con</b> ` +
        `${this.operacao(parcelas.forca)} <b>for</b> ` +
        `${this.operacao(parcelas.destreza)} <b>des</b>` +
        (travou ? `<br>parcela travada em ${PISO_PARCELA}` : ""));

        this.escreverHTML("c-en", `25 ${this.operacao(-total * 5)} (total × 5)`);
    },
    // -3 vira "− 3", para ler como conta
    operacao(valor) {
        return `${valor < 0 ? "−" : "+"} ${Math.abs(valor)}`;
    },
    // -3 vira "−3" e 3 vira "+3", para ler como número
    comSinal(valor) {
        return `${valor < 0 ? "−" : valor > 0 ? "+" : ""}${Math.abs(valor)}`;
    },
    escrever(id, texto) {
        document.getElementById(id).textContent = texto;
    },
    escreverHTML(id, html) {
        document.getElementById(id).innerHTML = html;
    }
};


// 6. LIGAçÃO
function atualizarTudo() {
    Roda.atualizar(Ficha.ranks);
    Painel.atualizar(Ficha.ranks);
}

function baixarImagem() {
    const nome = document.getElementById("nome").value.trim();
    const clone = Roda.clonarPara({
        titulo: nome,
    });

    const svg = new XMLSerializer().serializeToString(clone);
    const imagem = new Image();

    imagem.onload = () => {
        const tela = document.createElement("canvas");
        tela.width = tela.height = 960;
        tela.getContext("2d").drawImage(imagem, 0, 0, 960, 960);

        const link = document.createElement("a");
        link.download = `${(nome || "alien").toLowerCase().replace(/\s+/g, "-")}-atributos.png`;
        link.href = tela.toDataURL("image/png");
        link.click();
    };

    imagem.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function iniciar() {
    Roda.criar(document.getElementById("wheel"));

    Painel.criar(document.getElementById("attrs"), (chave, rank) => {
        Ficha.definir(chave, rank);
        atualizarTudo();
    });

    document.getElementById("btn-rand").onclick = () => { Ficha.sortear();     atualizarTudo(); };
    document.getElementById("btn-reset").onclick = () => { Ficha.equilibrar(); atualizarTudo(); };
    document.getElementById("btn-png").onclick = baixarImagem;
    document.getElementById("cor").oninput = e => Roda.pintar(e.target.value);

    atualizarTudo();
}

iniciar();