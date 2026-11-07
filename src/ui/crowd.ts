// O que a bancada grita. A bancada é sempre da equipa da casa: num jogo fora, é contra nós.
// Só letras da fonte do ecrã (maiúsculas, dígitos, acentos, % : - + . ! ? e espaço) e frases curtas, para caberem no balão.

export type CrowdMood =
  | 'three' | 'dunk' | 'close' | 'rivalBig' | 'miss' | 'foul' | 'timeout' | 'bigLead' | 'bigDeficit'
  | 'home' | 'away' | 'street' | 'run' | 'endWin' | 'endLoss' | 'sub';

/** O balão aguenta mais, mas acima disto deixa de parecer um grito. */
export const CROWD_MAX_LENGTH = 22;

export const CROWD_LINES: Record<CrowdMood, readonly string[]> = {
  three: [
    'QUE BOMBA!', 'DE ONDE VEIO ISSO?', 'TRÊS! TRÊS! TRÊS!', 'DO PARQUE DE CARROS!', 'NEM TOCOU NO ARO',
    'ISSO É MATEMÁTICA', 'VALE TRÊS. É JUSTO.', 'LÁ DE TRÁS!', 'MAIS TRÊS PARA A CONTA', 'A MINHA SOGRA VIU?',
    'CHUÁ!', 'FOI SEM OLHAR?', 'E O DEFESA A VER', 'MÃO DE RELOJOEIRO', 'EXPLIQUEM-ME ISTO',
    'DE LONGE E LIMPINHO', 'ATIRA QUE ENTRA', 'TRÊS. SEM PRESSA.', 'GUARDEM A FOTOGRAFIA', 'ISTO É CINEMA',
    'TREINOU ISTO EM CASA', 'NEM PENSOU DUAS VEZES', 'O ARO NEM SOUBE', 'OUTRA. SÓ PARA VER.',
  ],
  dunk: [
    '!!!', 'ESMAGOU!', 'O ARO ESTÁ BEM?', 'LÁ DE CIMA!', 'O CESTO PEDIU DESCULPA', 'AINDA ESTÁ A TREMER',
    'ALGUÉM VÁ VER O ARO', 'QUE VOO!', 'COM RAIVA!', 'ISSO NÃO SE FAZ', 'TRAGAM OUTRA TABELA', 'SUBIU DE ELEVADOR',
    'O CHÃO TREMEU', 'O DEFESA FOI JANTAR', 'AFUNDA! AFUNDA!', 'ATÉ DOEU A MIM', 'POR CIMA DE TODOS',
    'NEM PRECISAVA TANTO', 'ISTO NÃO É BALLET', 'O ARO VAI PROCESSAR', 'AGARRA-TE AO ARO!', 'BOA AVIAÇÃO',
  ],
  close: [
    'VAMOS!', 'NÃO AGUENTO ISTO', 'NINGUÉM RESPIRA', 'TAPEM-ME OS OLHOS', 'O MEU CORAÇÃO...',
    'SÓ MAIS UM!', 'AGORA É QUE É!', 'DEFESA! DEFESA!', 'QUE ALGUÉM DECIDA', 'NÃO OLHO. CONTEM-ME.',
    'TENHO TENSÃO ALTA', 'É HOJE OU NUNCA', 'ATÉ AO FIM!', 'SEGUREM ISSO!', 'NINGUÉM SE SENTA',
    'O RELÓGIO NÃO ANDA', 'PAREM O RELÓGIO!', 'JÁ NÃO TENHO UNHAS', 'É AGORA!', 'QUEM TEM CALMA?',
    'ISTO NÃO É SAUDÁVEL', 'MAIS UM MINUTO. SÓ.',
  ],
  rivalBig: [
    'OH NÃO...', 'SORTE.', 'FOI SEM QUERER', 'ISSO NÃO CONTA', 'MARQUEM AQUELE!', 'QUEM O DEIXOU SOZINHO?',
    'ACORDEM!', 'ESTAVA À VISTA', 'É SÓ UM CESTO', 'JÁ VIMOS PIOR', 'NINGUÉM DEFENDE?', 'PRONTO. ESTÁ BEM.',
    'NÃO BATAM PALMAS!', 'QUE ANTIPÁTICO', 'ESTAVA ESCRITO', 'DEIXA. NÃO REPETE.', 'BONITO. INFELIZMENTE.',
    'MÃOS NO AR! TARDE.', 'ISTO É UMA FASE', 'QUEM É AQUELE?',
  ],
  miss: [
    'NÃO ENTRA!', 'AR! AR! AR!', 'NEM TOCOU EM NADA', 'TABELA!', 'FICA PARA A PRÓXIMA', 'ERA DIFÍCIL. NÃO ERA.',
    'O ARO É NOSSO', 'CURTO!', 'COMPRA ÓCULOS', 'AQUI NÃO ENTRA', 'A BOLA TEM MEDO', 'TREINA EM CASA',
    'QUASE. NÃO.', 'TIRO AO BOMBO', 'NEM PERTO', 'FALHOU! QUE PENA. NÃO.', 'ISSO FOI PASSE?',
    'O CESTO MUDOU DE SÍTIO', 'TENTA DE OLHOS ABERTOS', 'FOI PARA A BANCADA?', 'COM CARINHO FALHA',
  ],
  foul: [
    'ÁRBITRO!', 'ISSO FOI LIMPO!', 'NEM LHE TOCOU!', 'COMPRA ÓCULOS!', 'OUTRA VEZ?', 'ESTÁ COMPRADO!',
    'APITO DE OURO', 'FOI NA BOLA!', 'ELE ATIROU-SE!', 'TEATRO!', 'DEEM-LHE UM ÓSCAR', 'ISSO É FALTA AQUI?',
    'QUANTO TE PAGARAM?', 'VAI VER O VÍDEO', 'É SEMPRE A NÓS', 'APITA AO CONTRÁRIO', 'O APITO ESTÁ AVARIADO',
    'MAS QUE FALTA?', 'TOCOU NO AR', 'ÁRBITRO: ESTÁS BEM?', 'ISSO É BASQUETEBOL!',
  ],
  timeout: [
    'ESTÃO COM MEDO', 'JÁ PEDEM TEMPO?', 'VÃO CHORAR AO BANCO', 'TOMEM ÁGUA!', 'ISSO NÃO VOS SALVA',
    'REZEM!', 'TEMPO PARA QUÊ?', 'DESENHA ONDE QUISERES', 'A TÁTICA NÃO DÁ', 'QUE NERVOS!', 'PARA PENSAR? TARDE.',
    'O TREINADOR SUA', 'DESCANSEM. MUITO.', 'VÃO AO INTERVALO?', 'PEÇAM OUTRO', 'SÓ ADIA', 'DESCONTO. CLARO.',
    'MANDEM VIR O ADJUNTO', 'É TUDO TEMPO', 'QUE PRESSA DE PARAR', 'AGORA JÁ PENSAM?',
  ],
  bigLead: [
    'OLÉ!', 'JÁ CHEGA? NÃO.', 'QUEREMOS MAIS!', 'ISTO ESTÁ FÁCIL', 'PODEM IR PARA CASA', 'TRAGAM OUTROS',
    'MOSTRA O MARCADOR!', 'É ISTO TODOS OS DIAS', 'QUE PASSEIO', 'NEM SUAMOS', 'OS DO BANCO TAMBÉM!',
    'CONTEM PELA MANHÃ', 'VAMOS AOS CEM!', 'JÁ NEM CONTO', 'ESTÁ RESOLVIDO', 'POUPEM AS PERNAS',
    'MAIS DEVAGAR. NÃO.', 'TIREM FOTOGRAFIAS', 'HOJE JANTO BEM', 'ISTO É PARA A HISTÓRIA', 'QUE MASSACRE',
  ],
  bigDeficit: [
    'VOU-ME EMBORA', 'ACORDEM!', 'QUE VERGONHA', 'PAGUEI BILHETE!', 'SÓ UM CESTO. UM.', 'QUEREMOS O DINHEIRO',
    'O AUTOCARRO SAI JÁ?', 'NÃO OLHES PARA MIM', 'É SÓ A PRIMEIRA PARTE?', 'NÃO VI NADA', 'ESTÁ TUDO BEM. NÃO.',
    'PELO MENOS ESTÁ SOL', 'TRAGAM O ADJUNTO', 'QUEM É QUE TREINA?', 'MUDA TUDO!', 'TENHAM DIGNIDADE',
    'QUE NOITE LONGA', 'AINDA DÁ? NÃO DÁ.', 'COMPREI CACHECOL', 'PARA O ANO É MELHOR', 'DEFENDAM. UMA VEZ.',
  ],
  home: [
    'HOJE É NOSSO!', 'ESTA CASA É NOSSA', 'BEM-VINDOS. PERDEM.', 'NINGUÉM GANHA AQUI', 'VAMOS EQUIPA!',
    'CANTEM TODOS!', 'É EM CASA! VAMOS!', 'TRAGO A VOZ TODA', 'VIM DE PROPÓSITO', 'AQUI MANDAMOS NÓS',
    'O PAVILHÃO É VOSSO', 'FALTEI AO JANTAR', 'SEMPRE CONVOSCO', 'NÃO NOS DESILUDAM', 'MAIS ALTO!',
    'ESTOU AQUI HÁ 30 ANOS', 'O MEU LUGAR DE SEMPRE', 'TROUXE O MIÚDO', 'É SÁBADO! VAMOS!', 'COM ALMA!',
  ],
  away: [
    'QUEM SÃO ESTES?', 'VIERAM DE AUTOCARRO?', 'VOLTEM PARA CASA', 'AQUI NÃO GANHAM', 'ESTÃO PERDIDOS?',
    'O MAPA ERA MAU?', 'TÊM SEGURO?', 'QUE CAMISOLA É ESSA?', 'NUNCA OUVI FALAR', 'BEM-VINDOS. ADEUS.',
    'É LONGE A VOSSA TERRA?', 'DEVOLVAM OS BILHETES', 'AQUI É OUTRA COISA', 'NÃO SÃO DAQUI!',
    'DIGAM ADEUS À MÃE', 'O CAMINHO É POR ALI', 'AQUI CHOVE SEMPRE', 'TRAGAM GUARDA-CHUVA', 'VÃO SOFRER',
    'QUEM VOS CONVIDOU?',
  ],
  street: [
    'ISTO É RUA!', 'CUIDADO COM O BURACO', 'A BOLA FOI À ESTRADA', 'QUEM TROUXE A BOLA?', 'É ATÉ ESCURECER',
    'O VIZINHO RECLAMA', 'SEM ÁRBITRO? MELHOR.', 'O ARO NÃO TEM REDE', 'NÃO PISEM A RELVA', 'A MINHA MÃE CHAMA',
    'JOGA QUEM CHEGA', 'É SÓ ATÉ AO JANTAR', 'O CARRO ESTÁ NO CAMPO', 'TRAZ O PÃO DEPOIS', 'AQUI NÃO HÁ BANCO',
    'O CHÃO É DE BETÃO', 'QUE CALOR NA RUA', 'O CÃO QUER JOGAR', 'NA RUA NINGUÉM PERDE', 'SEM FALTAS! RUA!',
  ],
  run: [
    'VAMOS!', 'NÃO PAREM!', 'OUTRO! OUTRO!', 'ISTO É UMA ONDA', 'AGORA SIM!', 'ESTÃO EMBALADOS', 'MAIS! MAIS!',
    'NINGUÉM NOS PARA', 'ESTÁ A AQUECER', 'ASSIM SIM!',
  ],
  endWin: [
    'QUE EQUIPA!', 'ISTO É QUE É!', 'CAMPEÕES! QUASE.', 'VALEU O BILHETE', 'ATÉ PARA A SEMANA!', 'QUE NOITE!',
    'VOU CONTAR A TODOS', 'BEM JOGADO!', 'ASSIM SIM!', 'OBRIGADO!',
  ],
  endLoss: [
    'PARA CASA...', 'PRONTO.', 'PARA A SEMANA É MELHOR', 'NÃO FALO NISSO', 'QUERO O DINHEIRO', 'VOU A PÉ',
    'FOI O ÁRBITRO', 'NEM VI O JOGO', 'AMANHÃ HÁ TRABALHO', 'NÃO HÁ PALAVRAS',
  ],
  sub: [
    'EU TAMBÉM O TIRAVA', 'FINALMENTE!', 'JÁ NÃO ERA SEM TEMPO', 'VAI DESCANSAR', 'ENTRA O BOM!',
    'QUEM É ESSE?', 'ESSE É MEU PRIMO', 'BOA TROCA', 'TROCA TUDO!', 'TIRA O OUTRO TAMBÉM',
  ],
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** A n-ésima frase de um contexto, num jogo com esta semente: passa por todas antes de repetir, e cada jogo começa noutra. */
export function crowdLine(mood: CrowdMood, seed: number, n: number): string {
  const lines = CROWD_LINES[mood];
  let hash = seed >>> 0;
  for (let i = 0; i < mood.length; i++) hash = (hash * 31 + mood.charCodeAt(i)) >>> 0;
  // Um passo primo com o tamanho da lista dá uma ordem baralhada que não repete.
  let stride = 7 + (hash % 5);
  while (gcd(stride, lines.length) !== 1) stride++;
  return lines[(hash + n * stride) % lines.length]!;
}
