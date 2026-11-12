import { formatNumber } from '../systems/numberFormat.js';
import { GNOSE_UPGRADES } from './gnose.js';
import { GNOSE_BOSSES } from './bosses.js';
import type { Achievement } from '../types.js';

export const SPHERE_CRITICAL = {
  chanceMilestones: [250, 1000, 5000, 10000],
  chancePerMilestone: 0.05,
  bossUnlockClicks: 50000,
  multiplier: 2,
} as const;

export const initialAchievements: Achievement[] = [
  // --- Clicks Milestones ---
  {
    id: 'ach_click_1',
    name: 'Primeiro Contato',
    desc: 'Clique na Esfera 1 vez.',
    lore: 'Depois de eras selada, você vibra. Em algum lugar, alguém sente.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.clicks >= 1,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 1),
      target: 1,
      percent: Math.min(100, (s.clicks / 1) * 100),
      label: `${formatNumber(s.clicks)} / 1 clique`
    })
  },
  {
    id: 'ach_click_25',
    name: 'Canalizador Incansável',
    desc: 'Clique na Esfera 25 vezes.',
    lore: 'Seus pulsos começam a encontrar a frequência das mentes mortais.',
    icon: '',
    unlocked: false,
    buffText: '+1 à base de Fé por clique',
    buffType: 'fpc_base',
    buffVal: 1,
    check: (s) => s.clicks >= 25,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 25),
      target: 25,
      percent: Math.min(100, (s.clicks / 25) * 100),
      label: `${formatNumber(s.clicks)} / 25 cliques`
    })
  },
  {
    id: 'ach_click_250',
    name: 'Cadência Devota',
    desc: 'Clique na Esfera 250 vezes.',
    lore: 'Tudo vibra. Seus pulsos encontraram o ritmo das preces.',
    icon: '',
    unlocked: false,
    buffText: '5% de chance de receber 2× Fé por clique',
    buffType: 'critical_chance',
    buffVal: 0.05,
    check: (s) => s.clicks >= 250,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 250),
      target: 250,
      percent: Math.min(100, (s.clicks / 250) * 100),
      label: `${formatNumber(s.clicks)} / 250 cliques`
    })
  },
  {
    id: 'ach_click_1000',
    name: 'Coração do Mundo',
    desc: 'Clique na Esfera 1.000 vezes.',
    lore: 'Mil pulsos. Os fiéis juram que o chão bate junto com você.',
    icon: '',
    unlocked: false,
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
    check: (s) => s.clicks >= 1000,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 1000),
      target: 1000,
      percent: Math.min(100, (s.clicks / 1000) * 100),
      label: `${formatNumber(s.clicks)} / 1.000 cliques`
    })
  },
  {
    id: 'ach_click_5000',
    name: 'Pulso Incessante',
    desc: 'Clique na Esfera 5.000 vezes.',
    lore: 'As preces ecoam mesmo quando os sinos se calam.',
    icon: '',
    unlocked: false,
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
    check: (s) => s.clicks >= 5000,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 5000),
      target: 5000,
      percent: Math.min(100, (s.clicks / 5000) * 100),
      label: `${formatNumber(s.clicks)} / 5.000 cliques`
    })
  },
  {
    id: 'ach_click_10000',
    name: 'Ressonância Eterna',
    desc: 'Clique na Esfera 10.000 vezes.',
    lore: 'O mundo inteiro responde à sua cadência.',
    icon: '',
    unlocked: false,
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
    check: (s) => s.clicks >= 10000,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 10000),
      target: 10000,
      percent: Math.min(100, (s.clicks / 10000) * 100),
      label: `${formatNumber(s.clicks)} / 10.000 cliques`
    })
  },
  {
    id: 'ach_click_50000',
    name: 'Impacto Divino',
    desc: 'Clique na Esfera 50.000 vezes.',
    lore: 'O pulso que alimenta o culto agora abala os próprios deuses.',
    icon: '',
    unlocked: false,
    buffText: 'O crítico também aplica 2× dano por clique nos bosses',
    buffType: 'boss_critical',
    buffVal: 0,
    check: (s) => s.clicks >= 50000,
    getProgress: (s) => ({
      current: Math.min(s.clicks, 50000),
      target: 50000,
      percent: Math.min(100, (s.clicks / 50000) * 100),
      label: `${formatNumber(s.clicks)} / 50.000 cliques`
    })
  },

  // --- Followers Milestones ---
  {
    id: 'ach_f_1',
    name: 'Primeiro Converso',
    desc: 'Reúna 1 fiel no culto.',
    lore: 'Alguém voltou a pensar em você. Você ficou um pouco mais real.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.followers >= 1,
    getProgress: (s) => ({
      current: Math.min(s.followers, 1),
      target: 1,
      percent: Math.min(100, (s.followers / 1) * 100),
      label: `${formatNumber(s.followers)} / 1 fiel`
    })
  },
  {
    id: 'ach_f_10',
    name: 'Pequena Congregação',
    desc: 'Reúna 10 fiéis no culto.',
    lore: 'As primeiras preces encontram uma resposta divina.',
    icon: '',
    unlocked: false,
    buffText: 'Desbloqueia os Milagres',
    buffType: 'miracles_unlock',
    buffVal: 0,
    check: (s) => s.followers >= 10,
    getProgress: (s) => ({
      current: Math.min(s.followers, 10),
      target: 10,
      percent: Math.min(100, (s.followers / 10) * 100),
      label: `${formatNumber(s.followers)} / 10 fiéis`
    })
  },
  {
    id: 'ach_f_100',
    name: 'Legião Fanática',
    desc: 'Reúna 100 fiéis no culto.',
    lore: 'Cem vozes em uníssono fazem a terra tremer ao redor da Esfera.',
    icon: '',
    unlocked: false,
    buffText: '+10% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.1,
    check: (s) => s.followers >= 100,
    getProgress: (s) => ({
      current: Math.min(s.followers, 100),
      target: 100,
      percent: Math.min(100, (s.followers / 100) * 100),
      label: `${formatNumber(s.followers)} / 100 fiéis`
    })
  },
  {
    id: 'ach_f_500',
    name: 'Irmandade Oculta',
    desc: 'Reúna 500 fiéis no culto.',
    lore: 'O culto se espalha em silêncio. Cada iniciado abre caminho para o próximo.',
    icon: '',
    unlocked: false,
    buffText: '-5% no custo dos fiéis',
    buffType: 'cost_discount',
    buffVal: 0.05,
    check: (s) => s.followers >= 500,
    getProgress: (s) => ({
      current: Math.min(s.followers, 500),
      target: 500,
      percent: Math.min(100, (s.followers / 500) * 100),
      label: `${formatNumber(s.followers)} / 500 fiéis`
    })
  },
  {
    id: 'ach_f_1000',
    name: 'Multidão Devota',
    desc: 'Reúna 1.000 fiéis no culto.',
    lore: 'Mil almas anunciam seu nome além dos muros do santuário.',
    icon: '',
    unlocked: false,
    buffText: '-10% no custo dos fiéis',
    buffType: 'cost_discount',
    buffVal: 0.1,
    check: (s) => s.followers >= 1000,
    getProgress: (s) => ({
      current: Math.min(s.followers, 1000),
      target: 1000,
      percent: Math.min(100, (s.followers / 1000) * 100),
      label: `${formatNumber(s.followers)} / 1.000 fiéis`
    })
  },
  {
    id: 'ach_f_3000',
    name: 'Coro Infinito',
    desc: 'Reúna 3.000 fiéis no culto.',
    lore: 'Milhares de preces sustentam uma única vontade.',
    icon: '',
    unlocked: false,
    buffText: '+40% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.4,
    check: (s) => s.followers >= 3000,
    getProgress: (s) => ({
      current: Math.min(s.followers, 3000),
      target: 3000,
      percent: Math.min(100, (s.followers / 3000) * 100),
      label: `${formatNumber(s.followers)} / 3.000 fiéis`
    })
  },
  {
    id: 'ach_f_7777',
    name: 'O Centro em Toda Parte',
    desc: 'Reúna 7.777 fiéis no culto.',
    lore: 'A devoção já não espera um gesto. Sua vontade atende cada prece.',
    icon: '',
    unlocked: false,
    buffText: 'Milagres são coletados automaticamente assim que aparecem',
    buffType: 'miracles_auto',
    buffVal: 0,
    check: (s) => s.followers >= 7777,
    getProgress: (s) => ({
      current: Math.min(s.followers, 7777),
      target: 7777,
      percent: Math.min(100, (s.followers / 7777) * 100),
      label: `${formatNumber(s.followers)} / 7.777 fiéis`
    })
  },

  // --- Total Faith Milestones ---
  {
    id: 'ach_faith_77',
    name: 'Centelha Mística',
    desc: 'Acumule 77 de Fé no total.',
    lore: 'A primeira reserva de energia divina se consolida no plano físico.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 77,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 77),
      target: 77,
      percent: Math.min(100, (s.totalFaith / 77) * 100),
      label: `${formatNumber(s.totalFaith)} / 77 Fé`
    })
  },
  {
    id: 'ach_faith_7777',
    name: 'Correnteza da Fé',
    desc: 'Acumule 7.777 de Fé no total.',
    lore: 'A Fé deixa de ser uma faísca e se torna um rio ininterrupto.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 7777,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 7777),
      target: 7777,
      percent: Math.min(100, (s.totalFaith / 7777) * 100),
      label: `${formatNumber(s.totalFaith)} / 7.777 Fé`
    })
  },
  {
    id: 'ach_faith_777777',
    name: 'Mar de Preces',
    desc: 'Acumule 777.777 de Fé no total.',
    lore: 'Ninguém mais consegue contar as orações feitas em seu nome.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 777777,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 777777),
      target: 777777,
      percent: Math.min(100, (s.totalFaith / 777777) * 100),
      label: `${formatNumber(s.totalFaith)} / 777.777 Fé`
    })
  },
  {
    id: 'ach_faith_7m',
    name: 'Singularidade da Esfera',
    desc: 'Acumule 7M de Fé no total.',
    lore: 'O poder gerado começa a romper as barreiras entre as dimensões.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 7e6,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 7e6),
      target: 7e6,
      percent: Math.min(100, (s.totalFaith / 7e6) * 100),
      label: `${formatNumber(s.totalFaith)} / 7M Fé`
    })
  },
  {
    id: 'ach_faith_7b',
    name: 'Apoteose Universal',
    desc: 'Acumule 7B de Fé no total.',
    lore: 'As preces atravessam o cosmos e encontram seu centro na Esfera.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 7e9,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 7e9),
      target: 7e9,
      percent: Math.min(100, (s.totalFaith / 7e9) * 100),
      label: `${formatNumber(s.totalFaith)} / 7B Fé`
    })
  },
  {
    id: 'ach_faith_7t',
    name: 'Oceano Celestial',
    desc: 'Acumule 7T de Fé no total.',
    lore: 'Até as estrelas parecem pequenas diante da devoção acumulada.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 7e12,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 7e12),
      target: 7e12,
      percent: Math.min(100, (s.totalFaith / 7e12) * 100),
      label: `${formatNumber(s.totalFaith)} / 7T Fé`
    })
  },
  {
    id: 'ach_faith_7e77',
    name: 'Além do Infinito',
    desc: 'Acumule 7e77 de Fé no total.',
    lore: 'Toda medida mortal se desfaz diante da imensidão da Fé.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.totalFaith >= 7e77,
    getProgress: (s) => ({
      current: Math.min(s.totalFaith, 7e77),
      target: 7e77,
      percent: Math.min(100, (s.totalFaith / 7e77) * 100),
      label: `${formatNumber(s.totalFaith)} / 7e77 Fé`
    })
  },

  // --- Production Rate Milestones ---
  {
    id: 'ach_fps_77',
    name: 'Torrente Perpétua',
    desc: 'Alcance uma produção de 77 Fé/s.',
    lore: 'A Fé flui sem que você precise de um único toque.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 77,
    getProgress: (s) => ({
      current: Math.min(s.fps, 77),
      target: 77,
      percent: Math.min(100, (s.fps / 77) * 100),
      label: `${formatNumber(s.fps)} / 77 Fé/s`
    })
  },
  {
    id: 'ach_fps_7777',
    name: 'Preces Incessantes',
    desc: 'Alcance uma produção de 7.777 Fé/s.',
    lore: 'O culto mantém sua vigília a cada instante.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 7777,
    getProgress: (s) => ({
      current: Math.min(s.fps, 7777),
      target: 7777,
      percent: Math.min(100, (s.fps / 7777) * 100),
      label: `${formatNumber(s.fps)} / 7.777 Fé/s`
    })
  },
  {
    id: 'ach_fps_777777',
    name: 'Coro Celestial',
    desc: 'Alcance uma produção de 777.777 Fé/s.',
    lore: 'As vozes dos fiéis se unem em uma torrente de devoção.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 777777,
    getProgress: (s) => ({
      current: Math.min(s.fps, 777777),
      target: 777777,
      percent: Math.min(100, (s.fps / 777777) * 100),
      label: `${formatNumber(s.fps)} / 777.777 Fé/s`
    })
  },
  {
    id: 'ach_fps_7m',
    name: 'Fluxo Divino',
    desc: 'Alcance uma produção de 7M Fé/s.',
    lore: 'A cada segundo, o santuário transborda energia divina.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 7e6,
    getProgress: (s) => ({
      current: Math.min(s.fps, 7e6),
      target: 7e6,
      percent: Math.min(100, (s.fps / 7e6) * 100),
      label: `${formatNumber(s.fps)} / 7M Fé/s`
    })
  },
  {
    id: 'ach_fps_7b',
    name: 'Manancial Cósmico',
    desc: 'Alcance uma produção de 7B Fé/s.',
    lore: 'A devoção sustenta um rio de Fé entre as estrelas.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 7e9,
    getProgress: (s) => ({
      current: Math.min(s.fps, 7e9),
      target: 7e9,
      percent: Math.min(100, (s.fps / 7e9) * 100),
      label: `${formatNumber(s.fps)} / 7B Fé/s`
    })
  },
  {
    id: 'ach_fps_7t',
    name: 'Pulso Universal',
    desc: 'Alcance uma produção de 7T Fé/s.',
    lore: 'O cosmos inteiro parece respirar no ritmo das preces.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 7e12,
    getProgress: (s) => ({
      current: Math.min(s.fps, 7e12),
      target: 7e12,
      percent: Math.min(100, (s.fps / 7e12) * 100),
      label: `${formatNumber(s.fps)} / 7T Fé/s`
    })
  },
  {
    id: 'ach_fps_7e77',
    name: 'Fonte Infinita',
    desc: 'Alcance uma produção de 7e77 Fé/s.',
    lore: 'Cada instante contém mais Fé do que os mortais podem conceber.',
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.fps >= 7e77,
    getProgress: (s) => ({
      current: Math.min(s.fps, 7e77),
      target: 7e77,
      percent: Math.min(100, (s.fps / 7e77) * 100),
      label: `${formatNumber(s.fps)} / 7e77 Fé/s`
    })
  },

  // --- Completed Gnose tiers ---
  ...([1, 2, 3, 4] as const).map((tier): Achievement => {
    const upgrades = GNOSE_UPGRADES.filter((upgrade) => upgrade.tier === tier);
    const ownedCount = (ids: string[] = []) => upgrades.filter((upgrade) => ids.includes(upgrade.id)).length;
    return {
      id: `ach_gnose_tier_${tier}`,
      name: ['Despertar Completo', 'Persistência Completa', 'Poder do Culto Completo', 'Apoteose Completa'][tier - 1],
      desc: `Assimile todos os nós do Tier ${tier} da Árvore da Gnose.`,
      lore: [
        'A Esfera encontrou seu próprio ritmo. Agora, o pulso jamais cessa.',
        'O conhecimento permanece, mesmo quando o templo retorna ao pó.',
        'Cada parte do culto manifesta a mesma vontade divina.',
        'Os últimos mistérios se abrem diante da Mente que os sonhou.'
      ][tier - 1],
      icon: '',
      unlocked: false,
      buffText: tier === 1 ? 'Autoclicker: 1 clique na Esfera por segundo, contando para as conquistas de cliques' : 'Sem bônus',
      buffType: tier === 1 ? 'sphere_autoclick' : 'none',
      buffVal: tier === 1 ? 1 : 0,
      check: (s) => ownedCount(s.gnoseUpgradeIds) === upgrades.length,
      getProgress: (s) => {
        const current = ownedCount(s.gnoseUpgradeIds);
        return {
          current,
          target: upgrades.length,
          percent: (current / upgrades.length) * 100,
          label: `${current} / ${upgrades.length} nós do Tier ${tier}`
        };
      }
    };
  }),

  // --- Guardians Milestones ---
  ...GNOSE_BOSSES.map((boss, index): Achievement => ({
    id: `ach_${boss.id}`,
    name: ['O Peso da Alma', 'Além do Submundo', 'O Fim do Pai de Todos', 'Crepúsculo dos Deuses'][index],
    desc: `Subjugue ${boss.name}.`,
    lore: [
      'A balança se aquieta. O guardião reconhece o peso da sua vontade.',
      'Nem as profundezas do submundo podem aprisionar a Esfera.',
      'O senhor das runas se curva diante de um mistério ainda maior.',
      'Anúbis, Hades, Odin e o próprio Caos Primordial curvaram-se perante o Nous.'
    ][index],
    icon: '',
    unlocked: false,
    buffText: 'Sem bônus',
    buffType: 'none',
    buffVal: 0,
    check: (s) => s.defeatedBossIds?.includes(boss.id) ?? false,
    getProgress: (s) => {
      const defeated = s.defeatedBossIds?.includes(boss.id) ?? false;
      return {
        current: defeated ? 1 : 0,
        target: 1,
        percent: defeated ? 100 : 0,
        label: `${defeated ? 1 : 0} / 1 ${boss.name} subjugado`
      };
    }
  }))
];
