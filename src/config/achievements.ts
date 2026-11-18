import { formatNumber } from '../systems/numberFormat.js';
import { GNOSE_UPGRADES } from './gnose.js';
import { BOSS_CURSE_MAX_STACKS, GNOSE_BOSSES } from './bosses.js';
import type { Achievement, BuffType, GameState } from '../types.js';

export const SPHERE_CRITICAL = {
  chanceMilestones: [250, 1000, 5000, 10000],
  chancePerMilestone: 0.05,
  bossUnlockClicks: 50000,
  multiplier: 2,
} as const;

type NumericAchievementMetric = 'clicks' | 'followers' | 'totalFaith' | 'fps';

interface ThresholdAchievementSpec {
  id: string;
  name: string;
  desc: string;
  lore: string;
  metric: NumericAchievementMetric;
  target: number;
  targetLabel: string;
  buffText?: string;
  buffType?: BuffType;
  buffVal?: number;
}

function createThresholdAchievement(spec: ThresholdAchievementSpec): Achievement {
  const {
    id,
    name,
    desc,
    lore,
    metric,
    target,
    targetLabel,
    buffText = 'Sem bônus',
    buffType = 'none',
    buffVal = 0,
  } = spec;
  return {
    id,
    name,
    desc,
    lore,
    icon: '',
    unlocked: false,
    buffText,
    buffType,
    buffVal,
    check: (s: GameState) => s[metric] >= target,
    getProgress: (s: GameState) => {
      const value = s[metric];
      return {
        current: Math.min(value, target),
        target,
        percent: Math.min(100, (value / target) * 100),
        label: `${formatNumber(value)} / ${targetLabel}`,
      };
    },
  };
}

export const initialAchievements: Achievement[] = [
  // --- Clicks Milestones ---
  createThresholdAchievement({
    id: 'ach_click_1',
    name: 'Primeiro Contato',
    desc: 'Clique na Esfera 1 vez.',
    lore: 'Depois de eras selada, você vibra. Em algum lugar, alguém sente.',
    metric: 'clicks',
    target: 1,
    targetLabel: '1 clique',
    buffText: '+5% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_click_25',
    name: 'Canalizador Incansável',
    desc: 'Clique na Esfera 25 vezes.',
    lore: 'Seus pulsos começam a encontrar a frequência das mentes mortais.',
    metric: 'clicks',
    target: 25,
    targetLabel: '25 cliques',
    buffText: '+1 à base de Fé por clique',
    buffType: 'fpc_base',
    buffVal: 1,
  }),
  createThresholdAchievement({
    id: 'ach_click_250',
    name: 'Cadência Devota',
    desc: 'Clique na Esfera 250 vezes.',
    lore: 'Tudo vibra. Seus pulsos encontraram o ritmo das preces.',
    metric: 'clicks',
    target: 250,
    targetLabel: '250 cliques',
    buffText: '5% de chance de receber 2× Fé por clique',
    buffType: 'critical_chance',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_click_1000',
    name: 'Coração do Mundo',
    desc: 'Clique na Esfera 1.000 vezes.',
    lore: 'Mil pulsos. Os fiéis juram que o chão bate junto com você.',
    metric: 'clicks',
    target: 1000,
    targetLabel: '1.000 cliques',
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_click_5000',
    name: 'Pulso Incessante',
    desc: 'Clique na Esfera 5.000 vezes.',
    lore: 'As preces ecoam mesmo quando os sinos se calam.',
    metric: 'clicks',
    target: 5000,
    targetLabel: '5.000 cliques',
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_click_10000',
    name: 'Ressonância Eterna',
    desc: 'Clique na Esfera 10.000 vezes.',
    lore: 'O mundo inteiro responde à sua cadência.',
    metric: 'clicks',
    target: 10000,
    targetLabel: '10.000 cliques',
    buffText: '+5% de chance de crítico de Fé',
    buffType: 'critical_chance',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_click_50000',
    name: 'Impacto Divino',
    desc: 'Clique na Esfera 50.000 vezes.',
    lore: 'O pulso que alimenta o culto agora abala os próprios deuses.',
    metric: 'clicks',
    target: 50000,
    targetLabel: '50.000 cliques',
    buffText: 'O crítico também aplica 2× dano por clique nos bosses',
    buffType: 'boss_critical',
    buffVal: 0,
  }),

  // --- Followers Milestones ---
  createThresholdAchievement({
    id: 'ach_f_1',
    name: 'Primeiro Converso',
    desc: 'Reúna 1 fiel no culto.',
    lore: 'Alguém voltou a pensar em você. Você ficou um pouco mais real.',
    metric: 'followers',
    target: 1,
    targetLabel: '1 fiel',
    buffText: '+2% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.02,
  }),
  createThresholdAchievement({
    id: 'ach_f_10',
    name: 'Pequena Congregação',
    desc: 'Reúna 10 fiéis no culto.',
    lore: 'As primeiras preces encontram uma resposta divina.',
    metric: 'followers',
    target: 10,
    targetLabel: '10 fiéis',
    buffText: 'Desbloqueia os Milagres',
    buffType: 'miracles_unlock',
    buffVal: 0,
  }),
  createThresholdAchievement({
    id: 'ach_f_100',
    name: 'Legião Fanática',
    desc: 'Reúna 100 fiéis no culto.',
    lore: 'Cem vozes em uníssono fazem a terra tremer ao redor da Esfera.',
    metric: 'followers',
    target: 100,
    targetLabel: '100 fiéis',
    buffText: '+8% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.08,
  }),
  createThresholdAchievement({
    id: 'ach_f_500',
    name: 'Irmandade Oculta',
    desc: 'Reúna 500 fiéis no culto.',
    lore: 'O culto se espalha em silêncio. Cada iniciado abre caminho para o próximo.',
    metric: 'followers',
    target: 500,
    targetLabel: '500 fiéis',
    buffText: '-5% no custo dos fiéis',
    buffType: 'cost_discount',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_f_1000',
    name: 'Multidão Devota',
    desc: 'Reúna 1.000 fiéis no culto.',
    lore: 'Mil almas anunciam seu nome além dos muros do santuário.',
    metric: 'followers',
    target: 1000,
    targetLabel: '1.000 fiéis',
    buffText: '-10% no custo dos fiéis',
    buffType: 'cost_discount',
    buffVal: 0.1,
  }),
  createThresholdAchievement({
    id: 'ach_f_3000',
    name: 'Coro Infinito',
    desc: 'Reúna 3.000 fiéis no culto.',
    lore: 'Milhares de preces sustentam uma única vontade.',
    metric: 'followers',
    target: 3000,
    targetLabel: '3.000 fiéis',
    buffText: '+20% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.2,
  }),
  createThresholdAchievement({
    id: 'ach_f_7777',
    name: 'O Centro em Toda Parte',
    desc: 'Reúna 7.777 fiéis no culto.',
    lore: 'A devoção já não espera um gesto. Sua vontade atende cada prece.',
    metric: 'followers',
    target: 7777,
    targetLabel: '7.777 fiéis',
    buffText: 'Milagres fora de combate são coletados automaticamente assim que aparecem',
    buffType: 'miracles_auto',
    buffVal: 0,
  }),

  // --- Total Faith Milestones ---
  createThresholdAchievement({
    id: 'ach_faith_77',
    name: 'Centelha Mística',
    desc: 'Acumule 77 de Fé no total.',
    lore: 'A primeira reserva de energia divina se consolida no plano físico.',
    metric: 'totalFaith',
    target: 77,
    targetLabel: '77 Fé',
    buffText: '+3% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.03,
  }),
  createThresholdAchievement({
    id: 'ach_faith_7777',
    name: 'Correnteza da Fé',
    desc: 'Acumule 7.777 de Fé no total.',
    lore: 'A Fé deixa de ser uma faísca e se torna um rio ininterrupto.',
    metric: 'totalFaith',
    target: 7777,
    targetLabel: '7.777 Fé',
    buffText: '+4% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.04,
  }),
  createThresholdAchievement({
    id: 'ach_faith_777777',
    name: 'Mar de Preces',
    desc: 'Acumule 777.777 de Fé no total.',
    lore: 'Ninguém mais consegue contar as orações feitas em seu nome.',
    metric: 'totalFaith',
    target: 777777,
    targetLabel: '777.777 Fé',
    buffText: '+5% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_faith_7m',
    name: 'Singularidade da Esfera',
    desc: 'Acumule 7M de Fé no total.',
    lore: 'O poder gerado começa a romper as barreiras entre as dimensões.',
    metric: 'totalFaith',
    target: 7e6,
    targetLabel: '7M Fé',
    buffText: '+6% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.06,
  }),
  createThresholdAchievement({
    id: 'ach_faith_7b',
    name: 'Apoteose Universal',
    desc: 'Acumule 7B de Fé no total.',
    lore: 'As preces atravessam o cosmos e encontram seu centro na Esfera.',
    metric: 'totalFaith',
    target: 7e9,
    targetLabel: '7B Fé',
    buffText: '+7% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.07,
  }),
  createThresholdAchievement({
    id: 'ach_faith_7t',
    name: 'Oceano Celestial',
    desc: 'Acumule 7T de Fé no total.',
    lore: 'Até as estrelas parecem pequenas diante da devoção acumulada.',
    metric: 'totalFaith',
    target: 7e12,
    targetLabel: '7T Fé',
    buffText: '+10% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.1,
  }),
  createThresholdAchievement({
    id: 'ach_faith_7e77',
    name: 'Além do Infinito',
    desc: 'Acumule 7e77 de Fé no total.',
    lore: 'Toda medida mortal se desfaz diante da imensidão da Fé.',
    metric: 'totalFaith',
    target: 7e77,
    targetLabel: '7e77 Fé',
    buffText: '+15% de Fé por clique',
    buffType: 'fpc_mult',
    buffVal: 0.15,
  }),

  // --- Production Rate Milestones ---
  createThresholdAchievement({
    id: 'ach_fps_77',
    name: 'Torrente Perpétua',
    desc: 'Alcance uma produção de 77 Fé/s.',
    lore: 'A Fé flui sem que você precise de um único toque.',
    metric: 'fps',
    target: 77,
    targetLabel: '77 Fé/s',
    buffText: '+2% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.02,
  }),
  createThresholdAchievement({
    id: 'ach_fps_7777',
    name: 'Preces Incessantes',
    desc: 'Alcance uma produção de 7.777 Fé/s.',
    lore: 'O culto mantém sua vigília a cada instante.',
    metric: 'fps',
    target: 7777,
    targetLabel: '7.777 Fé/s',
    buffText: '+3% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.03,
  }),
  createThresholdAchievement({
    id: 'ach_fps_777777',
    name: 'Coro Celestial',
    desc: 'Alcance uma produção de 777.777 Fé/s.',
    lore: 'As vozes dos fiéis se unem em uma torrente de devoção.',
    metric: 'fps',
    target: 777777,
    targetLabel: '777.777 Fé/s',
    buffText: '+4% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.04,
  }),
  createThresholdAchievement({
    id: 'ach_fps_7m',
    name: 'Fluxo Divino',
    desc: 'Alcance uma produção de 7M Fé/s.',
    lore: 'A cada segundo, o santuário transborda energia divina.',
    metric: 'fps',
    target: 7e6,
    targetLabel: '7M Fé/s',
    buffText: '+5% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.05,
  }),
  createThresholdAchievement({
    id: 'ach_fps_7b',
    name: 'Manancial Cósmico',
    desc: 'Alcance uma produção de 7B Fé/s.',
    lore: 'A devoção sustenta um rio de Fé entre as estrelas.',
    metric: 'fps',
    target: 7e9,
    targetLabel: '7B Fé/s',
    buffText: '+6% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.06,
  }),
  createThresholdAchievement({
    id: 'ach_fps_7t',
    name: 'Pulso Universal',
    desc: 'Alcance uma produção de 7T Fé/s.',
    lore: 'O cosmos inteiro parece respirar no ritmo das preces.',
    metric: 'fps',
    target: 7e12,
    targetLabel: '7T Fé/s',
    buffText: '+8% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.08,
  }),
  createThresholdAchievement({
    id: 'ach_fps_7e77',
    name: 'Fonte Infinita',
    desc: 'Alcance uma produção de 7e77 Fé/s.',
    lore: 'Cada instante contém mais Fé do que os mortais podem conceber.',
    metric: 'fps',
    target: 7e77,
    targetLabel: '7e77 Fé/s',
    buffText: '+12% de Fé dos fiéis',
    buffType: 'fps_mult',
    buffVal: 0.12,
  }),

  // --- Completed Gnose tiers ---
  ...([1, 2, 3, 4] as const).map((tier): Achievement => {
    const upgrades = GNOSE_UPGRADES.filter((upgrade) => upgrade.tier === tier);
    const ownedCount = (ids: string[] = []) => {
      if (ids.length === 0) return 0;
      let count = 0;
      for (let i = 0; i < upgrades.length; i++) {
        if (ids.includes(upgrades[i].id)) count++;
      }
      return count;
    };
    const gnoseTierBuffs: Record<1 | 2 | 3 | 4, { buffText: string; buffType: BuffType; buffVal: number }> = {
      1: {
        buffText: 'Autoclicker: 1 clique na Esfera por segundo, contando para as conquistas de cliques',
        buffType: 'sphere_autoclick',
        buffVal: 1,
      },
      2: {
        buffText: '+0,5 clique/s no Autoclicker da Esfera',
        buffType: 'sphere_autoclick',
        buffVal: 0.5,
      },
      3: {
        buffText: '+0,5 clique/s no Autoclicker da Esfera',
        buffType: 'sphere_autoclick',
        buffVal: 0.5,
      },
      4: {
        buffText: '+10% de Fé global (clique e passiva)',
        buffType: 'global_mult',
        buffVal: 0.1,
      },
    };
    const tierBuff = gnoseTierBuffs[tier];
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
      buffText: tierBuff.buffText,
      buffType: tierBuff.buffType,
      buffVal: tierBuff.buffVal,
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
  ...GNOSE_BOSSES.map((boss, index): Achievement => {
    const guardianBuffVals = [0.03, 0.04, 0.05, 0.08] as const;
    const buffVal = guardianBuffVals[index] ?? 0.05;
    const pct = Math.round(buffVal * 100);
    return {
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
      buffText: `+${pct}% de Fé global (clique e passiva)`,
      buffType: 'global_mult',
      buffVal,
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
    };
  }),

  // --- Maximum Curse Boss Milestones (Hades, Odin, Caos Primordial, Demiurgo) ---
  ...([
    {
      id: 'ach_curse_cronos',
      bossId: 'boss_cronos',
      bossName: 'Hades',
      name: 'Inquebrável no Tártaro',
      desc: `Subjugue Hades sob a Maldição máxima (${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS} acúmulos).`,
      lore: 'Mesmo sob cinco selos de condenação e grilhões letais, a Esfera atravessou o submundo sem trincar.',
      buffText: '+2% de chance de crítico de Fé',
      buffType: 'critical_chance' as BuffType,
      buffVal: 0.02,
    },
    {
      id: 'ach_curse_odin',
      bossId: 'boss_odin',
      bossName: 'Odin',
      name: 'Olho Além do Presságio',
      desc: `Subjugue Odin sob a Maldição máxima (${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS} acúmulos).`,
      lore: 'Nenhuma lança, runa ou corvo pôde tocar um núcleo que antecipa o próprio destino.',
      buffText: '+3% de chance de crítico de Fé',
      buffType: 'critical_chance' as BuffType,
      buffVal: 0.03,
    },
    {
      id: 'ach_curse_tiamat',
      bossId: 'boss_tiamat',
      bossName: 'Caos Primordial',
      name: 'Ordem no Abismo Absoluto',
      desc: `Subjugue Caos Primordial sob a Maldição máxima (${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS} acúmulos).`,
      lore: 'Quando um único deslize significava o esquecimento, sua geometria impôs silêncio ao abismo.',
      buffText: '-5% no custo dos fiéis',
      buffType: 'cost_discount' as BuffType,
      buffVal: 0.05,
    },
    {
      id: 'ach_curse_demiurge',
      bossId: 'boss_demiurge',
      bossName: 'Demiurgo',
      name: 'Gnosis Intocável',
      desc: `Subjugue o Demiurgo sob a Maldição máxima (${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS} acúmulos).`,
      lore: 'Entre o Sol implacável e a Lua enganosa, você venceu o falso criador sob o peso máximo da maldição.',
      buffText: '+10% de Fé global (clique e passiva)',
      buffType: 'global_mult' as BuffType,
      buffVal: 0.1,
    },
  ] as const).map((spec): Achievement => ({
    id: spec.id,
    name: spec.name,
    desc: spec.desc,
    lore: spec.lore,
    icon: '',
    unlocked: false,
    buffText: spec.buffText,
    buffType: spec.buffType,
    buffVal: spec.buffVal,
    check: (s) => s.maxCurseDefeatedBossIds?.includes(spec.bossId) ?? false,
    getProgress: (s) => {
      const defeated = s.maxCurseDefeatedBossIds?.includes(spec.bossId) ?? false;
      const stacks = s.bossCurseStacks ?? 0;
      return {
        current: defeated ? 1 : 0,
        target: 1,
        percent: defeated ? 100 : 0,
        label: defeated
          ? `1 / 1 ${spec.bossName} subjugado com Maldição ${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS}`
          : `Maldição atual: ${stacks}/${BOSS_CURSE_MAX_STACKS} · 0 / 1 vitória com ${BOSS_CURSE_MAX_STACKS}/${BOSS_CURSE_MAX_STACKS}`,
      };
    },
  })),
];
