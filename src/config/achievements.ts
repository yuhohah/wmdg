import type { Achievement } from '../types.js';

export const initialAchievements: Achievement[] = [
  // --- Clicks Milestones ---
  {
    id: 'ach_click_1',
    name: 'Primeiro Contato',
    desc: 'Toque na Esfera Divina pela primeira vez.',
    lore: 'A Esfera vibra levemente sob seus dedos, reconhecendo a centelha do primeiro devoto.',
    icon: '',
    unlocked: false,
    buffText: '+10% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.10,
    check: (s) => s.clicks >= 1,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 1),
      target: 1,
      percent: Math.min(100, s.clicks * 100),
      label: `${s.clicks} / 1 clique`
    })
  },
  {
    id: 'ach_click_50',
    name: 'Canalizador Incansável',
    desc: 'Canalize a Esfera 50 vezes manualmente.',
    lore: 'O ritmo dos seus dedos sintoniza com a frequência divina do núcleo.',
    icon: '',
    unlocked: false,
    buffText: '+20% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.20,
    check: (s) => s.clicks >= 50,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 50),
      target: 50,
      percent: Math.min(100, (s.clicks / 50) * 100),
      label: `${s.clicks} / 50 cliques`
    })
  },
  {
    id: 'ach_click_250',
    name: 'Fervor Rítmico',
    desc: 'Canalize a Esfera 250 vezes manualmente.',
    lore: 'As pulsações se tornam uma segunda natureza; a devoção flui sem esforço.',
    icon: '',
    unlocked: false,
    buffText: '+35% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.35,
    check: (s) => s.clicks >= 250,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 250),
      target: 250,
      percent: Math.min(100, (s.clicks / 250) * 100),
      label: `${s.clicks} / 250 cliques`
    })
  },
  {
    id: 'ach_click_1000',
    name: 'Toque da Apoteose',
    desc: 'Canalize a Esfera 1.000 vezes manualmente.',
    lore: 'A própria matéria da realidade cede ao toque sagrado do Sumo Sacerdote.',
    icon: '',
    unlocked: false,
    buffText: '+50% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.50,
    check: (s) => s.clicks >= 1000,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 1000),
      target: 1000,
      percent: Math.min(100, (s.clicks / 1000) * 100),
      label: `${s.clicks} / 1.000 cliques`
    })
  },

  // --- Followers Milestones ---
  {
    id: 'ach_f_1',
    name: 'Primeiro Converso',
    desc: 'Recrute seu primeiro Fiel Devoto.',
    lore: 'Uma alma perdida encontra redenção sob o calor da chama sagrada.',
    icon: '',
    unlocked: false,
    buffText: '+5% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.05,
    check: (s) => s.followers >= 1,
    getProgress: (s) => ({
      current: Math.min(s.followers, 1),
      target: 1,
      percent: Math.min(100, s.followers * 100),
      label: `${s.followers} / 1 fiel`
    })
  },
  {
    id: 'ach_f_10',
    name: 'Pequena Congregação',
    desc: 'Reúna pelo menos 10 fiéis no culto.',
    lore: 'As vozes unidas em cântico formam uma harmonia mística inquebrável.',
    icon: '',
    unlocked: false,
    buffText: '+10% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.10,
    check: (s) => s.followers >= 10,
    getProgress: (s) => ({
      current: Math.min(s.followers, 10),
      target: 10,
      percent: Math.min(100, (s.followers / 10) * 100),
      label: `${s.followers} / 10 fiéis`
    })
  },
  {
    id: 'ach_f_25',
    name: 'Irmandade Oculta',
    desc: 'Reúna 25 fiéis dedicados.',
    lore: 'Os novos adeptos se sentem atraídos pelo fervor e o recrutamento se torna mais fácil.',
    icon: '',
    unlocked: false,
    buffText: '-5% no Custo de Novos Fiéis',
    buffType: 'cost_discount',
    buffVal: 0.05,
    check: (s) => s.followers >= 25,
    getProgress: (s) => ({
      current: Math.min(s.followers, 25),
      target: 25,
      percent: Math.min(100, (s.followers / 25) * 100),
      label: `${s.followers} / 25 fiéis`
    })
  },
  {
    id: 'ach_f_50',
    name: 'Círculo de Devoção',
    desc: 'Reúna 50 fiéis canalizando preces contínuas.',
    lore: 'O círculo sagrado agora ocupa todo o santuário com velas acesas.',
    icon: '',
    unlocked: false,
    buffText: '+20% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.20,
    check: (s) => s.followers >= 50,
    getProgress: (s) => ({
      current: Math.min(s.followers, 50),
      target: 50,
      percent: Math.min(100, (s.followers / 50) * 100),
      label: `${s.followers} / 50 fiéis`
    })
  },
  {
    id: 'ach_f_100',
    name: 'Legião Fanática',
    desc: 'Comande 100 fiéis fervorosos.',
    lore: 'Centenas de almas em uníssono fazem a terra tremer ao redor da Esfera.',
    icon: '',
    unlocked: false,
    buffText: '+30% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.30,
    check: (s) => s.followers >= 100,
    getProgress: (s) => ({
      current: Math.min(s.followers, 100),
      target: 100,
      percent: Math.min(100, (s.followers / 100) * 100),
      label: `${s.followers} / 100 fiéis`
    })
  },
  {
    id: 'ach_f_250',
    name: 'Massa Transcendente',
    desc: 'Atinja a marca de 250 fiéis devotos.',
    lore: 'Uma procissão interminável de fiéis marcha em direção à glória cósmica.',
    icon: '',
    unlocked: false,
    buffText: '+50% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.50,
    check: (s) => s.followers >= 250,
    getProgress: (s) => ({
      current: Math.min(s.followers, 250),
      target: 250,
      percent: Math.min(100, (s.followers / 250) * 100),
      label: `${s.followers} / 250 fiéis`
    })
  },

  // --- Total Faith Milestones ---
  {
    id: 'ach_faith_500',
    name: 'Centelha Mística',
    desc: 'Acumule um total de 500 pontos de fé.',
    lore: 'A primeira reserva real de energia divina se consolida no plano físico.',
    icon: '',
    unlocked: false,
    buffText: '+5% de Produção Global',
    buffType: 'global_mult',
    buffVal: 0.05,
    check: (s) => s.totalFaith >= 500,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 500),
      target: 500,
      percent: Math.min(100, (s.totalFaith / 500) * 100),
      label: `${Math.floor(s.totalFaith)} / 500 Fé`
    })
  },
  {
    id: 'ach_faith_5000',
    name: 'Correnteza da Fé',
    desc: 'Acumule 5.000 pontos de fé no total.',
    lore: 'A fé deixa de ser uma faísca e se torna um rio ininterrupto.',
    icon: '',
    unlocked: false,
    buffText: '+10% de Produção Global',
    buffType: 'global_mult',
    buffVal: 0.10,
    check: (s) => s.totalFaith >= 5000,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 5000),
      target: 5000,
      percent: Math.min(100, (s.totalFaith / 5000) * 100),
      label: `${Math.floor(s.totalFaith)} / 5.000 Fé`
    })
  },
  {
    id: 'ach_faith_50k',
    name: 'Oceano Cósmico',
    desc: 'Acumule 50.000 pontos de fé no total.',
    lore: 'Mares de devoção envolvem a Esfera com brilho dourado resplandecente.',
    icon: '',
    unlocked: false,
    buffText: '+15% de Produção Global',
    buffType: 'global_mult',
    buffVal: 0.15,
    check: (s) => s.totalFaith >= 50000,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 50000),
      target: 50000,
      percent: Math.min(100, (s.totalFaith / 50000) * 100),
      label: `${Math.floor(s.totalFaith)} / 50.000 Fé`
    })
  },
  {
    id: 'ach_faith_500k',
    name: 'Singularidade da Esfera',
    desc: 'Acumule 500.000 pontos de fé no total.',
    lore: 'O poder gerado começa a romper as barreiras entre as dimensões.',
    icon: '',
    unlocked: false,
    buffText: '+25% de Produção Global',
    buffType: 'global_mult',
    buffVal: 0.25,
    check: (s) => s.totalFaith >= 500000,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 500000),
      target: 500000,
      percent: Math.min(100, (s.totalFaith / 500000) * 100),
      label: `${Math.floor(s.totalFaith)} / 500k Fé`
    })
  },
  {
    id: 'ach_faith_5m',
    name: 'Apoteose Universal',
    desc: 'Acumule 5.000.000 pontos de fé no total.',
    lore: 'A Esfera Divina assume seu trono definitivo no cosmos.',
    icon: '',
    unlocked: false,
    buffText: '+50% de Produção Global',
    buffType: 'global_mult',
    buffVal: 0.50,
    check: (s) => s.totalFaith >= 5000000,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 5000000),
      target: 5000000,
      percent: Math.min(100, (s.totalFaith / 5000000) * 100),
      label: `${Math.floor(s.totalFaith)} / 5M Fé`
    })
  },

  // --- Monument Milestones ---
  {
    id: 'ach_mon_1',
    name: 'Primeira Relíquia',
    desc: 'Desperte seu primeiro Monumento cósmico.',
    lore: 'Uma estrutura ancestral de pedra negra e runas ganha vida após milênios dormente.',
    icon: '',
    unlocked: false,
    buffText: '+15% de Produção dos Monumentos',
    buffType: 'monument_mult',
    buffVal: 0.15,
    check: (s) => s.monuments >= 1,
    getProgress: (s) => ({
      current: Math.min(s.monuments, 1),
      target: 1,
      percent: Math.min(100, s.monuments * 100),
      label: `${s.monuments} / 1 monumento`
    })
  },
  {
    id: 'ach_mon_5',
    name: 'Panteão Cósmico',
    desc: 'Desperte 5 monumentos no total.',
    lore: 'A paisagem circundante pulsa com maravilhas arquitetônicas do cosmos.',
    icon: '',
    unlocked: false,
    buffText: '+30% de Produção dos Monumentos',
    buffType: 'monument_mult',
    buffVal: 0.30,
    check: (s) => s.monuments >= 5,
    getProgress: (s) => ({
      current: Math.min(s.monuments, 5),
      target: 5,
      percent: Math.min(100, (s.monuments / 5) * 100),
      label: `${s.monuments} / 5 monumentos`
    })
  },

  // --- Production Rate Milestones ---
  {
    id: 'ach_fps_100',
    name: 'Torrente Perpétua',
    desc: 'Alcance uma produção passiva de 100 Fé / seg.',
    lore: 'A energia flui ininterruptamente sem requerer esforço físico do líder.',
    icon: '',
    unlocked: false,
    buffText: '+15% de Produção Passiva',
    buffType: 'fps_mult',
    buffVal: 0.15,
    check: (s) => s.fps >= 100,
    getProgress: (s) => ({
      current: Math.min(s.fps, 100),
      target: 100,
      percent: Math.min(100, (s.fps / 100) * 100),
      label: `${Math.floor(s.fps)} / 100 FPS`
    })
  }
];
