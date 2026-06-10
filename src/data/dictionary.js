const BUILTIN_DICTIONARY = {
  // ─── CIÊNCIAS ───
  "fotossintese": {
    "term": "Fotossíntese",
    "definition": "Processo bioquímico realizado pelas plantas, algas e algumas bactérias para converter energia luminosa em energia química (glicose). Utiliza dióxido de carbono (CO₂) e água (H₂O) na presença de luz solar e clorofila, liberando oxigênio (O₂) como subproduto.",
    "category": "ciencias",
    "connections": ["celula", "ecossistema", "energia"]
  },
  "celula": {
    "term": "Célula",
    "definition": "Unidade básica estrutural e funcional de todos os organismos vivos. Pode ser procariótica (sem núcleo definido, como bactérias) ou eucariótica (com núcleo, como células animais e vegetais). Contém organelas que desempenham funções vitais.",
    "category": "ciencias",
    "connections": ["dna", "fotossintese", "evolucao"]
  },
  "dna": {
    "term": "DNA (Ácido Desoxirribonucleico)",
    "definition": "Molécula que carrega a informação genética de todos os seres vivos. Possui uma estrutura de dupla hélice composta por nucleotídeos (adenina, timina, citosina e guanina). É responsável pela hereditariedade e pela síntese de proteínas.",
    "category": "ciencias",
    "connections": ["celula", "evolucao", "genetica"]
  },
  "evolucao": {
    "term": "Evolução Biológica",
    "definition": "Processo de mudança nas características hereditárias de populações ao longo de gerações sucessivas. Mecanismos como seleção natural, mutação e deriva genética impulsionam a diversidade da vida na Terra. Teoria formulada por Charles Darwin.",
    "category": "ciencias",
    "connections": ["dna", "celula", "genetica"]
  },
  "atomo": {
    "term": "Átomo",
    "definition": "Menor unidade de matéria que mantém as propriedades de um elemento químico. É composto por prótons e nêutrons no núcleo, e elétrons orbitando ao redor. A combinação de átomos forma moléculas e toda a matéria conhecida.",
    "category": "ciencias",
    "connections": ["energia", "tabela periodica"]
  },
  "ecossistema": {
    "term": "Ecossistema",
    "definition": "Conjunto formado pela comunidade de seres vivos (biocenose) e o ambiente físico-químico onde vivem (biótopo), incluindo todas as interações entre eles. Exemplos: floresta tropical, recife de corais, cerrado.",
    "category": "ciencias",
    "connections": ["fotossintese", "energia"]
  },
  "genetica": {
    "term": "Genética",
    "definition": "Ramo da biologia que estuda os genes, a hereditariedade e a variação dos organismos. Analisa como as características são transmitidas dos pais para os filhos através do DNA. Fundada por Gregor Mendel com suas leis da hereditariedade.",
    "category": "ciencias",
    "connections": ["dna", "evolucao", "celula"]
  },

  // ─── HUMANAS ───
  "democracia": {
    "term": "Democracia",
    "definition": "Sistema político no qual o poder é exercido pelo povo, direta ou indiretamente por meio de representantes eleitos. Baseia-se em princípios como liberdade, igualdade, direitos fundamentais e separação dos poderes.",
    "category": "humanas",
    "connections": ["etica", "filosofia", "revolucao industrial"]
  },
  "globalizacao": {
    "term": "Globalização",
    "definition": "Processo de integração econômica, social, cultural e política entre diferentes países e regiões do mundo. Intensificada pela revolução tecnológica e dos transportes, conecta mercados, culturas e informações globalmente.",
    "category": "humanas",
    "connections": ["revolucao industrial", "democracia"]
  },
  "etica": {
    "term": "Ética",
    "definition": "Ramo da filosofia que estuda os princípios morais que orientam o comportamento humano em sociedade. Analisa conceitos como bem e mal, justiça, dever e virtude, buscando definir o que é moralmente correto.",
    "category": "humanas",
    "connections": ["filosofia", "democracia"]
  },
  "revolucao industrial": {
    "term": "Revolução Industrial",
    "definition": "Período de grandes transformações econômicas, tecnológicas e sociais iniciado na Inglaterra no século XVIII. Marcado pela transição da produção artesanal para a manufatura mecânica, com a invenção da máquina a vapor e o surgimento das fábricas.",
    "category": "humanas",
    "connections": ["globalizacao", "democracia"]
  },
  "filosofia": {
    "term": "Filosofia",
    "definition": "Disciplina que busca compreender a realidade, a existência, o conhecimento, a verdade, os valores morais e a razão humana por meio do pensamento crítico e da argumentação lógica. Originada na Grécia Antiga com pensadores como Sócrates, Platão e Aristóteles.",
    "category": "humanas",
    "connections": ["etica", "democracia"]
  },
  "sociologia": {
    "term": "Sociologia",
    "definition": "Ciência que estuda as relações sociais, as instituições e as estruturas da sociedade humana. Analisa fenômenos como desigualdade, cultura, poder e movimentos sociais. Fundada por Auguste Comte no século XIX.",
    "category": "humanas",
    "connections": ["filosofia", "globalizacao", "democracia"]
  },

  // ─── EXATAS ───
  "algoritmo": {
    "term": "Algoritmo",
    "definition": "Sequência finita e ordenada de passos lógicos que define uma solução para um problema ou a execução de uma tarefa. Base fundamental da computação e da programação, podendo ser representado em fluxogramas ou pseudocódigo.",
    "category": "exatas",
    "connections": ["probabilidade", "inteligencia artificial"]
  },
  "equacao": {
    "term": "Equação",
    "definition": "Sentença matemática que estabelece uma igualdade entre duas expressões algébricas, contendo uma ou mais incógnitas. Resolver uma equação significa encontrar os valores que tornam a igualdade verdadeira. Ex: 2x + 3 = 7.",
    "category": "exatas",
    "connections": ["derivada", "logaritmo"]
  },
  "probabilidade": {
    "term": "Probabilidade",
    "definition": "Ramo da matemática que estuda a chance de ocorrência de eventos aleatórios. Varia de 0 (impossível) a 1 (certo). Fundamental para estatística, inteligência artificial e análise de dados.",
    "category": "exatas",
    "connections": ["algoritmo", "equacao"]
  },
  "derivada": {
    "term": "Derivada",
    "definition": "Conceito do cálculo diferencial que mede a taxa de variação instantânea de uma função em relação a uma variável. Geometricamente, representa a inclinação da reta tangente ao gráfico da função em um ponto.",
    "category": "exatas",
    "connections": ["equacao", "logaritmo"]
  },
  "logaritmo": {
    "term": "Logaritmo",
    "definition": "Operação matemática inversa à exponenciação. O logaritmo de um número N na base b é o expoente ao qual a base b deve ser elevada para resultar em N. Exemplo: log₂(8) = 3, pois 2³ = 8.",
    "category": "exatas",
    "connections": ["equacao", "derivada"]
  },
  "tabela periodica": {
    "term": "Tabela Periódica",
    "definition": "Organização sistemática de todos os elementos químicos conhecidos, ordenados pelo número atômico crescente e agrupados por propriedades químicas semelhantes em períodos (linhas) e grupos (colunas). Criada por Dmitri Mendeleev.",
    "category": "exatas",
    "connections": ["atomo", "energia"]
  },

  // ─── LINGUAGENS ───
  "metafora": {
    "term": "Metáfora",
    "definition": "Figura de linguagem que consiste em empregar uma palavra ou expressão em sentido figurado, estabelecendo uma comparação implícita entre dois elementos de naturezas diferentes. Ex: 'A vida é um palco' (comparação sem 'como').",
    "category": "linguagens",
    "connections": ["figuras de linguagem", "verbo"]
  },
  "verbo": {
    "term": "Verbo",
    "definition": "Classe gramatical que expressa ação, estado, fenômeno da natureza ou mudança de estado. É conjugado em pessoa, número, tempo, modo e voz. É o elemento essencial do predicado nas orações.",
    "category": "linguagens",
    "connections": ["sujeito", "metafora"]
  },
  "sujeito": {
    "term": "Sujeito",
    "definition": "Termo da oração sobre o qual se declara algo. Pode ser simples, composto, oculto, indeterminado ou inexistente. Concorda em número e pessoa com o verbo da oração. É um dos termos essenciais da frase.",
    "category": "linguagens",
    "connections": ["verbo"]
  },
  "figuras de linguagem": {
    "term": "Figuras de Linguagem",
    "definition": "Recursos estilísticos usados para dar mais expressividade, emoção e beleza ao texto. Dividem-se em figuras de palavras (metáfora, metonímia), de pensamento (ironia, hipérbole), de sintaxe (elipse, anáfora) e de som (aliteração, onomatopeia).",
    "category": "linguagens",
    "connections": ["metafora"]
  },
  "genero textual": {
    "term": "Gênero Textual",
    "definition": "Formas relativamente estáveis de textos que circulam socialmente, cada uma com estrutura, conteúdo e estilo próprios. Exemplos: crônica, dissertação, carta, notícia, resenha, artigo de opinião, editorial.",
    "category": "linguagens",
    "connections": ["figuras de linguagem", "sujeito"]
  },

  // ─── TECNOLOGIA ───
  "inteligencia artificial": {
    "term": "Inteligência Artificial (IA)",
    "definition": "Área da ciência da computação que desenvolve sistemas capazes de realizar tarefas que normalmente exigem inteligência humana, como reconhecimento de padrões, tomada de decisões, processamento de linguagem natural e aprendizado de máquina.",
    "category": "tecnologia",
    "connections": ["algoritmo", "cloud computing", "banco de dados"]
  },
  "cloud computing": {
    "term": "Cloud Computing (Computação em Nuvem)",
    "definition": "Modelo que permite acesso sob demanda a recursos computacionais compartilhados (servidores, armazenamento, aplicativos) pela internet, sem necessidade de infraestrutura física local. Exemplos: Google Drive, AWS, Azure.",
    "category": "tecnologia",
    "connections": ["inteligencia artificial", "api", "banco de dados"]
  },
  "criptografia": {
    "term": "Criptografia",
    "definition": "Técnica de segurança da informação que transforma dados legíveis em código cifrado, tornando-os ilegíveis para quem não possui a chave de decodificação. Fundamental para proteção de senhas, transações bancárias e comunicações digitais.",
    "category": "tecnologia",
    "connections": ["api", "banco de dados"]
  },
  "api": {
    "term": "API (Interface de Programação de Aplicativos)",
    "definition": "Conjunto de regras e protocolos que permite que diferentes softwares se comuniquem entre si. Funciona como um 'garçom digital': recebe pedidos de um programa, leva ao sistema correto e retorna a resposta.",
    "category": "tecnologia",
    "connections": ["cloud computing", "inteligencia artificial", "banco de dados"]
  },
  "banco de dados": {
    "term": "Banco de Dados",
    "definition": "Sistema organizado para armazenar, gerenciar e recuperar informações de forma estruturada. Pode ser relacional (tabelas com SQL, ex: MySQL, PostgreSQL) ou não-relacional (NoSQL, ex: MongoDB). Essencial para aplicações web e empresariais.",
    "category": "tecnologia",
    "connections": ["api", "cloud computing", "inteligencia artificial"]
  },
  "energia": {
    "term": "Energia",
    "definition": "Grandeza física que representa a capacidade de um sistema realizar trabalho ou provocar transformações. Pode assumir diversas formas: cinética, potencial, térmica, elétrica, nuclear, luminosa. Segundo a lei da conservação, a energia não se cria nem se destrói, apenas se transforma.",
    "category": "ciencias",
    "connections": ["atomo", "fotossintese", "ecossistema"]
  }
};

export default BUILTIN_DICTIONARY;
